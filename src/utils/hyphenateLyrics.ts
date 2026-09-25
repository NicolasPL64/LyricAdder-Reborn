import { protectMarkupTags } from "./lyricsMarkup"

export interface HyphenLanguage {
    value: string
    label: string
    short: string
}

// The `short` code is the ISO 639-1 language code that `hyphen` uses as its
// module name (`hyphen/en`, `hyphen/es`, ...). `hyphen` does not expose it at
// runtime, so it is mapped here.
export const hyphenLanguages: HyphenLanguage[] = [
    { value: "en", label: "English", short: "EN" },
    { value: "es", label: "Spanish", short: "ES" },
    { value: "fr", label: "French", short: "FR" },
    { value: "de", label: "German", short: "DE" },
    { value: "it", label: "Italian", short: "IT" },
    { value: "pt", label: "Portuguese", short: "PT" },
]

type HyphenateFn = (
    text: string,
    options?: { hyphenChar?: string; minWordLength?: number }
) => Promise<string>

const loaders: Record<string, () => Promise<{ hyphenate: HyphenateFn }>> = {
    en: () => import("hyphen/en"),
    es: () => import("hyphen/es"),
    fr: () => import("hyphen/fr"),
    de: () => import("hyphen/de"),
    it: () => import("hyphen/it"),
    pt: () => import("hyphen/pt"),
}

/**
 * Hyphenates a piece of lyrics text into syllables.
 *
 * Existing hyphens are converted to equals first, so they become "tied"
 * syllable separators instead of new-note separators. Markup tags are
 * protected so the `-` in their attributes (e.g. `<cspace=-1px>`) is never
 * touched, and the hyphenation engine skips them entirely.
 */
export async function hyphenateLyrics(text: string, code: string): Promise<string> {
    const withoutHyphens = protectMarkupTags(text, (protectedText) =>
        protectedText.replace(/-/g, "=")
    )
    const loader = loaders[code]
    if (!loader) return withoutHyphens
    const { hyphenate } = await loader()
    return hyphenate(withoutHyphens, { hyphenChar: "-", minWordLength: 2 })
}
