import { bundledLanguagesInfo } from 'shiki/langs';

export interface Language {
  id: string;
  name: string;
  aliases: string[];
}

export const LANGUAGES: Language[] = [
  { id: 'plaintext', name: '纯文本', aliases: ['text', 'txt', 'plain'] },
  ...bundledLanguagesInfo.map(({ id, name, aliases }) => ({
    id,
    name: name || id,
    aliases: id === 'yaml'
      ? [...(aliases ?? []), 'docker-compose', 'kubernetes', 'k8s', 'helm']
      : aliases ?? [],
  })),
];

const languagesByAlias = new Map(
  LANGUAGES.flatMap((language) =>
    [language.id, ...language.aliases].map((alias) => [alias.toLowerCase(), language] as const),
  ),
);

export function normalizeLanguage(value: string): string | null {
  return languagesByAlias.get(value.trim().toLowerCase())?.id ?? null;
}

export function getLanguageName(value: string): string {
  return languagesByAlias.get(value.toLowerCase())?.name ?? value;
}
