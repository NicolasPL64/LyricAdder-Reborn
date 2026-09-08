import { check } from "@tauri-apps/plugin-updater"
import { ask } from "@tauri-apps/plugin-dialog"
import { relaunch } from "@tauri-apps/plugin-process"

export async function checkForUpdates() {
    try {
        const update = await check()
        if (!update) {
            console.info("No updates available")
            return
        }

        const confirmed = await ask(
            `A new version is available: ${update.version}. Do you want to download and install it now?`,
            {
                title: "Update available",
                kind: "info",
                okLabel: "Update",
                cancelLabel: "Not now",
            }
        )
        if (!confirmed) {
            return
        }

        await update.downloadAndInstall((event) => {
            switch (event.event) {
                case "Started":
                    console.info(
                        `Downloading update (${event.data.contentLength ?? "unknown size"} bytes)`
                    )
                    break
                case "Progress":
                    console.info(`Downloading... (${event.data.chunkLength} bytes received)`)
                    break
                case "Finished":
                    console.info("Download finished")
                    break
            }
        })

        console.info("Update installed. Restarting the application...")
        await relaunch()
    } catch (error) {
        console.error("Error while checking for updates:", error)
    }
}
