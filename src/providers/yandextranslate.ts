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
  DetectDetailSuccessResponse,
  DetectOptions,
  FailedResponse,
  GetLangsSuccessResponse,
  Session,
  SessionResponse,
  Srv,
  TranslateDetailSuccessResponse,
  TranslateOptions,
} from "@/types/providers/yandextranslate";
import {
  DetectEmptyLangError,
  DetectError,
  GetLangsError,
  ProviderError,
  TranslateError,
} from "@/errors";
import { getTimestamp } from "@/utils/utils";

export default class YandexTranslateProvider extends BaseProvider {
  MAX_UID = Number(10000000000000000000n);
  NANO_DIFF = 1000000;

  sessionUrl = "https://translate.yandex.ru/props/api/v1.0";
  apiUrlPlaceholder = "https://translate.yandex.net/api/v1/tr.json";
  originPlaceholder = "https://translate.yandex.ru";
  headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": config.userAgent,
  };
  session?: Session;

  constructor(options: BaseProviderOpts = {}) {
    super(options);
    this.updateData(options);
  }

  genYandexUID() {
    return BigInt(Math.floor(Math.random() * this.MAX_UID)).toString();
  }

  genYandexMetrikaUID() {
    return Math.floor(Date.now() * this.NANO_DIFF).toString();
  }

  getSecure(srv: Srv) {
    return {
      srv,
      yu: this.genYandexUID(),
      yum: this.genYandexMetrikaUID(),
    };
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
    body: URLSearchParams | null,
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

  getParams(srv: Srv, params: Record<string, string> = {}) {
    return new URLSearchParams({
      ...this.getSecure(srv),
      ...params,
    }).toString();
  }

  isErrorRes<T extends object>(
    res: Response,
    data: T | FailedResponse,
  ): data is FailedResponse {
    return res.status > 399 || Object.hasOwn(data, "message");
  }

  async request<T extends object>(
    path: string,
    body: URLSearchParams | null = null,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);
    try {
      const origin = path.includes("/sessions") ? this.sessionUrl : this.apiUrl;
      const res = await this.fetch(`${origin}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
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

  async createSession() {
    const res = await this.request<SessionResponse>(
      `/sessions?${this.getParams("tr-text")}`,
    );

    if (!this.isSuccessProviderRes<SessionResponse>(res)) {
      throw new ProviderError("Failed to request create session");
    }

    return res.data.session;
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
    if (!Array.isArray(text)) {
      text = [text];
    }

    const { fromLang, toLang } = this.parseLang(lang);
    const { id: sid } = await this.getSession();
    const params = this.getParams("tr-text", {
      sid: `${sid}-5-0`,
      source_lang: fromLang,
      target_lang: toLang,
      // paste / ocr / type-end
      reason: "paste",
      format,
      // 0 - default
      // 1 - add random spaces before symbols + don't translate set of chars like testdfgdsazd
      // 2 - translate with html tags names (bad quality of translation + don't translate unknown words like test123), maybe it's enable old version
      strategy: "0",
      disable_cache: "false",
      ajax: "1",
    });

    const textArray: readonly [string, string][] = text.map((val) => [
      "text",
      val,
    ]);
    const body = new URLSearchParams([
      ["options", options.toString()],
      ...textArray,
    ]);

    const res = await this.request<TranslateDetailSuccessResponse>(
      `/translate?${params}`,
      body,
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
   * The total limit of characters per request is 10k chars
   */
  async translate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    const res = await this.rawTranslate(text, lang);
    const { lang: resLang, translations } = res;

    return {
      lang: resLang,
      translations,
    };
  }

  /**
   * You can use this method if you need a probabilities
   */
  async rawDetect(
    text: string,
    options: DetectOptions = DetectOptions.withCurrentProb,
  ) {
    const { id: sid } = await this.getSession();
    const params = this.getParams("tr-text", {
      sid,
      text,
      options,
    });

    const res = await this.request<DetectDetailSuccessResponse>(
      `/detect?${params}`,
      undefined,
      undefined,
      "GET",
    );
    if (!this.isSuccessProviderRes<DetectDetailSuccessResponse>(res)) {
      throw new DetectError(res.data);
    }

    // eslint-disable-next-line prefer-const
    let { lang: resLang, probs, score } = res.data;
    if (!resLang) {
      throw new DetectEmptyLangError(text);
    }

    if (probs) {
      probs = Object.entries(probs).reduce<Record<Lang, number>>(
        (result, [key, val]) => {
          result[key] = Math.round(val * -100);
          return result;
        },
        {},
      );
    }

    if (score) {
      score = Math.round(score * -100);
    }

    return {
      lang: resLang,
      probs,
      score,
    };
  }

  /**
   * The total limit of characters per request is 1k chars
   */
  async detect(text: string): Promise<DetectResponse> {
    const { score, lang } = await this.rawDetect(text);
    return {
      lang,
      score,
    };
  }

  async getLangs(): Promise<GetLangsResponse> {
    const params = this.getParams("tr-text");
    const res = await this.request<GetLangsSuccessResponse>(
      `/getLangs?${params}`,
    );
    if (!this.isSuccessProviderRes<GetLangsSuccessResponse>(res)) {
      throw new GetLangsError(res.data);
    }

    return res.data.dirs;
  }
}
