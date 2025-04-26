import { Lang } from "../client";

export type FailedMessageResponse = {
  message: string;
};

export type FailedErrorResponse = {
  error: string;
};

export type FailedResponse = FailedMessageResponse | FailedErrorResponse;

export type TranslationItem = {
  text: string;
};

export type TranslateSuccessResponse = {
  translations: TranslationItem[];
};

export type DetectSuccessResponse = {
  languageCode: Lang | null;
  translationId: string;
};

export type LangItem = {
  code: Lang;
  name: string; // localized name by baseLang
};

export type GetLangsSuccessResponse = {
  languages: LangItem[];
};

export type TranslateBodyRequest = {
  sourceLanguageCode: string;
  targetLanguageCode: string;
  texts: string[];
  translationId?: string;
};
