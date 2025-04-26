# translate

[![GitHub Actions](https://github.com/FOSWLY/translate/actions/workflows/build.yml/badge.svg)](https://github.com/FOSWLY/translate/actions/workflows/build.yml)
[![npm](https://img.shields.io/bundlejs/size/@toil/translate)](https://www.npmjs.com/package/@toil/translate)
[![ru](https://img.shields.io/badge/%D1%8F%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%F0%9F%87%B7%F0%9F%87%BA-white)](README-RU.md)
[![en](https://img.shields.io/badge/lang-English%20%F0%9F%87%AC%F0%9F%87%A7-white)](README.md)

A library for free and not only using various translation APIs, which supports working with JavaScript, TypeScript, and also has built-in separated types for Typebox.

## Installation

Installation via Bun:

```bash
bun add @toil/translate
```

Installation via NPM:

```bash
npm install @toil/translate
```

## Getting started

To start working with the API, you need to create a Translation Client. This can be done using the code provided below.

```ts
const client = new TranslationClient({
  service: TranslationService.yandexbrowser,
});

const translatedResult = await client.translate(
  "The quick brown fox jumps over the lazy dog",
);

const detectResult = await client.detect(
  "The quick brown fox jumps over the lazy dog",
);

const langs = await client.getLangs();
```

You can see more code examples [here](https://github.com/FOSWLY/translate/tree/main/examples)

## Available services

| Status | Service           | Functions                       | Limits                         |
| ------ | ----------------- | ------------------------------- | ------------------------------ |
| ✅     | YandexBrowser     | Translate<br>Detect<br>GetLangs | 10k chars/req<br>10k chars/req |
| ✅     | YandexCloud       | Translate<br>Detect<br>GetLangs | 2k chars/req<br>1k chars/req   |
| ✅     | YandexTranslate   | Translate<br>Detect<br>GetLangs | 10k chars/req<br>10k chars/req |
| ✅     | YandexGPT\*¹      | Translate<br>Detect<br>GetLangs | 10k chars/req<br>10k chars/req |
| ✅     | MSEdge            | Translate<br>Detect<br>GetLangs | 50k chars/req<br>50k chars/req |
| ✅     | Bing              | Translate<br>Detect<br>GetLangs | 1k chars/req<br>1k chars/req   |
| ✅     | LibreTranslate\*² | Translate<br>Detect<br>GetLangs | 2k chars/req<br>2k chars/req   |
| ✅     | OperaAria\*³      | Translate<br>Detect<br>GetLangs | 1k chars/req<br>6k chars/req   |

\*¹ - translation using YandexGPT only works for the en-ru pair, For all other cases, a translation similar to YandexTranslate is used

\*² - by default, obtaining a secret key is disabled. Please install `apiKey` or enable `allowUnsafeEval` when creating the client. With `allowUnsafeEval` some requests may result in an error, probably due to some hard limits on the service side

\*³ - translation using OperaAria prohibits the translation of certain forbidden topics and also has geo-restrictions for some countries. The translation is performed using a neural network and may return unexpected results

## Build

To build, you must have:

- [Bun](https://bun.sh/)

Don't forget to install the dependencies:

```bash
bun install
```

Start building:

```bash
bun build:all
```

## Tests

The library has minimal test coverage to check it's performance.

Run the tests:

```bash
bun test
```
