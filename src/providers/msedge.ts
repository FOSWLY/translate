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
  DetectSuccessResponse,
  FailedResponse,
  GetLangsSuccessResponse,
  ProfanityAction,
  RawTranslateResponse,
  Session,
  TranslateSuccessResponse,
} from "@/types/providers/msedge";
import {
  DetectError,
  GetLangsError,
  ProviderError,
  TranslateError,
} from "@/errors";
import { getTimestamp } from "@/utils/utils";

export default class MSEdgeTranslateProvider extends BaseProvider {
  apiUrlPlaceholder = "https://api-edge.cognitive.microsofttranslator.com";
  sessionUrl = "https://edge.microsoft.com";
  originPlaceholder = "https://www.bing.com";
  headers = {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
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
    body: string | null,
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
      "api-version": "3.0",
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
    body: string | null = null,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);
    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
        throw new ProviderError(data.error?.message ?? res.statusText);
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
    const options = this.getOpts(null, undefined, "GET");
    const res = await this.fetch(
      `${this.sessionUrl}/translate/auth`,
      options,
    ).catch(() => null);
    if (!res || res.status !== 200) {
      throw new ProviderError("Failed to request create session");
    }

    const token = await res.text();
    if (!token.includes(".")) {
      throw new ProviderError("The received token has an unknown format");
    }

    return {
      creationTimestamp: getTimestamp(),
      maxAge: 580, // token has 10 min lifetime - 20 seconds for some delays
      token,
    };
  }

  /**
   * You can use this method if you need set a profanity
   */
  async rawTranslate(
    text: string | string[],
    lang: Lang = "en-ru",
    profanityAction: ProfanityAction = ProfanityAction.NoAction,
    textType: "html" | "plain" = "plain",
  ): Promise<RawTranslateResponse> {
    if (!Array.isArray(text)) {
      text = [text];
    }

    const { fromLang, toLang } = this.parseLang(lang);
    const { token } = await this.getSession();
    const params = this.getParams({
      from: fromLang,
      // Api support specify several "to" for translation into several languages at once, but I did not implement this
      to: toLang,
      textType,
      profanityAction,
    });

    const textArray = text.map((val) => ({ Text: val }));
    const res = await this.request<TranslateSuccessResponse>(
      `/translate?${params}`,
      JSON.stringify(textArray),
      {
        Authorization: `Bearer ${token}`,
      },
    );
    if (!this.isSuccessProviderRes<TranslateSuccessResponse>(res)) {
      throw new TranslateError(res.data);
    }

    return {
      lang: `${fromLang}-${toLang}`,
      data: res.data,
    };
  }

  /**
   * The total limit of characters per request is 50k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    const res = await this.rawTranslate(text, lang);
    const translations = res.data.map(
      (translationItem) => translationItem.translations[0].text,
    );

    return {
      lang: res.lang,
      translations,
    };
  }

  /**
   * You can use this method if you need a multi detect
   */
  async rawDetect(text: string | string[]) {
    if (!Array.isArray(text)) {
      text = [text];
    }

    const { token } = await this.getSession();
    const textArray = text.map((val) => ({ Text: val }));
    const params = this.getParams();

    const res = await this.request<DetectSuccessResponse>(
      `/detect?${params}`,
      JSON.stringify(textArray),
      {
        Authorization: `Bearer ${token}`,
      },
    );
    if (!this.isSuccessProviderRes<DetectSuccessResponse>(res)) {
      throw new DetectError(res.data);
    }

    return res.data.map((detectItem) => ({
      ...detectItem,
      score: Math.round(detectItem.score * 100),
    }));
  }

  /**
   * The total limit of characters per request is 50k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    const detectItem = await this.rawDetect(text);
    const { language: lang, score } = detectItem[0];

    return {
      lang,
      score,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    const params = this.getParams({
      scope: "translation",
    });
    const res = await this.request<GetLangsSuccessResponse>(
      `/languages?${params}`,
      undefined,
      undefined,
      "GET",
    );
    if (!this.isSuccessProviderRes<GetLangsSuccessResponse>(res)) {
      throw new GetLangsError(res.data);
    }

    return Object.keys(res.data.translation);
  }
}
