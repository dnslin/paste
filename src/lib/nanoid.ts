import { nanoid } from 'nanoid';

export function generateId(length: number = 8): string {
  return nanoid(length);
}
