import { Lang, LangPair } from "../client";

export type Srv = "tr-text" | "tr-image";
export type Session = {
  creationTimestamp: number; // in secs
  id: string;
  maxAge: number;
  status: string; // active
  statusCode: number;
};
export type SessionResponse = Record<"session", Session>;

export type MinimalResponse = {
  code: number; // http code
};

export interface FailedResponse extends MinimalResponse {
  message: string;
}

export interface TranslateSuccessResponse extends MinimalResponse {
  lang: LangPair;
  text: string[];
}

export interface TranslateDetailSuccessResponse extends TranslateSuccessResponse {
  align?: string[];
  detected?: Record<"lang", Lang>;
}

export interface DetectSuccessResponse extends MinimalResponse {
  lang: Lang;
}

export interface DetectDetailSuccessResponse extends DetectSuccessResponse {
  probs: Record<string, number>; // value is probability from -100.0 to 0.0
  score: number; // value is probability from -100.0 to 0.0
}

export interface GetLangsSuccessResponse {
  dirs: LangPair[];
}

export enum TranslateOptions {
  /**
   * default translation
   */
  default,
  /**
   * add detected lang
   */
  detectedLang,
  /**
   * add align
   */
  align,
  /**
   * add align + detected lang
   */
  alignAndDetectedLang,
  /**
   * add detail align (6 too)
   */
  detailAlign,
  /**
   * add detail align + detected lang (7 too)
   */
  detailAlignAndDetectedLang,
}

export enum DetectOptions {
  // Probability is value -100.0 to 0.0
  /**
   * default detect (any option value other than below values)
   */
  default = "0",
  /**
   * add probabilities list, show probs from -30.0 to 0.0 (2, 3, 10, 11, 34, 35, 42, 43, .. too)
   */
  probs = "2",
  /**
   * add probabilities of all langs (6, 7, 14, 15, 38, 39, 46, 60, 61, .. too)
   */
  allProbs = "6",
  /**
   * add probability (score) of current lang (16, 17, 20, 21, 24, 25, 28, 29, 48, 49, 52, 53, .. too)
   */
  withCurrentProb = "16",
  /**
   * add probability (score) of current lang and probabilites list of other langs (18, 19, 26, 27, 50, 51, .. too)
   */
  probsWithCurrentProb = "18",
  /**
   * add probability (score) of current lang and probabilites of all langs -100.0 to 0.0 (22, 23, 30, 31, 54, 55, 62, 63, ... too)
   */
  allProbsWithCurrentProb = "22",
}
