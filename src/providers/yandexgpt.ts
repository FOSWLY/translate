import { Lang } from "@/types/client";

import {
  TranslateDetailSuccessResponse,
  TranslateOptions,
} from "@/types/providers/yandextranslate";
import { TranslateError } from "@/errors";
import YandexTranslateProvider from "./yandextranslate";

/**
 * The total limit of characters per request is 10k chars
 */
export default class YandexGPTProvider extends YandexTranslateProvider {
  YAGPT_ORIGIN = "https://neuro.translate.yandex.ru";

  getSid() {
    const timestamp = Date.now().toString(16);

    return (
      timestamp +
      Array.from({ length: 16 - timestamp.length }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("")
    );
  }

  isSupportedLLMOptions(options: TranslateOptions) {
    return ![
      TranslateOptions.detailAlign,
      TranslateOptions.detailAlignAndDetectedLang,
    ].includes(options);
  }

  async llmRawRequest(
    text: string | string[],
    lang: Lang = "en-ru",
    options: TranslateOptions = TranslateOptions.default,
    format: "text" | "html" = "text",
  ) {
    if (lang !== "en-ru") {
      throw new TranslateError("LLM service support only en-ru lang");
    }

    if (!this.isSupportedLLMOptions(options)) {
      throw new TranslateError(
        "Detail align options not supported by LLM service",
      );
    }

    if (!Array.isArray(text)) {
      text = [text];
    }

    const sid = this.getSid();
    const params = new URLSearchParams({
      lang,
      id: `${sid}-0-0`,
      srv: "yabrowser-tr-text-app",
      tr_model: "llm_text",
      format,
    }).toString();

    const textArray: readonly [string, string][] = text.map((val) => [
      "text",
      val,
    ]);
    const body = new URLSearchParams([
      ["options", options.toString()],
      ["lang", lang],
      ...textArray,
    ]);

    const res = await this.request<TranslateDetailSuccessResponse>(
      `/translate?${params}`,
      body,
      {
        Origin: this.YAGPT_ORIGIN,
        Referer: `${this.YAGPT_ORIGIN}/`,
      },
    );

    if (!this.isSuccessProviderRes<TranslateDetailSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    const { lang: resLang, text: resText = [""], align, detected } = res.data;

    return {
      lang: resLang,
      translations: resText,
      align,
      detected,
    };
  }

  /**
   * You can use this method if you need also get a detected language or align
   */
  async rawTranslate(
    text: string | string[],
    lang: Lang = "en-ru",
    options: TranslateOptions = TranslateOptions.default,
    format: "text" | "html" = "text",
  ) {
    if (lang === "en-ru" && this.isSupportedLLMOptions(options)) {
      return await this.llmRawRequest(text, lang, options, format);
    }

    return await super.rawTranslate(text, lang, options, format);
  }
}
