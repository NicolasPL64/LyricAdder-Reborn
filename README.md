# lyricadder-reborn

## Future plans

+ Add user-option to auto-convert every type of apostrophe into the same custom character
+ Add auto-hypenator (pnpm add hyphen)
+ Change version in package.json
+ Color picker
+ Lyrics preview

## Features

### When opening

+ Replace spaces for §
+ Section separator (option)

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

Playwright starts Vite automatically and uses the browser version installed in the local Playwright cache. The E2E suite intentionally avoids the native Tauri file picker; that boundary should be covered separately with a manual smoke check in `pnpm tauri dev` or with Tauri-specific automation.

Recommended next tests, in priority order:

1. Load a real fixture and verify the lyrics textarea, syllable counts and highlighted invalid phrases.
2. Edit a valid phrase to an invalid count and verify that saving is disabled; correct it and verify the generated chart events.
3. Test settings persistence for theme, font size, line height and section separators.
4. Add a native Tauri smoke test for opening and saving a `.chart` file.
