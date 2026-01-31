const SHARE_TOKEN_REGEX = /^[a-f0-9]{64}$/i;

export const isValidShareToken = (token: string): boolean =>
  SHARE_TOKEN_REGEX.test(token);
