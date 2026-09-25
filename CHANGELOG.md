# Changelog

## [0.4.0](https://github.com/NicolasPL64/LyricAdder-Reborn/compare/v0.3.0...v0.4.0) (2026-09-25)


### Features

* add hyphenation feature with language selection and integrate D… ([d75dc1d](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/d75dc1d72c5b95cc3e3a8ed9e20f572815f067bd))
* add hyphenation feature with language selection and integrate DropdownMenu component ([1c8fb9e](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/1c8fb9e9beaae6b626367cd2eb464c7136380b8d))

## [0.3.0](https://github.com/NicolasPL64/LyricAdder-Reborn/compare/v0.2.1...v0.3.0) (2026-09-24)


### Features

* add changelog modal and functionality to display updates ([d5ac813](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/d5ac813c71b9a9d6c68603ff5ab0d067dac70d56))
* add dynamic placeholder for lyrics editor and style for empty state ([6bac78d](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/6bac78d1c5c19d767b3d160b207b27f1c2c26033))
* add keyboard shortcuts for text formatting and joining syllables in the lyrics editor ([3311078](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/3311078576c31f987d66fa17df19ad7c213d573b))
* add tauri-plugin-opener and integrate with changelog modal ([74646a3](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/74646a3b69e2aadf82943b11866c978abe0c6c10))
* add text formatting icons for bold, italics, underline, and strikethrough in the lyrics editor ([c55de9f](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/c55de9fd3d2fe83328a6479d4384302cb56ef252))
* allow toolbar in plain mode too ([a99f328](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/a99f328358a077c28165bbe2dbb9c6db398f3abf))
* enhance lyrics editor styling with background and positioning adjustments for joined elements ([ac516b8](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/ac516b8a2dc4d6dfca40463fafe739370c40f8ed))
* enhance lyrics editor with rich text toggle and update save functionality ([8271529](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/8271529ae30c3e30f9c363fb74f4c8ec026ac1ed))
* enhance markup rendering for mspace and letter case tags with validation and serialization ([086f947](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/086f9477ff21d5051e82677370f937f0d4627107))
* implement join and unjoin functionality for syllables in the lyrics editor ([af644a9](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/af644a97226e37abbc296151f261eae48f8832e8))
* implement rich text editing for lyrics with formatting options and joined syllables support ([058028c](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/058028c342d3cf4bc83b2e8f2c841cbdbffd198f))
* introduce internal equals marker for joined syllables and update related parsing logic ([98053f7](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/98053f77b2b2cb2c098f50cd1c469c5d10f2bbae))
* set application title to include version information on startup ([bff485b](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/bff485b327efa36dce55f835ddd3e4c077085ffc))


### Bug Fixes

* conditionally check for updates only in production environment ([fb4ef5f](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/fb4ef5f5aae155006c645218421e06725cf36d43))
* enhance handling of internal equals markers and literal equals in joined syllables for improved serialization and rendering ([f9ec7f0](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/f9ec7f065690952f39b1640e8170fa830c1f4de9))
* enhance serialization to preserve underscores and normalize unclosed tags in rich text editing ([3cdff55](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/3cdff554343163763d407b5270a6004618225f73))
* ignore empty formatting wrappers on blank lines in serializeEditableHtml ([4c4a16b](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/4c4a16bfdccf90c22e03b4b9e68cccbaa1386015))
* update textarea borders and focus styles for improved accessibility ([a5162ff](https://github.com/NicolasPL64/LyricAdder-Reborn/commit/a5162ff1752704ef17018dddd38421b4b9143ab4))

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
