import { BoardCard, Mystery, StringLabel } from './types';

export function cardTitle(card: BoardCard, mystery: Mystery): string {
  if (card.kind === 'note') return card.text || '';
  if (card.kind === 'suspect') return mystery.suspects.find(s => s.id === card.refId)?.name || '?';
  return mystery.evidence.find(e => e.id === card.refId)?.title || '?';
}

export const STRING_COLORS: Record<StringLabel, string> = {
  link: '#d63031',
  motive: '#f1c40f',
  weapon: '#e67e22',
  contradiction: '#00cec9',
  alibi: '#2ecc71',
};

export const ROLE_COLORS = {
  lead: '#e5a93c',
  analyst: '#4fc3f7',
} as const;

export function initials(name: string): string {
  const parts = name.replace(/["“”]/g, '').split(/\s+/).filter(p => !/^(dr\.|don|doña|padre|sister|count|colonel|professor|general|maestro|lord|lady|baron|duchess|captain|ambassador)$/i.test(p));
  return (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
}
