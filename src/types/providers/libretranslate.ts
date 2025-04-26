import { Lang, LangPair } from "../client";

export type Session = {
  // in secs
  creationTimestamp: number;
  maxAge: number;
  token: string;
  sessionId: string;
};

export type LangData = {
  code: Lang;
  name: string;
  targets: Lang[];
};

export type FailedResponse = {
  error: string;
};

export type GetLangsSuccessResponse = LangData[];

export type TranslateDetectedLanguage = {
  confidence: number;
  language: string;
};

export type TranslateSuccessResponse = {
  alternatives?: string[];
  // only if request lang is auto
  detectedLanguage?: TranslateDetectedLanguage;
  translatedText: string;
};

export type RawTranslateResponse = {
  lang: LangPair;
  translations: string[];
  detectedLanguage?: TranslateDetectedLanguage;
};
