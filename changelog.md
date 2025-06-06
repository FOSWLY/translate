# 1.0.8

## Lib

- Added support Opera Aria AI translate/detect language (Has banned topics + has Geo restrictions)
- Improved bypass Libre Translate secure
- Fixed Yandex Cloud translate without API key
- Bumped Libre Translate script version
- Yandex Cloud types interfaces replaced with types

## Workspace

- Bump depends

# 1.0.7

## Lib

- Fix Bing Translate with `Standard` tone

## Workspace

- Bump depends

# 1.0.6

## Lib

- Added support Libre Translate
- Added support Bing Translate
- Moved `isSuccessProviderRes` method to base provider
- Some typings improvements

## Workspace

- Bump depends

# 1.0.5

## Lib

- Added support [new YandexGPT translation model](https://habr.com/ru/companies/yandex/articles/884416/)
- Removed sonarjs rule comments
- Rewritted typebox generation logic with `@toil/typebox-genx`

## Workspace

- Bump depends

# 1.0.4

## Lib

- Added exports all types and providers

## Workspace

- Updated build logic
- Now docs generating by GH actions
- Removed dist and docs from git repo
- Bump depends

# 1.0.3

- Fix invalid getLangs example in README
- Removed eslint-plugin-sonarjs package

# 1.0.2

- Added text format param for rawTranslate method for MSEdge and YandexTranslate

# 1.0.1

- Fix providers export
- Fix typescript paths building
- Fix providers mismatch apiUrl property name with base provider
- Fix set properties (apiUrl, origin and etc) for provider

# 1.0.0

- Initial release
