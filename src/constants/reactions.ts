export const REACTION_OPTIONS = [
  "\u{1F44D}",
  "\u{2764}\u{FE0F}",
  "\u{1F602}",
  "\u{1F62E}",
  "\u{1F622}",
  "\u{1F621}",
  "\u{1F44F}",
  "\u{1F389}",
  "\u{1F525}",
  "\u{1F914}",
  "\u{1F64F}",
  "\u{1F4AF}",
];

export const normalizeReactionEmoji = (emoji: string | null | undefined): string | null => {
  if (!emoji) return null;
  if (REACTION_OPTIONS.includes(emoji)) return emoji;

  try {
    const bytes = Uint8Array.from(Array.from(emoji), (char) => char.charCodeAt(0));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return REACTION_OPTIONS.includes(repaired) ? repaired : emoji;
  } catch {
    return emoji;
  }
};
