import BaseProvider from "./base";
import config from "@/config/config";

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
  DetectSuccessResponse,
  FailedErrorResponse,
  FailedMessageResponse,
  FailedResponse,
  GetLangsSuccessResponse,
  TranslateBodyRequest,
  TranslateSuccessResponse,
} from "@/types/providers/yandexcloud";
import {
  DetectEmptyLangError,
  DetectError,
  GetLangsError,
  ProviderError,
  TranslateError,
} from "@/errors";

/**
 * Translate limit is 2k chars
 * Detect limit is 1k chars
 */
export default class YandexCloudProvider extends BaseProvider {
  apiUrlPlaceholder = "https://cloud.yandex.ru/api/translate";
  originPlaceholder = "https://cloud.yandex.ru";
  headers = {
    "Content-Type": "application/json",
    "User-Agent": config.userAgent,
  };

  constructor(options: BaseProviderOpts = {}) {
    super(options);
    this.updateData(options);
  }

  getOpts(
    body: unknown,
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

  isErrorRes<T extends object>(
    res: Response,
    data: T | FailedResponse,
  ): data is FailedResponse {
    return (
      res.status > 399 ||
      Object.hasOwn(data, "message") ||
      Object.hasOwn(data, "error")
    );
  }

  async request<T extends object>(
    path: string,
    body: unknown = null,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);

    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
        throw new ProviderError(
          (data as FailedMessageResponse).message ??
            (data as FailedErrorResponse).error ??
            res.statusText,
        );
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

  async rawDetect(text: string): Promise<DetectSuccessResponse> {
    const res = await this.request<DetectSuccessResponse>(
      "/detect",
      JSON.stringify({
        text,
        languageCodeHints: [], // lang code
      }),
    );
    if (!this.isSuccessProviderRes<DetectSuccessResponse>(res)) {
      throw new DetectError(res.data);
    }

    return res.data;
  }

  /**
   * The total limit of characters per request is 2k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    if (!Array.isArray(text)) {
      text = [text];
    }

    const { fromLang, toLang } = this.parseLang(lang);
    const body: TranslateBodyRequest = {
      sourceLanguageCode: fromLang,
      targetLanguageCode: toLang,
      texts: text,
    };

    if (!this.apiKey) {
      const { translationId } = await this.rawDetect(text[0]);
      body.translationId = translationId;
    }

    const res = await this.request<TranslateSuccessResponse>(
      "/translate",
      JSON.stringify(body),
    );

    if (!this.isSuccessProviderRes<TranslateSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    const translations = res.data.translations.map(
      (translation) => translation.text,
    );

    return {
      lang: `${fromLang}-${toLang}`,
      translations,
    };
  }

  /**
   * The total limit of characters per request is 1k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    const { languageCode: resLang } = await this.rawDetect(text);
    if (!resLang) {
      throw new DetectEmptyLangError(text);
    }

    return {
      lang: resLang,
      score: null,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    const res = await this.request<GetLangsSuccessResponse>(
      `/languages?baseLang=${this.baseLang}`,
      undefined,
      undefined,
      "GET",
    );
    if (!this.isSuccessProviderRes<GetLangsSuccessResponse>(res)) {
      throw new GetLangsError(res.data);
    }

    return res.data.languages
      .map((lang) => lang.code)
      .filter((lang) => lang !== this.baseLang);
  }
}
