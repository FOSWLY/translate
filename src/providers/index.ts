import { BaseProviderOpts } from "@/types/providers/base";
import { TranslationService } from "@/types/client";

import YandexBrowserProvider from "./yandexbrowser";
import YandexCloudProvider from "./yandexcloud";
import YandexTranslateProvider from "./yandextranslate";
import YandexGPTProvider from "./yandexgpt";
import MSEdgeTranslateProvider from "./msedge";
import BingTranslateProvider from "./bing";
import LibreTranslateProvider from "./libretranslate";

export { default as BaseProvider } from "./base";
export { default as YandexBrowserProvider } from "./yandexbrowser";
export { default as YandexCloudProvider } from "./yandexcloud";
export { default as YandexTranslateProvider } from "./yandextranslate";
export { default as YandexGPTProvider } from "./yandexgpt";
export { default as MSEdgeTranslateProvider } from "./msedge";
export { default as BingTranslateProvider } from "./bing";
export { default as LibreTranslateProvider } from "./libretranslate";

export const availableProviders = {
  [TranslationService.yandexbrowser]: YandexBrowserProvider,
  [TranslationService.yandexcloud]: YandexCloudProvider,
  [TranslationService.yandextranslate]: YandexTranslateProvider,
  [TranslationService.yandexgpt]: YandexGPTProvider,
  [TranslationService.msedge]: MSEdgeTranslateProvider,
  [TranslationService.bing]: BingTranslateProvider,
  [TranslationService.libretranslate]: LibreTranslateProvider,
};

export type AvailableTranslationProviders = typeof availableProviders;

/**
 * A convenient wrapper over the rest of the providers
 */
export default class TranslationProvider {
  providersData: BaseProviderOpts;

  constructor(providersData: BaseProviderOpts = {}) {
    this.providersData = providersData;
  }

  getProvider<K extends keyof AvailableTranslationProviders>(
    service: K,
  ): AvailableTranslationProviders[K]["prototype"] {
    return new availableProviders[service](this.providersData);
  }
}
