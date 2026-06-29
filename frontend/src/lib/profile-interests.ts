/** 취미·관심 — 유니코드 이모지 문자열 배열로 저장 (12간지 코드 ID와 별개) */

/** 서버 저장 상한 (악용 방지). UI에서는 개수 제한 문구를 노출하지 않음 */
export const MAX_INTEREST_EMOJIS = 24;

/** 빠른 선택용 (자유 입력·기기 이모지 키보드도 가능) */
export const HOBBY_EMOJI_SUGGESTIONS = [
  "⚽", "⚾", "🏀", "🏃", "🚴", "🏋️", "🧘",
  "🎮", "🎸", "🎤", "🎬", "📷", "🎨",
  "📚", "✍️", "💻", "🧑‍🍳", "☕", "🍳",
  "✈️", "🏕️", "🐱", "🐶", "🦁", "🐻", "🐯", "🌱", "🎧",
] as const;

/** 입력·저장 전 정규화 — 그래프eme 단위, 중복 제거 */
export function normalizeInterestEmojis(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    for (const grapheme of Array.from(trimmed)) {
      if (grapheme === "️" || grapheme === " ") continue;
      if (out.includes(grapheme)) continue;
      if (out.length >= MAX_INTEREST_EMOJIS) return out;
      out.push(grapheme);
    }
  }
  return out;
}

/** 텍스트 필드에서 추가할 이모지 파싱 */
export function parseInterestInput(raw: string): string[] {
  return normalizeInterestEmojis(Array.from(raw.trim()));
}

export function toggleInterestEmoji(current: string[], emoji: string): string[] {
  const normalized = normalizeInterestEmojis([emoji]);
  if (normalized.length === 0) return current;
  const e = normalized[0]!;
  if (current.includes(e)) return current.filter((x) => x !== e);
  return normalizeInterestEmojis([...current, e]);
}
