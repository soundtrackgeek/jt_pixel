import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectDocument } from "../editor/project";
import { parseProjectDocument, parseRecoverySnapshot } from "../editor/projectFile";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  isTauri: vi.fn(),
  mkdir: vi.fn(),
  open: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ isTauri: mocks.isTauri }));
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("C:\\AppData\\com.jtill.jtpixel"),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.open,
  save: mocks.save,
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppData: 17 },
  exists: mocks.exists,
  mkdir: mocks.mkdir,
  readTextFile: mocks.readTextFile,
  remove: mocks.remove,
  writeTextFile: mocks.writeTextFile,
}));

import {
  clearRecoverySnapshot,
  openProjectFromDialog,
  readRecoverySnapshot,
  writeProjectToPath,
  writeRecoverySnapshot,
} from "./projectStorage";

describe("project storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
    mocks.exists.mockResolvedValue(false);
  });

  it("writes a named, validated .jtp file to the selected path", async () => {
    const document = createProjectDocument("2026-07-20T10:00:00.000Z");
    const saved = await writeProjectToPath(
      document,
      "C:\\Sprites\\courier-final",
      "frame-4",
    );

    expect(saved.path).toBe("C:\\Sprites\\courier-final.jtp");
    expect(saved.document.name).toBe("courier-final.jtp");
    expect(mocks.writeTextFile).toHaveBeenCalledOnce();
    const [path, contents] = mocks.writeTextFile.mock.calls[0];
    expect(path).toBe(saved.path);
    expect(parseProjectDocument(contents)).toMatchObject({
      name: "courier-final.jtp",
      workspace: { activeFrameId: "frame-4" },
    });
  });

  it("opens a selected project only after parsing its document", async () => {
    const document = createProjectDocument("2026-07-20T10:00:00.000Z");
    mocks.open.mockResolvedValue("C:\\Sprites\\renamed-project.jtp");
    mocks.readTextFile.mockResolvedValue(JSON.stringify(document));

    const opened = await openProjectFromDialog();

    expect(opened?.path).toBe("C:\\Sprites\\renamed-project.jtp");
    expect(opened?.document.name).toBe("renamed-project.jtp");
    expect(mocks.readTextFile).toHaveBeenCalledWith(opened?.path);
  });

  it("round-trips recovery through the scoped app-data file", async () => {
    const document = createProjectDocument("2026-07-20T10:00:00.000Z");
    await writeRecoverySnapshot(document, "frame-4");

    expect(mocks.mkdir).toHaveBeenCalledWith(
      "C:\\AppData\\com.jtill.jtpixel",
      { recursive: true },
    );
    const [, serialized, writeOptions] = mocks.writeTextFile.mock.calls[0];
    expect(writeOptions).toEqual({ baseDir: 17 });
    expect(parseRecoverySnapshot(serialized).document).toEqual({
      ...document,
      workspace: { ...document.workspace, activeFrameId: "frame-4" },
    });
    expect(mocks.mkdir.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.writeTextFile.mock.invocationCallOrder[0],
    );

    mocks.exists.mockResolvedValue(true);
    mocks.readTextFile.mockResolvedValue(serialized);
    await expect(readRecoverySnapshot()).resolves.toMatchObject({
      document: {
        ...document,
        workspace: { ...document.workspace, activeFrameId: "frame-4" },
      },
    });
  });

  it("removes recovery only when the scoped file exists", async () => {
    await clearRecoverySnapshot();
    expect(mocks.remove).not.toHaveBeenCalled();

    mocks.exists.mockResolvedValue(true);
    await clearRecoverySnapshot();
    expect(mocks.remove).toHaveBeenCalledWith("project-recovery-v1.json", {
      baseDir: 17,
    });
  });
});
