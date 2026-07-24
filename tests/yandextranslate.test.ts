import { describe, expect, test } from "bun:test";
import TranslationClient from "../src";
import { TranslationService } from "../src/types/client";
import { phrase, secondPhrase } from "./data";
import type YandexTranslateProvider from "@/providers/yandextranslate";

const translationClient = new TranslationClient({
  service: TranslationService.yandextranslate,
});

describe("translate", () => {
  test("translate phrase", async () => {
    const res = await translationClient.translate(phrase);
    expect(res.lang).toEqual("en-ru");
    expect(res.translations.length).toEqual(1);
  });
  test("translate multi phrases", async () => {
    const res = await translationClient.translate([phrase, secondPhrase]);
    expect(res.lang).toEqual("en-ru");
    expect(res.translations.length).toEqual(2);
  });
  test("translate with html", async () => {
    const res = await (
      translationClient.provider as YandexTranslateProvider
    ).rawTranslate(
      [
        '"I might kill you anyway, but the <wbr> obedience is important to me."',
      ],
      "en-ru",
      undefined,
      "html",
    );
    expect(res.lang).toEqual("en-ru");
    expect(res.translations[0]).toInclude("<wbr>");
  });
});

test("detect language", async () => {
  const res = await translationClient.detect(phrase);
  expect(res.lang).toEqual("en");
  expect(res.score).not.toEqual(null);
});

test("get languages", async () => {
  const res = await translationClient.getLangs();
  expect(res.length).toBeGreaterThan(0);
});
