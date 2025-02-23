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
  GetLangsSuccessResponse,
  TranslateSuccessResponse,
  RawTranslateResponse,
  FailedResponse,
  Session,
} from "@/types/providers/libretranslate";
import { GetLangsError, ProviderError, TranslateError } from "@/errors";
import { getTimestamp } from "@/utils/utils";
import { generateUUIDv4 } from "@/utils/secure";

export default class LibreTranslateProvider extends BaseProvider {
  apiUrlPlaceholder = "https://libretranslate.com/";
  originPlaceholder = "https://libretranslate.com";
  headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  };
  session?: Session;

  constructor(options: BaseProviderOpts = {}) {
    super(options);
    this.updateData(options);
  }

  async getSession() {
    const timestamp = getTimestamp();
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
    body?: FormData,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ) {
    return {
      method,
      headers: {
        ...this.headers,
        Referer: this.origin,
        Origin: this.origin,
        Cookie: `session=${generateUUIDv4()};r=1`,
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
    return res.status > 399 || Object.hasOwn(data, "error");
  }

  async request<T extends object>(
    path: string,
    body?: FormData,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);
    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
        throw new ProviderError(data?.error ?? res.statusText);
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
    if (!this.allowUnsafeEval) {
      throw new ProviderError(
        "Can't create session, because unsafe eval disabled",
      );
    }

    const options = this.getOpts(undefined, undefined, "GET");
    const res = await this.fetch(
      `${this.apiUrl}/js/app.js?v=1.6.2`,
      options,
    ).catch(() => null);
    if (!res || res.status !== 200) {
      throw new ProviderError("Failed to request main app script");
    }

    const content = await res.text();
    if (
      !/self\[_\s*=\s*String\.fromCharCode,\s*p\s*=\s*parseInt,/.exec(content)
    ) {
      throw new ProviderError("Failed to parse secret key");
    }

    // const sessionData =
    //   /self\[_\s*=\s*String\.fromCharCode,\s*p\s*=\s*parseInt,\s*([^=]+)=\s*([^}]+)/.exec(
    //     content,
    //   );

    const secretScript =
      /\]\s*=\s*\(_\s*=\s*String\.fromCharCode,\s*(\w)\s*=\s*parseInt,\s*([^;]+)\)/.exec(
        content,
      );
    if (!secretScript) {
      throw new ProviderError("Failed to parse session token");
    }

    const [, replacedChar, execLine] = secretScript;
    const evalLine = execLine
      .replaceAll(replacedChar, "parseInt")
      .replaceAll("_", "String.fromCharCode");
    const token = atob(eval(evalLine) as string);
    return {
      creationTimestamp: getTimestamp(),
      maxAge: 3600,
      token,
    };
  }

  async rawTranslate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<RawTranslateResponse> {
    if (Array.isArray(text)) {
      // libre translate doesn't have native support array translation
      const results = await Promise.allSettled(
        text.map((str) => {
          return this.rawTranslate(str, lang);
        }),
      );

      return results.reduce<RawTranslateResponse>(
        (res, result) => {
          if (result.status === "rejected") {
            res.translations.push("");
            return res;
          }

          const {
            value: { lang, translations },
          } = result;
          res.lang = lang;
          res.translations.push(...translations);

          return res;
        },
        {
          // placeholder
          lang: "auto-en",
          translations: [],
        },
      );
    }

    const { fromLang, toLang } = this.parseLang(lang);
    const body = new FormData();
    body.append("q", text);
    body.append("source", fromLang);
    body.append("target", toLang);
    body.append("format", "text");
    body.append("alternatives", "0");
    body.append("api_key", this.apiKey ?? "");
    if (this.allowUnsafeEval && this.apiUrl === this.apiUrlPlaceholder) {
      const { token } = await this.getSession();
      body.append("secret", token);
    }

    const res = await this.request<TranslateSuccessResponse>(
      "/translate",
      body,
    );
    if (!this.isSuccessProviderRes<TranslateSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    const {
      detectedLanguage: { language = fromLang } = {},
      detectedLanguage = undefined,
      translatedText,
    } = res.data;
    return {
      lang: `${language}-${toLang}`,
      translations: [translatedText],
      detectedLanguage,
    };
  }

  /**
   * The total limit of characters per request is 2k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    const { lang: resLang, translations } = await this.rawTranslate(text, lang);
    return {
      lang: resLang,
      translations,
    };
  }

  /**
   * The total limit of characters per request is 2k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    // libretranslate doesn't have separate detect method
    const detectItem = await this.rawTranslate(text, "auto-ru");
    if (!detectItem.detectedLanguage) {
      throw new ProviderError("Failed to detect language");
    }

    const {
      detectedLanguage: { language: lang, confidence: score },
    } = detectItem;
    if (!lang) {
      throw new ProviderError("Failed to detect language");
    }

    return {
      lang,
      score,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    const res = await this.request<GetLangsSuccessResponse>(
      "/languages",
      undefined,
      undefined,
      "GET",
    );
    if (!this.isSuccessProviderRes<GetLangsSuccessResponse>(res)) {
      throw new GetLangsError(res.data);
    }

    return res.data.map((lang) => lang.code);
  }
}
