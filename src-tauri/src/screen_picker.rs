use std::{
    ffi::c_void,
    mem::size_of,
    ptr::{null, null_mut},
    sync::atomic::{AtomicBool, AtomicI32, Ordering},
    thread,
    time::Duration,
};

use windows_sys::Win32::{
    Foundation::{COLORREF, HINSTANCE, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
    Graphics::Gdi::{
        BI_RGB, BITMAPINFO, BITMAPINFOHEADER, BitBlt, CAPTUREBLT, CLEARTYPE_QUALITY, CreateBitmap,
        CreateCompatibleBitmap, CreateCompatibleDC, CreateFontW, DC_BRUSH, DEFAULT_CHARSET,
        DIB_RGB_COLORS, DeleteDC, DeleteObject, FF_MODERN, FW_BOLD, FW_NORMAL, FillRect, FrameRect,
        GetDC, GetDIBits, GetMonitorInfoW, GetStockObject, MONITOR_DEFAULTTONEAREST, MONITORINFO,
        MonitorFromPoint, ReleaseDC, SRCCOPY, SelectObject, SetBkMode, SetDCBrushColor,
        SetTextColor, TRANSPARENT, TextOutW, UpdateWindow,
    },
    System::LibraryLoader::GetModuleHandleW,
    UI::{
        Input::KeyboardAndMouse::{ReleaseCapture, SetCapture, SetFocus, VK_ESCAPE},
        WindowsAndMessaging::{
            CreateIconIndirect, CreateWindowExW, DefWindowProcW, DestroyIcon, DestroyWindow,
            DispatchMessageW, GetCursorPos, GetSystemMetrics, HWND_TOPMOST, ICONINFO, LWA_ALPHA,
            MSG, PM_REMOVE, PeekMessageW, RegisterClassW, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
            SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SW_SHOW, SWP_NOACTIVATE, SWP_SHOWWINDOW,
            SetCursor, SetForegroundWindow, SetLayeredWindowAttributes, SetWindowPos, ShowWindow,
            TranslateMessage, UnregisterClassW, WM_CLOSE, WM_KEYDOWN, WM_LBUTTONDOWN,
            WM_RBUTTONDOWN, WNDCLASSW, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
            WS_EX_TOPMOST, WS_POPUP,
        },
    },
};

const GRID_RADIUS: i32 = 4;
const CELL_SIZE: i32 = 12;
const LENS_WIDTH: i32 = 196;
const LENS_HEIGHT: i32 = 194;
const LENS_GAP: i32 = 26;
const LENS_MARGIN: i32 = 8;

const ACTION_NONE: i32 = 0;
const ACTION_FOREGROUND: i32 = 1;
const ACTION_BACKGROUND: i32 = 2;
const ACTION_CANCEL: i32 = -1;

static PICKER_ACTIVE: AtomicBool = AtomicBool::new(false);
static PICKER_ACTION: AtomicI32 = AtomicI32::new(ACTION_NONE);
static PICK_X: AtomicI32 = AtomicI32::new(i32::MIN);
static PICK_Y: AtomicI32 = AtomicI32::new(i32::MIN);

pub struct PickedColor {
    pub color: String,
    pub role: &'static str,
    pub x: i32,
    pub y: i32,
}

#[derive(Clone)]
struct DesktopCapture {
    left: i32,
    top: i32,
    width: i32,
    height: i32,
    pixels: Vec<u8>,
}

impl DesktopCapture {
    fn color_at(&self, x: i32, y: i32) -> Option<[u8; 3]> {
        let local_x = x.checked_sub(self.left)?;
        let local_y = y.checked_sub(self.top)?;
        if local_x < 0 || local_y < 0 || local_x >= self.width || local_y >= self.height {
            return None;
        }
        let pixel_index = (local_y as usize)
            .checked_mul(self.width as usize)?
            .checked_add(local_x as usize)?
            .checked_mul(4)?;
        let blue = *self.pixels.get(pixel_index)?;
        let green = *self.pixels.get(pixel_index + 1)?;
        let red = *self.pixels.get(pixel_index + 2)?;
        Some([red, green, blue])
    }
}

struct ActivePickerGuard;

impl ActivePickerGuard {
    fn acquire() -> Result<Self, String> {
        PICKER_ACTIVE
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| "A screen picker session is already active.".to_string())?;
        PICKER_ACTION.store(ACTION_NONE, Ordering::Release);
        PICK_X.store(i32::MIN, Ordering::Release);
        PICK_Y.store(i32::MIN, Ordering::Release);
        Ok(Self)
    }
}

impl Drop for ActivePickerGuard {
    fn drop(&mut self) {
        PICKER_ACTION.store(ACTION_NONE, Ordering::Release);
        PICK_X.store(i32::MIN, Ordering::Release);
        PICK_Y.store(i32::MIN, Ordering::Release);
        PICKER_ACTIVE.store(false, Ordering::Release);
    }
}

struct PickerWindows {
    overlay: HWND,
    lens: HWND,
    instance: HINSTANCE,
    overlay_class: Vec<u16>,
    lens_class: Vec<u16>,
    cursor: *mut c_void,
    cursor_owned: bool,
    regular_font: *mut c_void,
    bold_font: *mut c_void,
}

impl Drop for PickerWindows {
    fn drop(&mut self) {
        unsafe {
            ReleaseCapture();
            if !self.lens.is_null() {
                DestroyWindow(self.lens);
            }
            if !self.overlay.is_null() {
                DestroyWindow(self.overlay);
            }
            if self.cursor_owned && !self.cursor.is_null() {
                DestroyIcon(self.cursor);
            }
            if !self.regular_font.is_null() {
                DeleteObject(self.regular_font);
            }
            if !self.bold_font.is_null() {
                DeleteObject(self.bold_font);
            }
            UnregisterClassW(self.lens_class.as_ptr(), self.instance);
            UnregisterClassW(self.overlay_class.as_ptr(), self.instance);
        }
    }
}

unsafe extern "system" fn overlay_window_proc(
    window: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match message {
        WM_LBUTTONDOWN => {
            record_pick(ACTION_FOREGROUND);
            0
        }
        WM_RBUTTONDOWN => {
            record_pick(ACTION_BACKGROUND);
            0
        }
        WM_KEYDOWN if wparam as u16 == VK_ESCAPE => {
            PICKER_ACTION.store(ACTION_CANCEL, Ordering::Release);
            0
        }
        WM_CLOSE => {
            PICKER_ACTION.store(ACTION_CANCEL, Ordering::Release);
            0
        }
        _ => unsafe { DefWindowProcW(window, message, wparam, lparam) },
    }
}

fn record_pick(action: i32) {
    let mut cursor = POINT::default();
    if unsafe { GetCursorPos(&mut cursor) } != 0 {
        PICK_X.store(cursor.x, Ordering::Release);
        PICK_Y.store(cursor.y, Ordering::Release);
    }
    PICKER_ACTION.store(action, Ordering::Release);
}

unsafe extern "system" fn lens_window_proc(
    window: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe { DefWindowProcW(window, message, wparam, lparam) }
}

pub fn pick_screen_color() -> Result<Option<PickedColor>, String> {
    let _active_guard = ActivePickerGuard::acquire()?;
    thread::sleep(Duration::from_millis(180));
    let capture = capture_virtual_desktop()?;
    let windows = create_picker_windows(&capture)?;

    let mut cursor = POINT::default();
    unsafe {
        ShowWindow(windows.overlay, SW_SHOW);
        UpdateWindow(windows.overlay);
        SetForegroundWindow(windows.overlay);
        SetFocus(windows.overlay);
        SetCapture(windows.overlay);
        SetCursor(windows.cursor);
    }

    loop {
        pump_messages();
        let action = PICKER_ACTION.load(Ordering::Acquire);
        if action == ACTION_CANCEL {
            return Ok(None);
        }

        if action == ACTION_FOREGROUND || action == ACTION_BACKGROUND {
            cursor.x = PICK_X.load(Ordering::Acquire);
            cursor.y = PICK_Y.load(Ordering::Acquire);
            if cursor.x == i32::MIN || cursor.y == i32::MIN {
                return Err("The screen picker click position could not be read.".to_string());
            }
        } else if unsafe { GetCursorPos(&mut cursor) } == 0 {
            return Err(last_windows_error("The cursor position could not be read"));
        }
        let color = capture.color_at(cursor.x, cursor.y);
        if let Some(color) = color {
            position_and_draw_lens(&windows, &capture, cursor, color)?;
        }
        unsafe {
            SetCursor(windows.cursor);
        }

        if (action == ACTION_FOREGROUND || action == ACTION_BACKGROUND)
            && let Some([red, green, blue]) = color
        {
            return Ok(Some(PickedColor {
                color: format!("#{red:02x}{green:02x}{blue:02x}"),
                role: if action == ACTION_BACKGROUND {
                    "background"
                } else {
                    "foreground"
                },
                x: cursor.x,
                y: cursor.y,
            }));
        }

        thread::sleep(Duration::from_millis(16));
    }
}

fn pump_messages() {
    let mut message = MSG::default();
    unsafe {
        while PeekMessageW(&mut message, null_mut(), 0, 0, PM_REMOVE) != 0 {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }
}

fn capture_virtual_desktop() -> Result<DesktopCapture, String> {
    let left = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
    let top = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
    let width = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
    let height = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };
    if width <= 0 || height <= 0 {
        return Err("Windows did not report a usable desktop capture area.".to_string());
    }
    let pixel_bytes = (width as usize)
        .checked_mul(height as usize)
        .and_then(|count| count.checked_mul(4))
        .ok_or_else(|| "The virtual desktop is too large to capture safely.".to_string())?;
    let mut pixels = Vec::new();
    pixels
        .try_reserve_exact(pixel_bytes)
        .map_err(|_| "There is not enough memory to capture the virtual desktop.".to_string())?;
    pixels.resize(pixel_bytes, 0);

    unsafe {
        let screen_dc = GetDC(null_mut());
        if screen_dc.is_null() {
            return Err(last_windows_error("The desktop could not be accessed"));
        }
        let memory_dc = CreateCompatibleDC(screen_dc);
        if memory_dc.is_null() {
            ReleaseDC(null_mut(), screen_dc);
            return Err(last_windows_error(
                "A desktop capture buffer could not be created",
            ));
        }
        let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
        if bitmap.is_null() {
            DeleteDC(memory_dc);
            ReleaseDC(null_mut(), screen_dc);
            return Err(last_windows_error(
                "The desktop bitmap could not be created",
            ));
        }
        let previous = SelectObject(memory_dc, bitmap);
        let copied = BitBlt(
            memory_dc,
            0,
            0,
            width,
            height,
            screen_dc,
            left,
            top,
            SRCCOPY | CAPTUREBLT,
        );
        let mut bitmap_info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                ..BITMAPINFOHEADER::default()
            },
            ..BITMAPINFO::default()
        };
        let scan_lines = if copied != 0 {
            GetDIBits(
                memory_dc,
                bitmap,
                0,
                height as u32,
                pixels.as_mut_ptr().cast(),
                &mut bitmap_info,
                DIB_RGB_COLORS,
            )
        } else {
            0
        };
        SelectObject(memory_dc, previous);
        DeleteObject(bitmap);
        DeleteDC(memory_dc);
        ReleaseDC(null_mut(), screen_dc);

        if copied == 0 || scan_lines != height {
            return Err(last_windows_error(
                "The virtual desktop could not be captured",
            ));
        }
    }

    Ok(DesktopCapture {
        left,
        top,
        width,
        height,
        pixels,
    })
}

fn create_picker_windows(capture: &DesktopCapture) -> Result<PickerWindows, String> {
    let instance = unsafe { GetModuleHandleW(null()) };
    if instance.is_null() {
        return Err(last_windows_error(
            "The JT Pixel application handle could not be read",
        ));
    }
    let overlay_class = wide_null("JT_PIXEL_SCREEN_PICKER_OVERLAY");
    let lens_class = wide_null("JT_PIXEL_SCREEN_PICKER_LENS");
    let (cursor, cursor_owned) = create_pipette_cursor()?;

    let overlay_definition = WNDCLASSW {
        lpfnWndProc: Some(overlay_window_proc),
        hInstance: instance,
        hCursor: cursor,
        lpszClassName: overlay_class.as_ptr(),
        ..WNDCLASSW::default()
    };
    if unsafe { RegisterClassW(&overlay_definition) } == 0 {
        if cursor_owned {
            unsafe { DestroyIcon(cursor) };
        }
        return Err(last_windows_error(
            "The screen picker overlay could not be registered",
        ));
    }

    let lens_definition = WNDCLASSW {
        lpfnWndProc: Some(lens_window_proc),
        hInstance: instance,
        lpszClassName: lens_class.as_ptr(),
        ..WNDCLASSW::default()
    };
    if unsafe { RegisterClassW(&lens_definition) } == 0 {
        unsafe {
            UnregisterClassW(overlay_class.as_ptr(), instance);
            if cursor_owned {
                DestroyIcon(cursor);
            }
        }
        return Err(last_windows_error(
            "The screen picker lens could not be registered",
        ));
    }

    let overlay = unsafe {
        CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED,
            overlay_class.as_ptr(),
            wide_null("JT Pixel Screen Picker").as_ptr(),
            WS_POPUP,
            capture.left,
            capture.top,
            capture.width,
            capture.height,
            null_mut(),
            null_mut(),
            instance,
            null(),
        )
    };
    if overlay.is_null() {
        cleanup_registered_classes(instance, &overlay_class, &lens_class, cursor, cursor_owned);
        return Err(last_windows_error(
            "The screen picker overlay could not be opened",
        ));
    }
    if unsafe { SetLayeredWindowAttributes(overlay, 0, 1, LWA_ALPHA) } == 0 {
        unsafe { DestroyWindow(overlay) };
        cleanup_registered_classes(instance, &overlay_class, &lens_class, cursor, cursor_owned);
        return Err(last_windows_error(
            "The screen picker overlay could not become transparent",
        ));
    }

    let lens = unsafe {
        CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
            lens_class.as_ptr(),
            wide_null("JT Pixel Lens").as_ptr(),
            WS_POPUP,
            0,
            0,
            LENS_WIDTH,
            LENS_HEIGHT,
            null_mut(),
            null_mut(),
            instance,
            null(),
        )
    };
    if lens.is_null() {
        unsafe { DestroyWindow(overlay) };
        cleanup_registered_classes(instance, &overlay_class, &lens_class, cursor, cursor_owned);
        return Err(last_windows_error(
            "The screen picker lens could not be opened",
        ));
    }

    let regular_font = create_lens_font(FW_NORMAL as i32, -11);
    let bold_font = create_lens_font(FW_BOLD as i32, -12);
    if regular_font.is_null() || bold_font.is_null() {
        unsafe {
            if !regular_font.is_null() {
                DeleteObject(regular_font);
            }
            if !bold_font.is_null() {
                DeleteObject(bold_font);
            }
            DestroyWindow(lens);
            DestroyWindow(overlay);
        }
        cleanup_registered_classes(instance, &overlay_class, &lens_class, cursor, cursor_owned);
        return Err(last_windows_error(
            "The screen picker typeface could not be prepared",
        ));
    }

    Ok(PickerWindows {
        overlay,
        lens,
        instance,
        overlay_class,
        lens_class,
        cursor,
        cursor_owned,
        regular_font,
        bold_font,
    })
}

fn cleanup_registered_classes(
    instance: HINSTANCE,
    overlay_class: &[u16],
    lens_class: &[u16],
    cursor: *mut c_void,
    cursor_owned: bool,
) {
    unsafe {
        UnregisterClassW(lens_class.as_ptr(), instance);
        UnregisterClassW(overlay_class.as_ptr(), instance);
        if cursor_owned && !cursor.is_null() {
            DestroyIcon(cursor);
        }
    }
}

fn create_lens_font(weight: i32, height: i32) -> *mut c_void {
    let face = wide_null("Cascadia Mono");
    unsafe {
        CreateFontW(
            height,
            0,
            0,
            0,
            weight,
            0,
            0,
            0,
            DEFAULT_CHARSET as u32,
            0,
            0,
            CLEARTYPE_QUALITY as u32,
            FF_MODERN as u32,
            face.as_ptr(),
        )
    }
}

fn create_pipette_cursor() -> Result<(*mut c_void, bool), String> {
    const CURSOR_SIZE: usize = 32;
    let mut pixels = vec![0u8; CURSOR_SIZE * CURSOR_SIZE * 4];
    draw_cursor_line(&mut pixels, 6, 26, 21, 11, 5, [4, 10, 19, 255]);
    draw_cursor_line(&mut pixels, 6, 26, 21, 11, 2, [66, 200, 227, 255]);
    draw_cursor_line(&mut pixels, 18, 7, 26, 15, 7, [4, 10, 19, 255]);
    draw_cursor_line(&mut pixels, 18, 7, 26, 15, 4, [173, 98, 255, 255]);
    draw_cursor_line(&mut pixels, 19, 10, 23, 14, 1, [245, 239, 223, 255]);
    let mask = [0u8; CURSOR_SIZE * 4];

    unsafe {
        let color_bitmap = CreateBitmap(
            CURSOR_SIZE as i32,
            CURSOR_SIZE as i32,
            1,
            32,
            pixels.as_ptr().cast(),
        );
        let mask_bitmap = CreateBitmap(
            CURSOR_SIZE as i32,
            CURSOR_SIZE as i32,
            1,
            1,
            mask.as_ptr().cast(),
        );
        if color_bitmap.is_null() || mask_bitmap.is_null() {
            if !color_bitmap.is_null() {
                DeleteObject(color_bitmap);
            }
            if !mask_bitmap.is_null() {
                DeleteObject(mask_bitmap);
            }
            return Err(last_windows_error(
                "The pipette cursor could not be created",
            ));
        }
        let cursor_info = ICONINFO {
            fIcon: 0,
            xHotspot: 6,
            yHotspot: 26,
            hbmMask: mask_bitmap,
            hbmColor: color_bitmap,
        };
        let cursor = CreateIconIndirect(&cursor_info);
        DeleteObject(color_bitmap);
        DeleteObject(mask_bitmap);
        if cursor.is_null() {
            return Err(last_windows_error(
                "The pipette cursor could not be assembled",
            ));
        }
        Ok((cursor, true))
    }
}

fn draw_cursor_line(
    pixels: &mut [u8],
    start_x: i32,
    start_y: i32,
    end_x: i32,
    end_y: i32,
    thickness: i32,
    rgba: [u8; 4],
) {
    let steps = (end_x - start_x).abs().max((end_y - start_y).abs()).max(1);
    for step in 0..=steps {
        let x = start_x + ((end_x - start_x) * step / steps);
        let y = start_y + ((end_y - start_y) * step / steps);
        let radius = thickness / 2;
        for offset_y in -radius..=radius {
            for offset_x in -radius..=radius {
                if offset_x * offset_x + offset_y * offset_y > radius * radius + 1 {
                    continue;
                }
                set_cursor_pixel(pixels, x + offset_x, y + offset_y, rgba);
            }
        }
    }
}

fn set_cursor_pixel(pixels: &mut [u8], x: i32, y: i32, rgba: [u8; 4]) {
    if !(0..32).contains(&x) || !(0..32).contains(&y) {
        return;
    }
    let bitmap_y = 31 - y;
    let index = ((bitmap_y * 32 + x) * 4) as usize;
    pixels[index] = rgba[2];
    pixels[index + 1] = rgba[1];
    pixels[index + 2] = rgba[0];
    pixels[index + 3] = rgba[3];
}

fn position_and_draw_lens(
    windows: &PickerWindows,
    capture: &DesktopCapture,
    cursor: POINT,
    color: [u8; 3],
) -> Result<(), String> {
    let work_area = monitor_work_area(cursor).unwrap_or(RECT {
        left: capture.left,
        top: capture.top,
        right: capture.left + capture.width,
        bottom: capture.top + capture.height,
    });
    let (left, top) = lens_origin(cursor, work_area);
    if unsafe {
        SetWindowPos(
            windows.lens,
            HWND_TOPMOST,
            left,
            top,
            LENS_WIDTH,
            LENS_HEIGHT,
            SWP_NOACTIVATE | SWP_SHOWWINDOW,
        )
    } == 0
    {
        return Err(last_windows_error(
            "The Pixel Lens could not follow the cursor",
        ));
    }
    draw_lens(windows, capture, cursor, color)
}

fn monitor_work_area(point: POINT) -> Option<RECT> {
    unsafe {
        let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        if monitor.is_null() {
            return None;
        }
        let mut info = MONITORINFO {
            cbSize: size_of::<MONITORINFO>() as u32,
            ..MONITORINFO::default()
        };
        (GetMonitorInfoW(monitor, &mut info) != 0).then_some(info.rcWork)
    }
}

fn lens_origin(cursor: POINT, work_area: RECT) -> (i32, i32) {
    let preferred_right = cursor.x + LENS_GAP;
    let preferred_left = cursor.x - LENS_GAP - LENS_WIDTH;
    let preferred_below = cursor.y + LENS_GAP;
    let preferred_above = cursor.y - LENS_GAP - LENS_HEIGHT;
    let left = if preferred_right + LENS_WIDTH + LENS_MARGIN <= work_area.right {
        preferred_right
    } else {
        preferred_left
    };
    let top = if preferred_below + LENS_HEIGHT + LENS_MARGIN <= work_area.bottom {
        preferred_below
    } else {
        preferred_above
    };
    (
        left.clamp(
            work_area.left + LENS_MARGIN,
            (work_area.right - LENS_WIDTH - LENS_MARGIN).max(work_area.left + LENS_MARGIN),
        ),
        top.clamp(
            work_area.top + LENS_MARGIN,
            (work_area.bottom - LENS_HEIGHT - LENS_MARGIN).max(work_area.top + LENS_MARGIN),
        ),
    )
}

fn draw_lens(
    windows: &PickerWindows,
    capture: &DesktopCapture,
    cursor: POINT,
    color: [u8; 3],
) -> Result<(), String> {
    unsafe {
        let window_dc = GetDC(windows.lens);
        if window_dc.is_null() {
            return Err(last_windows_error(
                "The Pixel Lens drawing surface is unavailable",
            ));
        }
        let buffer_dc = CreateCompatibleDC(window_dc);
        let bitmap = CreateCompatibleBitmap(window_dc, LENS_WIDTH, LENS_HEIGHT);
        if buffer_dc.is_null() || bitmap.is_null() {
            if !bitmap.is_null() {
                DeleteObject(bitmap);
            }
            if !buffer_dc.is_null() {
                DeleteDC(buffer_dc);
            }
            ReleaseDC(windows.lens, window_dc);
            return Err(last_windows_error(
                "The Pixel Lens frame could not be prepared",
            ));
        }
        let previous_bitmap = SelectObject(buffer_dc, bitmap);
        let stock_brush = GetStockObject(DC_BRUSH);
        SelectObject(buffer_dc, stock_brush);
        SetBkMode(buffer_dc, TRANSPARENT as i32);

        fill_color(
            buffer_dc,
            RECT {
                left: 0,
                top: 0,
                right: LENS_WIDTH,
                bottom: LENS_HEIGHT,
            },
            [8, 21, 34],
        );
        fill_color(
            buffer_dc,
            RECT {
                left: 0,
                top: 0,
                right: LENS_WIDTH,
                bottom: 2,
            },
            [173, 98, 255],
        );
        frame_color(
            buffer_dc,
            RECT {
                left: 0,
                top: 0,
                right: LENS_WIDTH,
                bottom: LENS_HEIGHT,
            },
            [52, 86, 109],
        );
        text_out(
            buffer_dc,
            11,
            9,
            "SCREEN PICKER",
            [156, 183, 199],
            windows.bold_font,
        );
        text_out(
            buffer_dc,
            125,
            9,
            "DESKTOP",
            [203, 147, 255],
            windows.regular_font,
        );

        let grid_left = 11;
        let grid_top = 29;
        fill_color(
            buffer_dc,
            RECT {
                left: 7,
                top: 25,
                right: 123,
                bottom: 141,
            },
            [3, 9, 17],
        );
        frame_color(
            buffer_dc,
            RECT {
                left: 7,
                top: 25,
                right: 123,
                bottom: 141,
            },
            [41, 70, 90],
        );
        for offset_y in -GRID_RADIUS..=GRID_RADIUS {
            for offset_x in -GRID_RADIUS..=GRID_RADIUS {
                let cell_left = grid_left + (offset_x + GRID_RADIUS) * CELL_SIZE;
                let cell_top = grid_top + (offset_y + GRID_RADIUS) * CELL_SIZE;
                let rect = RECT {
                    left: cell_left,
                    top: cell_top,
                    right: cell_left + CELL_SIZE,
                    bottom: cell_top + CELL_SIZE,
                };
                let sample = capture.color_at(cursor.x + offset_x, cursor.y + offset_y);
                if let Some(sample) = sample {
                    fill_color(buffer_dc, rect, sample);
                } else {
                    fill_color(buffer_dc, rect, [3, 8, 17]);
                }
                frame_color(buffer_dc, rect, [43, 75, 94]);
            }
        }
        let center_left = grid_left + GRID_RADIUS * CELL_SIZE;
        let center_top = grid_top + GRID_RADIUS * CELL_SIZE;
        frame_color(
            buffer_dc,
            RECT {
                left: center_left - 2,
                top: center_top - 2,
                right: center_left + CELL_SIZE + 2,
                bottom: center_top + CELL_SIZE + 2,
            },
            [4, 10, 19],
        );
        frame_color(
            buffer_dc,
            RECT {
                left: center_left - 1,
                top: center_top - 1,
                right: center_left + CELL_SIZE + 1,
                bottom: center_top + CELL_SIZE + 1,
            },
            [245, 239, 223],
        );
        frame_color(
            buffer_dc,
            RECT {
                left: center_left,
                top: center_top,
                right: center_left + CELL_SIZE,
                bottom: center_top + CELL_SIZE,
            },
            [66, 200, 227],
        );

        fill_color(
            buffer_dc,
            RECT {
                left: 132,
                top: 29,
                right: 164,
                bottom: 61,
            },
            color,
        );
        frame_color(
            buffer_dc,
            RECT {
                left: 131,
                top: 28,
                right: 165,
                bottom: 62,
            },
            [220, 235, 240],
        );
        text_out(
            buffer_dc,
            130,
            70,
            &format!("#{:02X}{:02X}{:02X}", color[0], color[1], color[2]),
            [242, 248, 246],
            windows.bold_font,
        );
        text_out(
            buffer_dc,
            130,
            86,
            &format!("R {:03}", color[0]),
            [100, 128, 147],
            windows.regular_font,
        );
        text_out(
            buffer_dc,
            130,
            99,
            &format!("G {:03}", color[1]),
            [100, 128, 147],
            windows.regular_font,
        );
        text_out(
            buffer_dc,
            130,
            112,
            &format!("B {:03}", color[2]),
            [100, 128, 147],
            windows.regular_font,
        );
        text_out(
            buffer_dc,
            11,
            150,
            &format!("X {}  Y {}", cursor.x, cursor.y),
            [100, 128, 147],
            windows.regular_font,
        );
        text_out(
            buffer_dc,
            11,
            169,
            "L PICK  R BG  ESC CANCEL",
            [129, 153, 168],
            windows.regular_font,
        );

        BitBlt(
            window_dc,
            0,
            0,
            LENS_WIDTH,
            LENS_HEIGHT,
            buffer_dc,
            0,
            0,
            SRCCOPY,
        );
        SelectObject(buffer_dc, previous_bitmap);
        DeleteObject(bitmap);
        DeleteDC(buffer_dc);
        ReleaseDC(windows.lens, window_dc);
    }
    Ok(())
}

fn fill_color(device: *mut c_void, rect: RECT, color: [u8; 3]) {
    unsafe {
        let brush = GetStockObject(DC_BRUSH);
        SetDCBrushColor(device, color_ref(color));
        FillRect(device, &rect, brush);
    }
}

fn frame_color(device: *mut c_void, rect: RECT, color: [u8; 3]) {
    unsafe {
        let brush = GetStockObject(DC_BRUSH);
        SetDCBrushColor(device, color_ref(color));
        FrameRect(device, &rect, brush);
    }
}

fn text_out(device: *mut c_void, x: i32, y: i32, text: &str, color: [u8; 3], font: *mut c_void) {
    let wide: Vec<u16> = text.encode_utf16().collect();
    unsafe {
        SelectObject(device, font);
        SetTextColor(device, color_ref(color));
        TextOutW(device, x, y, wide.as_ptr(), wide.len() as i32);
    }
}

fn color_ref([red, green, blue]: [u8; 3]) -> COLORREF {
    red as u32 | ((green as u32) << 8) | ((blue as u32) << 16)
}

fn wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn last_windows_error(context: &str) -> String {
    format!("{context}: {}", std::io::Error::last_os_error())
}

#[cfg(test)]
mod tests {
    use super::{DesktopCapture, LENS_HEIGHT, LENS_WIDTH, lens_origin};
    use windows_sys::Win32::Foundation::{POINT, RECT};

    #[test]
    fn reads_bgra_pixels_using_virtual_desktop_coordinates() {
        let capture = DesktopCapture {
            left: -1,
            top: -1,
            width: 2,
            height: 2,
            pixels: vec![3, 2, 1, 0, 6, 5, 4, 0, 9, 8, 7, 0, 12, 11, 10, 0],
        };
        assert_eq!(capture.color_at(-1, -1), Some([1, 2, 3]));
        assert_eq!(capture.color_at(0, 0), Some([10, 11, 12]));
        assert_eq!(capture.color_at(1, 0), None);
    }

    #[test]
    fn flips_and_clamps_the_lens_at_monitor_edges() {
        let work = RECT {
            left: 0,
            top: 0,
            right: 1920,
            bottom: 1080,
        };
        assert_eq!(lens_origin(POINT { x: 20, y: 20 }, work), (46, 46));
        let (left, top) = lens_origin(POINT { x: 1915, y: 1075 }, work);
        assert_eq!(left, 1915 - 26 - LENS_WIDTH);
        assert_eq!(top, 1075 - 26 - LENS_HEIGHT);
    }
}
