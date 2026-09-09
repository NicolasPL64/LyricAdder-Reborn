# Changelog

## [0.2.1](https://github.com/NicolasPL64/LyricAdder-Reborn/compare/v0.2.0...v0.2.1) (2026-09-09)


### Features

* add update checking functionality with user confirmation dialog ([d156e73](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/d156e7318fc7946387a3a3d6c0df279b92a49bc8))


### Miscellaneous Chores

* remove unnecessary RELEASING.md file ([be619b8](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/be619b8a976664537902cb02e7c5c7014f37fdd5))

## [0.2.0](https://github.com/NicolasPL64/LyricAdder-Reborn/compare/v0.1.0...v0.2.0) (2026-09-08)


### Features

* implement event priority handling and update tests for lyric assignment ([1d87d40](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/1d87d4080948265b0fc99f1f7e3bf3910bdc532d))


### Bug Fixes

* migrate from PrimeVue to OpenVue for component and directive imports ([e57f011](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/e57f0116d683f9b4484be0fd4ccf4ab34eec42e7))
* remove PrimeVue overrides in package.json after migrating to OpenVue ([34f97ff](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/34f97ff3c330eaa4339faeec518b8baee0e5cdb3))
* update apostrophe handling and separator character in lyrics extraction ([c81ee15](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/c81ee1555982045e55779387a0cb35bcd8d9d503))
* update event priority order to include 'lyric', 'Default', and 'phrase_end' ([4530b0e](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/4530b0e9920f340aab532294f48118192f578b7b))

## [0.1.0](https://github.com/NicolasPL64/LyricAdder-Reborn/compare/lyricadder-reborn-v0.0.7...lyricadder-reborn-v0.1.0) (2026-09-07)


### Features

* add CI and release workflows with configuration for Tauri app ([e004781](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/e004781500d5c29e9ef1616a06be10049f860038))
* add unit tests for LyricsInputView and refactor chart helper functions ([cbc914f](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/cbc914f3e15417cd2d0283b243fe76e0a5a55b62))
* implement event serialization and update file watcher functionality ([10c0f12](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/10c0f12a7bbfae694b01480538db608dd4f9e271))


### Bug Fixes

* enhance save button tooltip and improve error message formatting ([81f68a0](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/81f68a00eacf8191bafe0337d7305251bbd56c88))
* error lines highlighting ([2a38104](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/2a3810458115833a4b0744fbe012309e2540208b))
* improve section handling in extractLyrics function to correctly manage pending sections and enhance lyric extraction ([eb45530](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/eb45530924d6f934a00d93b530e5a5b62e707c79))
* resolve CI failures (typescript 5.9 and eslint flat config) ([f73a33c](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/f73a33cec40faf9f29414a5fb4abb4dc21b26fc9))
* update chart lyrics extraction to correctly handle multiple phrases ([a300d17](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/a300d17154d7137b75a083977efd2084ccd3760a))
* update release workflow to use correct action and add permissions for issues ([3ebc8e8](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/3ebc8e8886d10a7f0b9e5d602eba996b771ba382))
