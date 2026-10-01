import { vi, type Mock } from "vitest"

// Shared mock of @tauri-apps/plugin-fs used by the global setup file and the
// specs that need to assert or reconfigure fs calls. `watch` is included so
// createFileWatcher resolves instead of silently failing inside its try/catch.
export const fsMock: Record<string, Mock> = {
    mkdir: vi.fn(),
    readDir: vi.fn(),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    watch: vi.fn().mockResolvedValue(() => {}),
}
