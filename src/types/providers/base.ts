import { FetchFunction, Lang, LangPair } from "../client";

export type BaseProviderOpts = {
  fetchFn?: FetchFunction; // e.g. GM_fetch, ofetch.native and etc
  fetchOpts?: Record<string, unknown>; // e.g. { dispatcher: ... }
  apiUrl?: string; // e.g. schema://domain/api
  apiKey?: string;
  apiExtra?: unknown;
  allowUnsafeEval?: boolean;
  origin?: string; // schema://domain
  headers?: Record<string, unknown>;
};

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ProviderSuccessResponse<T = unknown> = {
  success: boolean;
  data: T;
};

export type ProviderFailedResponse = {
  success: false;
  data: string | null;
};

export type ProviderResponse<T = unknown> =
  | ProviderFailedResponse
  | ProviderSuccessResponse<T>;

export type TranslationResponse = {
  lang: LangPair;
  translations: string[];
};

export type DetectResponse = {
  lang: Lang;
  score: number | null; // 0 - 100
};

export type GetLangsResponse = Lang[] | LangPair[];
