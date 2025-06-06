/* eslint-disable @typescript-eslint/require-await */
import config from "@/config/config";
import { NotSupportMethodError } from "@/errors";
import { FetchFunction, Lang } from "@/types/client";
import {
  BaseProviderOpts,
  DetectResponse,
  GetLangsResponse,
  ProviderResponse,
  ProviderSuccessResponse,
  RequestMethod,
  TranslationResponse,
} from "@/types/providers/base";
import { fetchWithTimeout } from "@/utils/utils";

export default class BaseProvider {
  allowUnsafeEval: boolean;
  apiUrl!: string;
  apiExtra?: unknown;
  apiKey?: string;
  origin!: string;
  apiUrlPlaceholder = config.originPlaceholder;
  originPlaceholder = config.originPlaceholder;
  fetch: FetchFunction;
  headers: Record<string, unknown> = {};
  fetchOpts: Record<string, unknown>;
  baseLang = config.baseLang;

  constructor({
    fetchFn = fetchWithTimeout,
    fetchOpts = {},
    apiUrl = this.apiUrlPlaceholder,
    apiExtra,
    apiKey,
    origin,
    allowUnsafeEval = false,
    headers = {},
  }: BaseProviderOpts = {}) {
    this.fetch = fetchFn;
    this.fetchOpts = fetchOpts;
    this.apiExtra = apiExtra;
    this.apiKey = apiKey;
    this.allowUnsafeEval = !!allowUnsafeEval;
    this.updateData({ apiUrl, headers, origin });
  }

  updateData({ apiUrl, headers, origin }: Partial<BaseProviderOpts> = {}) {
    this.apiUrl = this.isValidUrl(apiUrl) ? apiUrl : this.apiUrlPlaceholder;
    const originPlaceholder =
      this.originPlaceholder !== config.originPlaceholder
        ? this.originPlaceholder
        : this.apiUrl.split("/", 3).join("/");
    this.origin = this.isValidUrl(origin) ? origin : originPlaceholder;
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  isValidUrl(url: string | undefined): url is string {
    return /^(http(s)?):\/\//.test(String(url));
  }

  isSuccessProviderRes<T>(
    res: ProviderResponse<T>,
  ): res is ProviderSuccessResponse<T> {
    return res.success;
  }

  parseLang(lang: Lang) {
    const [fromLang, ...toLangParts] = lang.split("-");
    if (!toLangParts.length) {
      return {
        fromLang: this.baseLang,
        toLang: fromLang,
      };
    }

    return {
      fromLang,
      toLang: toLangParts.join("-"),
    };
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

  /**
   * The standard method for requesting the API, if necessary, you can override how it is done in the example
   */
  async request<T = unknown>(
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
    method: RequestMethod = "POST",
  ): Promise<ProviderResponse> {
    const options = this.getOpts(body, headers, method);

    try {
      const res = await this.fetch(`${this.apiUrl}${path}`, options);
      const data = (await res.json()) as T;
      return {
        success: res.status === 200,
        data,
      };
    } catch (err) {
      return {
        success: false,
        data: (err as Error)?.message,
      };
    }
  }

  async translate(
    _text: string | string[],
    _lang: Lang = "en-ru",
  ): Promise<TranslationResponse> {
    throw new NotSupportMethodError();
  }

  async detect(_text: string): Promise<DetectResponse> {
    throw new NotSupportMethodError();
  }

  async getLangs(): Promise<GetLangsResponse> {
    throw new NotSupportMethodError();
  }
}
