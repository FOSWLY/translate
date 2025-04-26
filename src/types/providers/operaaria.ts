export type TokenScope =
  | "user"
  | "cryptobackup"
  | "subscriptions"
  | "social_accounts:read"
  | "shodan:aria"
  | "https://cashback.getdify.com:user"
  | "https://push.opera.com"
  | "https://sync.opera.com"
  | "https://cashback.getdify.com:transaction"
  | "user:read"
  | "https://cashback.getdify.com:opera_points"
  | "https://cdnbroker.opera.com"
  | "push-service:manage-devices"
  | "social_accounts"
  | "https://cashback.getdify.com:offer";

export type TokenRequestData = {
  client_id: string;
} & (
  | {
      client_secret: string;
      grant_type: "client_credentials";
      scope: "anonymous_account";
    }
  | {
      auth_token: string;
      grant_type: "auth_token";
      scope: "ALL" | TokenScope;
      device_name: string;
    }
  | {
      refresh_token: string;
      grant_type: "refresh_token";
      scope: TokenScope;
    }
);

export type TokenResponseData = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope: TokenScope;
};

export type TokenFullResponseData = TokenResponseData & {
  refresh_token: string;
  user_id: string;
};

export type AuthTokenData = {
  token: string;
};

export type Session = {
  // in secs
  creationTimestamp: number;
  maxAge: number;
  accessToken: string;
  refreshToken: string;
  // random base64 string (32 symbols)
  encryptionKey: string;
};

export type TranslateSuccessResponse = {
  message: string;
  extra_content: {
    text_to_speech: {
      audio_available: true;
    };
  };
  finish_reason: string;
  requests_available: number;
  requests_max: number;
  conversation_id: string;
  message_id: string;
  title: string;
};

export type FailedErrorResponse = {
  error: string;
};

export type FailedDetailResponse = {
  detail: string;
};

export type FailedResponse = FailedErrorResponse | FailedDetailResponse;

export type ChatResponse = {
  // ends with \n
  message: string;
  extra_content: Record<string, unknown>;
  finish_reason: string;
  requests_available: number;
  requests_max: number;
  conversation_id: string;
  message_id: string;
  // chat title
  title: string;
  user_location: {
    country_code: string;
  };
  // user locale
  language: string;
};
