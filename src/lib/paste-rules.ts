export const MAX_CONTENT_LENGTH = 500000;
export const MAX_PASSWORD_BYTES = 72;
export const VALID_EXPIRES = [5, 30, 60, 1440, 10080, 43200];

export function getPasswordError(password: string): string | null {
  if (password === '') return null;
  if (!password.trim()) return '密码不能只包含空白字符';
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `密码最多 ${MAX_PASSWORD_BYTES} 个 UTF-8 字节（中文通常占 3 个字节）`;
  }
  return null;
}
