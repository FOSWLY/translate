import { describe, expect, test } from "bun:test";
import TranslationClient from "../src";
import { TranslationService } from "../src/types/client";
import { phrase, secondPhrase } from "./data";

const proxied = Bun.env.HTTP_PROXY ?? Bun.env.HTTPS_PROXY;

const translationClient = new TranslationClient({
  service: TranslationService.operaaria,
  fetchOpts: {
    proxy: proxied,
  },
});

describe("translate", () => {
  test("translate phrase", async () => {
    const res = await translationClient.translate(phrase);
    expect(res.lang).toEqual("en-ru");
    expect(res.translations.length).toEqual(1);
  }, 10000);
  test("translate multi phrases", async () => {
    const res = await translationClient.translate([phrase, secondPhrase]);
    expect(res.lang).toEqual("en-ru");
    expect(res.translations.length).toEqual(2);
  }, 10000);
});

test("detect language", async () => {
  const res = await translationClient.detect(phrase);
  expect(res.lang).toEqual("en");
  expect(res.score).toEqual(null);
}, 10000);

test("get languages", async () => {
  const res = await translationClient.getLangs();
  expect(res.length).toBeGreaterThan(0);
});
