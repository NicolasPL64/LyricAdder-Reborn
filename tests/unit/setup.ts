import { vi } from "vitest"

import { fsMock } from "./helpers/tauriMocks"

vi.mock("@tauri-apps/plugin-dialog", () => ({
    open: vi.fn(),
    ask: vi.fn().mockResolvedValue(false),
}))

vi.mock("@tauri-apps/api/path", () => ({
    appLocalDataDir: vi.fn().mockResolvedValue("/mock/appdata"),
    join: vi.fn((...parts: string[]) => parts.join("/")),
}))

vi.mock("@tauri-apps/plugin-fs", () => fsMock)
