import { Lang, LangPair } from "../client";

export type Session = {
  creationTimestamp: number;
  maxAge: number;
  token: string;
  ig: string;
};

export type FailedResponse = {
  statusCode: number;
  errorMessage: string;
};

export type DetectedLanguage = {
  language: Lang;
};

export type TranslationItem = {
  text: string;
  to: Lang;
};

export type TranslationData = {
  detectedLanguage?: DetectedLanguage;
  translations: TranslationItem[];
};

export type TranslateSuccessResponse = TranslationData[];

export type RawTranslateResponse = {
  lang: LangPair;
  data: TranslateSuccessResponse;
};

export type TranslationTone = "Casual" | "Formal" | "Standard";
