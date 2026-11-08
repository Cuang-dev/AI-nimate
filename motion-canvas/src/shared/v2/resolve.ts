import type { Timings } from './types';

const strip = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase();

/** `sentenceId` or `sentenceId@word` -> absolute seconds. Throws if unresolvable. */
export function resolveAt(at: string, timings: Timings): number {
  const [sid, word] = at.split('@');
  const sent = timings.sentences.find((s) => s.id === sid);
  if (!sent) throw new Error(`[v2] unresolvable at "${at}": no sentence "${sid}"`);
  if (!word) return sent.start;
  const key = word.toLowerCase();
  const w = timings.words.find((x) => x.sentence_id === sid && strip(x.w).startsWith(key));
  if (!w) throw new Error(`[v2] unresolvable at "${at}": no word starting "${word}" in ${sid}`);
  return w.start;
}
