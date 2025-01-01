# translate

[![GitHub Actions](https://github.com/FOSWLY/translate/actions/workflows/ci.yml/badge.svg)](https://github.com/FOSWLY/translate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/bundlejs/size/@toil/translate)](https://www.npmjs.com/package/@toil/translate)
[![en](https://img.shields.io/badge/lang-English%20%F0%9F%87%AC%F0%9F%87%A7-white)](README.md)
[![ru](https://img.shields.io/badge/%D1%8F%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%F0%9F%87%B7%F0%9F%87%BA-white)](README-RU.md)

Библиотека для бесплатного и не только использования различных API перевода, которая поддерживает работу с JavaScript, TypeScript, а также имеет встроенные разделенные типы для Typebox.

## Установка

Установка с Bun:

```bash
bun add @toil/translate
```

Установка с Node:

```bash
npm install @toil/translate
```

## Начало работы

Чтобы начать работу с API, вам необходимо создать Translation клиент. Это можно сделать, воспользовавшись приведенным ниже кодом.

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

Вы можете увидеть больше примеров кода [здесь](https://github.com/FOSWLY/translate/tree/main/examples)

## Доступные сервисы

| Статус | Сервис          | Функции                         | Лимиты                         |
| ------ | --------------- | ------------------------------- | ------------------------------ |
| ✅     | YandexBrowser   | Translate<br>Detect<br>GetLangs | 10k chars/req<br>10k chars/req |
| ✅     | YandexCloud     | Translate<br>Detect<br>GetLangs | 2k chars/req<br>1k chars/req   |
| ✅     | YandexTranslate | Translate<br>Detect<br>GetLangs | 10k chars/req<br>10k chars/req |
| ✅     | MSEdge          | Translate<br>Detect<br>GetLangs | 50k chars/req<br>50k chars/req |

## Сборка

Для сборки необходимо наличие:

- [Bun](https://bun.sh/)

Не забудьте установить зависимости:

```bash
bun install
```

Запустите сборку:

```bash
bun build:all
```

## Тесты

Библиотека имеет минимальное покрытие тестами для проверки ее работоспособности.

Запустить тесты:

```bash
bun test
```
