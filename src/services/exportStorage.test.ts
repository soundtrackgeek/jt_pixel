import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
  revealItemInDir: vi.fn(),
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
vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: mocks.revealItemInDir,
}));

import { revealSavedExport, saveExportArtifacts } from "./exportStorage";

describe("export storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
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
      createMetadata,
    );

    expect(mocks.invoke).toHaveBeenCalledWith("choose_export_paths", {
      defaultName: "project-sheet.png",
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
    mocks.invoke.mockResolvedValue(null);

    await expect(saveExportArtifacts(
      "frame.png",
      new Uint8Array([1]),
      null,
    )).resolves.toBeNull();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("reveals the saved image through the desktop file manager", async () => {
    await revealSavedExport("C:\\Sprites\\frame.png");
    expect(mocks.revealItemInDir).toHaveBeenCalledWith("C:\\Sprites\\frame.png");
  });
});
