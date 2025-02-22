export type FetchFunction = (
  input: string | URL | Request,
  init?: any,
) => Promise<Response>;

export type Lang = string;
export type LangPair = `${string}-${string}`;

export enum TranslationService {
  /**
   * The total limit of characters per request is 10k chars
   */
  yandexbrowser = "yandexbrowser",
  /**
   * Translate limit is 2k chars
   *
   * Detect limit is 1k chars
   */
  yandexcloud = "yandexcloud",
  /**
   * The total limit of characters per request is 10k chars
   */
  yandextranslate = "yandextranslate",
  /**
   * The total limit of characters per request is 10k chars
   */
  yandexgpt = "yandexgpt",
  /**
   * The total limit of characters per request is 50k chars
   */
  msedge = "msedge",
  /**
   * The total limit of characters per request is 1k chars
   */
  bing = "bing",
}

export type TranslationOpts = {
  service?: TranslationService;
  fetchFn?: FetchFunction; // e.g. GM_fetch, ofetch.native and etc
  fetchOpts?: Record<string, unknown>; // e.g. { dispatcher: ... }
  apiUrl?: string;
  apiKey?: string;
  apiExtra?: unknown;
  origin?: string;
  headers?: Record<string, unknown>;
};
