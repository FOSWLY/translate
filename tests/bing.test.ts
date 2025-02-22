import { describe, expect, test } from "bun:test";
import TranslationClient from "../src";
import { TranslationService } from "../src/types/client";
import { phrase, secondPhrase } from "./data";

const translationClient = new TranslationClient({
  service: TranslationService.bing,
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
});

test("detect language", async () => {
  const res = await translationClient.detect(phrase);
  expect(res.lang).toEqual("en");
});

test("get languages", async () => {
  const res = await translationClient.getLangs();
  expect(res.length).toBeGreaterThan(0);
});
