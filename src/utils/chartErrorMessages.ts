export const chartErrorMessages = {
    CONSECUTIVE_PHRASE_START: "Two phrase_start events with no lyric events between them.",
    MISSING_CLOSING_PHRASE_END: "The last phrase is missing its closing phrase_end.",
    PHRASE_END_WITHOUT_OPEN_PHRASE: "phrase_end with no open phrase.",
    PHRASE_END_WITHOUT_LYRICS: "phrase_end with no lyric events since the last phrase_start.",
    LYRIC_WITHOUT_PHRASE_START: "Lyric event without a preceding phrase_start.",
} as const
