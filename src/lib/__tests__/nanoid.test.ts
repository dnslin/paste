import { describe, it, expect } from 'vitest';
import { generateId } from '../nanoid';

describe('nanoid', () => {
  it('should generate ID with default length of 8', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  it('should generate ID with custom length', () => {
    const id = generateId(12);
    expect(id).toHaveLength(12);
  });

  it('should only contain URL-safe characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate unique IDs (1000 iterations)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });
});
