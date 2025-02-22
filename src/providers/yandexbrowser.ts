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
  FailedResponse,
  MinimalResponse,
  TranslateSuccessResponse,
  DetectSuccessResponse,
  GetLangsSuccessResponse,
} from "@/types/providers/yandextranslate";
import {
  DetectEmptyLangError,
  DetectError,
  GetLangsError,
  ProviderError,
  TranslateError,
} from "@/errors";

/**
 * The total limit of characters per request is 10k chars
 */
export default class YandexBrowserProvider extends BaseProvider {
  apiUrlPlaceholder = "https://browser.translate.yandex.net/api/v1/tr.json";
  originPlaceholder = "https://youtube.com";
  headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": config.userAgent,
  };
  srv = "browser_video_translation";

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
      body: body
        ? body
        : new URLSearchParams({
            maxRetryCount: "2",
            fetchAbortTimeout: "500",
          }),
      ...this.fetchOpts,
    };
  }

  getParams(params: Record<string, string> = {}) {
    return new URLSearchParams({
      srv: this.srv,
      ...params,
    }).toString();
  }

  getArrayParams(params: readonly [string, string][]) {
    return new URLSearchParams([["srv", this.srv], ...params]).toString();
  }

  isErrorRes<T extends MinimalResponse = MinimalResponse>(
    res: Response,
    data: T | FailedResponse,
  ): data is FailedResponse {
    return res.status > 399 || data.code > 399;
  }

  isMinimalResponse(data: object): data is MinimalResponse {
    return Object.hasOwn(data, "code");
  }

  async request<T extends object = MinimalResponse>(
    path: string,
    body: unknown = null,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);

    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      if (!this.isMinimalResponse(data)) {
        return {
          success: true,
          data,
        };
      }

      if (this.isErrorRes(res, data)) {
        throw new ProviderError(data.message ?? res.statusText);
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

  /**
   * The total limit of characters per request is 10k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    if (!Array.isArray(text)) {
      text = [text];
    }

    const textArray: readonly [string, string][] = text.map((val) => [
      "text",
      val,
    ]);
    const params = this.getArrayParams([["lang", lang], ...textArray]);

    const res = await this.request<TranslateSuccessResponse>(
      `/translate?${params}`,
    );
    if (!this.isSuccessProviderRes<TranslateSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    const { lang: resLang, text: resText = [""] } = res.data;
    return {
      lang: resLang,
      translations: resText,
    };
  }

  /**
   * The total limit of characters per request is 10k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    const params = this.getParams({
      text,
    });

    const res = await this.request<DetectSuccessResponse>(`/detect?${params}`);
    if (!this.isSuccessProviderRes<DetectSuccessResponse>(res)) {
      throw new DetectError(res.data);
    }

    const { lang: resLang } = res.data;
    if (!resLang) {
      throw new DetectEmptyLangError(text);
    }

    return {
      lang: resLang,
      score: null,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    const params = this.getParams();

    const res = await this.request<GetLangsSuccessResponse>(
      `/getLangs?${params}`,
    );
    if (!this.isSuccessProviderRes<GetLangsSuccessResponse>(res)) {
      throw new GetLangsError(res.data);
    }

    return res.data.dirs;
  }
}
