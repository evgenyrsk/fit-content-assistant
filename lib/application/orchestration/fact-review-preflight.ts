import type { VoiceEditOutput } from './voice-edit-contract.ts';

function normalized(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ').trim();
}

export function missingRequiredCaveats(draft: VoiceEditOutput, requiredCaveats: readonly string[]): string[] {
  const text = normalized(draft.fragments.map((fragment) => fragment.text).join(' '));
  return requiredCaveats.filter((caveat) => !text.includes(normalized(caveat)));
}
