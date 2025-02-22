import BaseProvider from "./base";

import { Lang } from "@/types/client";
import {
  BaseProviderOpts,
  DetectResponse,
  GetLangsResponse,
  ProviderResponse,
  RequestMethod,
  TranslationResponse,
} from "@/types/providers/base";
import {
  FailedResponse,
  TranslateSuccessResponse,
  RawTranslateResponse,
  TranslationTone,
  Session,
} from "@/types/providers/bing";
import { ProviderError, TranslateError } from "@/errors";
import { getUUID } from "@/utils/secure";

export default class BingTranslateProvider extends BaseProvider {
  apiUrlPlaceholder = "https://www.bing.com/";
  originPlaceholder = "https://www.bing.com";
  headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  };
  session?: Session;

  constructor(options: BaseProviderOpts = {}) {
    super(options);
    this.updateData(options);
  }

  async getSession() {
    const timestamp = Date.now();
    if (
      this.session &&
      this.session.creationTimestamp + this.session.maxAge > timestamp
    ) {
      return this.session;
    }

    this.session = await this.createSession();
    return this.session;
  }

  getOpts(
    body?: string,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ) {
    return {
      method,
      headers: {
        ...this.headers,
        Referer: this.origin,
        Origin: this.origin,
        ...headers,
      },
      body,
      ...this.fetchOpts,
    };
  }

  getParams(params: Record<string, string> = {}) {
    return new URLSearchParams({
      ...params,
    }).toString();
  }

  isErrorRes<T extends object>(
    res: Response,
    data: T | FailedResponse,
  ): data is FailedResponse {
    return res.status > 399 || Object.hasOwn(data, "errorMessage");
  }

  async request<T extends object>(
    path: string,
    body?: string,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);
    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
        throw new ProviderError(data?.errorMessage ?? res.statusText);
      }

      return {
        success: true,
        data,
      };
    } catch (err) {
      return {
        success: false,
        data: (err as Error)?.message,
      };
    }
  }

  async createSession() {
    const options = this.getOpts(undefined, undefined, "GET");
    const res = await this.fetch(`${this.apiUrl}/translator`, options).catch(
      () => null,
    );
    if (!res || res.status !== 200) {
      throw new ProviderError("Failed to request create session");
    }

    const content = await res.text();
    if (!content.includes("var params_AbusePreventionHelper")) {
      throw new ProviderError("Failed to parse session token");
    }

    const sessionData =
      /var params_AbusePreventionHelper\s*=\s*\[(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\];/.exec(
        content,
      );
    if (!sessionData) {
      throw new ProviderError("Failed to parse session token");
    }

    const ig = /"ig"\s*:\s*"([^"]+)"/.exec(content)?.[1] ?? getUUID();
    const [, timestamp, token, maxAge] = sessionData;
    return {
      // timestamp and maxage it's ms
      creationTimestamp: +timestamp,
      maxAge: +maxAge,
      token,
      ig,
    };
  }

  async rawTranslate(
    text: string | string[],
    lang: Lang = "en-ru",
    tone: TranslationTone = "Standard",
  ): Promise<RawTranslateResponse> {
    if (Array.isArray(text)) {
      // bing doesn't have native support array translation
      const results = await Promise.allSettled(
        text.map((str) => {
          return this.rawTranslate(str, lang, tone);
        }),
      );

      return results.reduce<RawTranslateResponse>(
        (res, result) => {
          if (result.status === "rejected") {
            res.data.push({
              translations: [],
            });
            return res;
          }

          const {
            value: { lang, data },
          } = result;
          res.lang = lang;
          res.data.push(...data);

          return res;
        },
        {
          // placeholder
          lang: "auto-en",
          data: [],
        },
      );
    }

    // eslint-disable-next-line prefer-const
    let { fromLang, toLang } = this.parseLang(lang);
    const origFromLang = fromLang;
    if (fromLang === "auto") {
      fromLang = "auto-detect";
    }

    const { token, ig, creationTimestamp } = await this.getSession();
    const translatorID = tone === "Standard" ? 5026 : 5023;
    const params = this.getParams({
      isVertical: "1",
      IG: ig,
      IID: `translator.${translatorID}`,
    });

    const body = new URLSearchParams([
      ["fromLang", fromLang],
      ["to", toLang],
      ["tryFetchingGenderDebiasedTranslations", "true"],
      ["token", token],
      ["key", String(creationTimestamp)],
      ["tone", tone],
      ["text", text],
    ]).toString();
    const res = await this.request<TranslateSuccessResponse>(
      `/ttranslatev3?${params}`,
      body,
    );
    if (!this.isSuccessProviderRes<TranslateSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    const detectedLang =
      res.data?.[0]?.detectedLanguage?.language ?? origFromLang;

    return {
      lang: `${detectedLang}-${toLang}`,
      data: res.data,
    };
  }

  /**
   * The total limit of characters per request is 1k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    const res = await this.rawTranslate(text, lang);
    const translations = res.data.map((translationItem) => {
      if (!translationItem.translations.length) {
        return "";
      }

      return translationItem.translations[0].text;
    });

    return {
      lang: res.lang,
      translations,
    };
  }

  /**
   * The total limit of characters per request is 1k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    // bing doesn't have separate detect method
    const detectItem = await this.rawTranslate(text, "auto-ru");
    const { detectedLanguage: { language: lang } = {} } = detectItem.data[0];
    if (!lang) {
      throw new ProviderError("Failed to detect language");
    }

    return {
      lang,
      score: null,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    return new Promise((resolve) => {
      resolve([
        "af",
        "ar",
        "as",
        "bn",
        "bg",
        "bs",
        "ca",
        "cs",
        "cy",
        "da",
        "de",
        "en",
        "et",
        "fi",
        "fil",
        "fj",
        "fr",
        "ga",
        "gu",
        "el",
        "he",
        "hi",
        "hr",
        "ht",
        "hu",
        "id",
        "is",
        "it",
        "ja",
        "kk",
        "kmr",
        "kn",
        "ko",
        "ku",
        "lt",
        "lv",
        "nl",
        "mg",
        "mi",
        "ml",
        "mr",
        "ms",
        "mt",
        "mww",
        "nb",
        "or",
        "otq",
        "fa",
        "pa",
        "pl",
        "prs",
        "ps",
        "pt",
        "pt-PT",
        "ro",
        "es",
        "ru",
        "sk",
        "sl",
        "sm",
        "sr-Cyrl",
        "sr-Latn",
        "sv",
        "sw",
        "ta",
        "te",
        "tlh",
        "th",
        "to",
        "tr",
        "ty",
        "uk",
        "ur",
        "vi",
        "yua",
        "yue",
        "zh-Hans",
        "zh-Hant",
      ]);
    });
  }
}
