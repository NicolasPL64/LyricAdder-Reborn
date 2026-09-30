# lyricadder-reborn

Personal project I started back in Oct 2024 to learn frontend. Based on the original DarkAngel2096's [LyricAdder](https://github.com/DarkAngel2096/lyricAdder).

## New features

+ Options to change the font size and line height
+ Built-in hyphenator supporting English, Spanish, French, German, Italian and Portuguese
+ Toolbar and keyboard shortcuts for bold, italics, underline, strikethrough and colored text
+ Rich text (WYSIWYG-like) editing mode
+ Color picker with alpha channel support and color bookmarks
+ Better chart errors messages
+ Automatic backups of your lyrics and chart, with a restore prompt
+ File watcher that re-reads the chart when it changes on disk
+ Quick auto-updater
+ Multiplatform support (Windows, Linux and Mac)

## Backups

Lyrics and chart backups are stored in the app's local data directory, under a
folder named after a hash of the chart's absolute path:

| OS | Backup directory |
| --- | --- |
| Windows | `%LOCALAPPDATA%\com.nicolaspl.lyricadder-reborn.app\backups\<chart-hash>\` |
| macOS | `~/Library/Application Support/com.nicolaspl.lyricadder-reborn.app/backups/<chart-hash>/` |
| Linux | `~/.local/share/com.nicolaspl.lyricadder-reborn.app/backups/<chart-hash>/` |

Each folder contains `<timestamp>.lyrics.txt` files (unsaved lyrics text) and
`<timestamp>.chart` snapshots (taken right before each save). Up to 5 backups
per kind are kept, and chart snapshots older than 7 days are pruned.

## Future plans

+ Add user-option to auto-convert every type of apostrophe into the same custom character
+ Lyrics preview
+ More themes!

## Project Setup

```sh
pnpm i
```

### Compile and Hot-Reload for Development

```sh
pnpm tauri dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm tauri build
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

### Format with [Prettier](https://prettier.io/)

```sh
pnpm format
```

## Testing

The test suite is split by feedback speed and integration level:

```sh
# Unit tests for chart parsing and lyric calculations
pnpm test:unit

# Browser smoke tests for routing and the main UI shell
pnpm test:e2e

# Run every automated test
pnpm test:all

# Keep unit tests running while editing
pnpm test:watch
```
