import { marked } from "marked"
import rawChangelog from "../../CHANGELOG.md?raw"

export const changelogHtml = marked.parse(rawChangelog, { async: false })
