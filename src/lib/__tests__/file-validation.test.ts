// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateFile } from '@/lib/file-validation';

describe('declared file type and actual bytes', () => {
  it.each([
    ['notes.txt', Buffer.from('中文 UTF-8 文本')],
    ['data.json', Buffer.from('{"answer":42}')],
    ['empty.md', Buffer.alloc(0)],
    ['paper.pdf', Buffer.from('%PDF-1.7\n')],
    ['photo.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['photo.JPG', Buffer.from([255, 216, 255, 0])],
    ['image.gif', Buffer.from('GIF89a\0')],
    ['image.webp', Buffer.from('RIFF\0\0\0\0WEBP')],
    ['archive.zip', Buffer.from([80, 75, 3, 4, 0])],
    ['empty.zip', Buffer.from([80, 75, 5, 6, 0])],
  ])('allows supported %s signatures without parsing or executing content', (name, bytes) => {
    expect(validateFile(name, bytes)).toBe(name);
  });

  it.each(['png', 'jpg', 'gif', 'webp', 'pdf', 'zip'])('rejects a forged .%s extension', (extension) => {
    expect(() => validateFile(`pretend.${extension}`, Buffer.from('ordinary text'))).toThrow('文件内容与扩展名不符');
  });

  it('does not trust MIME and preserves Unicode while removing path and control characters', () => {
    expect(validateFile('../交付\r\n.txt', Buffer.from('text'))).toBe('.._交付__.txt');
    expect(() => validateFile('unknown.exe', Buffer.from('text'))).toThrow();
    expect(() => validateFile('binary.txt', Buffer.from([0, 255]))).toThrow('UTF-8');
  });
});
