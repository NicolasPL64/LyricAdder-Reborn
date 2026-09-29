# lyricadder-reborn

Personal project I started back in Oct 2024 to learn frontend. Based on the original DarkAngel2096's [LyricAdder](https://github.com/DarkAngel2096/lyricAdder).

## New features

+ Options to change the font size and line height
+ Built-in hyphenator supporting English, Spanish, French, German, Italian and Portuguese
+ Toolbar and keyboard shortcuts for adding bold, italics, and other markers
+ Quick auto-updater
+ Multiplatform support (Windows, Linux and Mac)
+ Color picker

## Future plans

+ Add user-option to auto-convert every type of apostrophe into the same custom character
+ Lyrics preview

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
