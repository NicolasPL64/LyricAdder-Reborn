import { getVersion } from "@tauri-apps/api/app"
import { changelogHtml } from "@/utils/changelog"
import { getStored, setStored, storageKeys } from "@/utils/settings"

export async function getChangelogHtml(): Promise<string | null> {
    if (!import.meta.env.PROD) return null

    const currentVersion = await getVersion()
    const lastSeenVersion = getStored(storageKeys.lastSeenChangelogVersion, "")

    if (lastSeenVersion === currentVersion) return null

    setStored(storageKeys.lastSeenChangelogVersion, currentVersion)
    return changelogHtml
}
