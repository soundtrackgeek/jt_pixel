import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
  revealItemInDir: vi.fn(),
  save: vi.fn(),
  writeFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
  isTauri: mocks.isTauri,
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: mocks.writeFile,
  writeTextFile: mocks.writeTextFile,
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: mocks.save,
}));
vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: mocks.revealItemInDir,
}));

import { revealSavedExport, saveExportArtifacts } from "./exportStorage";

describe("export storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
    mocks.save.mockResolvedValue("C:\\Sprites\\renamed-sheet.png");
    mocks.invoke.mockResolvedValue({
      imagePath: "C:\\Sprites\\renamed-sheet.png",
      metadataPath: "C:\\Sprites\\renamed-sheet.json",
    });
  });

  it("writes PNG bytes and metadata named for the path chosen by the user", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const createMetadata = vi.fn((imageName: string) => JSON.stringify({
      image: imageName,
    }));

    const saved = await saveExportArtifacts(
      "project-sheet.png",
      pngBytes,
      "png",
      createMetadata,
    );

    expect(mocks.save).toHaveBeenCalledWith({
      title: "Export JT Pixel artwork",
      defaultPath: "project-sheet.png",
      filters: [{ name: "PNG image", extensions: ["png"] }],
    });
    expect(mocks.invoke).toHaveBeenCalledWith("prepare_export_paths", {
      format: "png",
      imagePath: "C:\\Sprites\\renamed-sheet.png",
      includeMetadata: true,
    });
    expect(createMetadata).toHaveBeenCalledWith("renamed-sheet.png");
    expect(mocks.writeFile).toHaveBeenCalledWith(
      "C:\\Sprites\\renamed-sheet.png",
      pngBytes,
    );
    expect(mocks.writeTextFile).toHaveBeenCalledWith(
      "C:\\Sprites\\renamed-sheet.json",
      '{"image":"renamed-sheet.png"}',
    );
    expect(saved).toEqual({
      fileName: "renamed-sheet.png",
      imagePath: "C:\\Sprites\\renamed-sheet.png",
      metadataWritten: true,
    });
  });

  it("treats a cancelled native save dialog as a clean cancellation", async () => {
    mocks.save.mockResolvedValue(null);

    await expect(saveExportArtifacts(
      "frame.png",
      new Uint8Array([1]),
      "png",
      null,
    )).resolves.toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("lets the native path preparation normalize a missing PNG extension", async () => {
    mocks.save.mockResolvedValue("C:\\Sprites\\frame");
    mocks.invoke.mockResolvedValue({
      imagePath: "C:\\Sprites\\frame.png",
      metadataPath: null,
    });

    await saveExportArtifacts("frame", new Uint8Array([1]), "png", null);

    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: "frame.png",
    }));
    expect(mocks.invoke).toHaveBeenCalledWith("prepare_export_paths", {
      format: "png",
      imagePath: "C:\\Sprites\\frame",
      includeMetadata: false,
    });
  });

  it("uses the animated GIF filter and native format preparation", async () => {
    mocks.save.mockResolvedValue("C:\\Sprites\\walk.gif");
    mocks.invoke.mockResolvedValue({
      imagePath: "C:\\Sprites\\walk.gif",
      metadataPath: null,
    });
    const bytes = new Uint8Array([71, 73, 70]);

    await saveExportArtifacts("walk-animation.gif", bytes, "gif", null);

    expect(mocks.save).toHaveBeenCalledWith({
      title: "Export JT Pixel artwork",
      defaultPath: "walk-animation.gif",
      filters: [{ name: "Animated GIF", extensions: ["gif"] }],
    });
    expect(mocks.invoke).toHaveBeenCalledWith("prepare_export_paths", {
      format: "gif",
      imagePath: "C:\\Sprites\\walk.gif",
      includeMetadata: false,
    });
    expect(mocks.writeFile).toHaveBeenCalledWith("C:\\Sprites\\walk.gif", bytes);
  });

  it("reveals the saved image through the desktop file manager", async () => {
    await revealSavedExport("C:\\Sprites\\frame.png");
    expect(mocks.revealItemInDir).toHaveBeenCalledWith("C:\\Sprites\\frame.png");
  });
});
