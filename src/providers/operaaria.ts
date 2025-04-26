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
import { RawTranslateResponse } from "@/types/providers/libretranslate";
import { ProviderError } from "@/errors";
import { getTimestamp } from "@/utils/utils";
import {
  AuthTokenData,
  ChatResponse,
  FailedDetailResponse,
  FailedErrorResponse,
  FailedResponse,
  Session,
  TokenFullResponseData,
  TokenRequestData,
  TokenResponseData,
  TranslateSuccessResponse,
} from "@/types/providers/operaaria";
import { randomBase64, randomDeviceName } from "@/utils/secure";

const DEFAULT_REQUEST_COUNT = 9999999;

export default class OperaAriaProvider extends BaseProvider {
  apiUrlPlaceholder = "https://composer.opera-api.com";
  originPlaceholder = "chrome-extension://igpdmclhhlcpoindmhkhillbfhdgoegm";
  accountsUrl = "https://accounts.opera.com";
  authUrl = "https://auth.opera.com";
  headers = {
    "content-type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 OPR/118.0.0.0",
  };
  clientSecret =
    "p3qX12F3v7Nxu+wOarmRwIMbtDGJm0+jj2ngSx6d05Z4c+2heqm3Ttuilcxdflqv";
  requestsAvailable = DEFAULT_REQUEST_COUNT;

  session?: Session;

  constructor(options: BaseProviderOpts = {}) {
    super(options);
    this.updateData(options);
  }

  async getSession() {
    if (!this.session || this.requestsAvailable < 10) {
      this.session = await this.createSession();
      this.requestsAvailable = DEFAULT_REQUEST_COUNT;
      return this.session;
    }

    const timestamp = getTimestamp();
    if (this.session.creationTimestamp + this.session.maxAge > timestamp) {
      return this.session;
    }

    this.session = await this.refreshSession();
    return this.session;
  }

  getOpts(
    body?: FormData | string,
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
      // AI takes more time to translate
      timeout: 10000,
      ...this.fetchOpts,
    };
  }

  isErrorRes<T extends object>(
    res: Response,
    data: T | FailedResponse,
  ): data is FailedResponse {
    return (
      res.status > 399 ||
      Object.hasOwn(data, "error") ||
      Object.hasOwn(data, "detail")
    );
  }

  getOriginByPath(path: string) {
    if (path.startsWith("/account/v2/")) {
      return this.authUrl;
    } else if (path.startsWith("/oauth2/v1/")) {
      return this.accountsUrl;
    }

    return this.apiUrlPlaceholder;
  }

  async request<T extends object>(
    path: string,
    body?: FormData | string,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse<T>> {
    const options = this.getOpts(body, headers, method);
    try {
      const origin = this.getOriginByPath(path);
      const res = await this.fetch(`${origin}${path}`, options);
      const data = (await res.json()) as T;
      if (this.isErrorRes<T>(res, data)) {
        throw new ProviderError(
          (data as FailedErrorResponse)?.error ??
            (data as FailedDetailResponse)?.detail ??
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

  async requestToken<T extends TokenRequestData = TokenRequestData>(
    data: T,
  ): Promise<
    T["grant_type"] extends "auth_token"
      ? TokenFullResponseData
      : TokenResponseData
  > {
    const body = new URLSearchParams(data).toString();
    const res = await this.request<
      (typeof data)["grant_type"] extends "auth_token"
        ? TokenFullResponseData
        : TokenResponseData
    >("/oauth2/v1/token/", body, {
      "Content-Type": "application/x-www-form-urlencoded",
    });
    if (!res.success) {
      throw new ProviderError(
        `Failed to request token with grant_types "${data.grant_type}"`,
      );
    }

    return res.data;
  }

  async createSession() {
    const initData = await this.requestToken({
      client_id: "opera_desktop-client",
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
      scope: "anonymous_account",
    });

    const authTokenRes = await this.request<AuthTokenData>(
      "/account/v2/external/anonymous/signup",
      JSON.stringify({
        client_id: "opera_desktop",
      }),
      {
        Authorization: `Bearer ${initData.access_token}`,
      },
    );
    if (!this.isSuccessProviderRes(authTokenRes)) {
      // detail property exists if Authorization header invalid
      throw new ProviderError("Failed to get auth token");
    }

    const { expires_in, access_token, refresh_token } = await this.requestToken(
      {
        client_id: "opera_desktop",
        auth_token: authTokenRes.data.token,
        grant_type: "auth_token",
        scope: "ALL",
        // fake device name
        device_name: randomDeviceName().toUpperCase(),
      },
    );

    return {
      creationTimestamp: getTimestamp(),
      maxAge: expires_in,
      accessToken: access_token,
      refreshToken: refresh_token,
      encryptionKey: randomBase64(),
    };
  }

  async refreshSession() {
    if (!this.session) {
      throw new ProviderError("Session not found");
    }

    const { refreshToken, encryptionKey } = this.session;
    const { expires_in, access_token } = await this.requestToken({
      client_id: "opera_desktop",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "shodan:aria",
    });

    return {
      creationTimestamp: getTimestamp(),
      maxAge: expires_in,
      accessToken: access_token,
      // refreshToken doesn't have exp field
      refreshToken,
      encryptionKey,
    };
  }

  async rawTranslate(
    text: string | string[],
    lang: Lang = "en-ru",
  ): Promise<RawTranslateResponse> {
    if (Array.isArray(text)) {
      // opera aria translate doesn't have native support array translation
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
    const { accessToken, encryptionKey } = await this.getSession();

    const res = await this.request<TranslateSuccessResponse>(
      "/api/v1/prompts/translate",
      JSON.stringify({
        supported_features: ["organize_tabs"],
        request_source: "side_panel",
        stream: false,
        linkify: true,
        sia: true,
        linkify_version: 3,
        selected_text: text,
        url: "google.com/",
        encryption: {
          key: encryptionKey,
        },
      }),
      {
        Authorization: `Bearer ${accessToken}`,
        "X-Opera-UI-Language": toLang,
      },
    );
    if (!this.isSuccessProviderRes(res)) {
      throw new ProviderError(res.data ?? "Failed to translate your text");
    }

    this.requestsAvailable =
      res.data.requests_available ?? DEFAULT_REQUEST_COUNT;

    if (
      res.data.message ===
      "What language would you like me to translate it into?"
    ) {
      // real message ends with \n
      throw new ProviderError(
        "Invalid target language or text language equal to target",
      );
    }

    return {
      lang: `${fromLang}-${toLang}`,
      translations: [res.data.message.trim()],
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
    const { accessToken, encryptionKey } = await this.getSession();

    const res = await this.request<ChatResponse>(
      "/api/v1/a-chat",
      JSON.stringify({
        supported_features: ["organize_tabs", "rich_response"],
        request_source: "side_panel",
        stream: false,
        linkify: true,
        sia: true,
        linkify_version: 3,
        // few-shot prompting
        query: `You are a professional Language detector. Your task is to understand the language of the text. You MUST only respond with the language code in the iso 6391 format.
text: Добро пожаловать на мой веб-сайт
output: ru

text: Hello my friend
output: en

text: こんにちは、何故か読書す。
output: ja

text: Привіт, ти думаєш в цьому є сенс?
output: uk

text: Tôi không hiểu, bạn đang cố gắng đạt được điều gì?
output: vi

text: ${text}
output: `,
        encryption: {
          key: encryptionKey,
        },
      }),
      {
        "X-Opera-UI-Language": "en",
        Authorization: `Bearer ${accessToken}`,
      },
    );
    if (!this.isSuccessProviderRes(res)) {
      throw new ProviderError(res.data ?? "Failed to detect language");
    }

    this.requestsAvailable =
      res.data.requests_available ?? DEFAULT_REQUEST_COUNT;

    const lang = res.data.message.trim();
    return {
      lang,
      score: null,
    };
  }

  getLangs(): Promise<GetLangsResponse> {
    return Promise.resolve([
      "bn",
      "bg",
      "be",
      "ca",
      "cs",
      "da",
      "de",
      "en",
      "et",
      "el",
      "fi",
      "hr",
      "hi",
      "id",
      "it",
      "kn",
      "ko",
      "lt",
      "lv",
      "ms",
      "pt",
      "ro",
      "sr",
      "sk",
      "sl",
      "sv",
      "th",
      "tr",
      "vi",
      "nl",
      "ru",
      "uk",
      "ja",
      "pl",
      "fr",
    ]);
  }
}
