const ACCENT_MAP = {
  à: 'a',
  á: 'a',
  è: 'e',
  é: 'e',
  ì: 'i',
  í: 'i',
  ò: 'o',
  ó: 'o',
  ù: 'u',
  ú: 'u',
};

function stripAccents(str) {
  return str.replace(/[àáèéìíòóùú]/g, (ch) => ACCENT_MAP[ch] || ch);
}

function normalize(str, accentOptional) {
  let s = str.trim().toLowerCase();
  if (accentOptional) s = stripAccents(s);
  return s;
}

/**
 * Check if the user's input matches the correct answer.
 * `correct` can be a string or an array of strings (for gender variants).
 */
export function checkAnswer(input, correct, accentOptional = false) {
  const normalizedInput = normalize(input, accentOptional);
  if (Array.isArray(correct)) {
    return correct.some((c) => normalize(c, accentOptional) === normalizedInput);
  }
  return normalize(correct, accentOptional) === normalizedInput;
}

/**
 * Format the correct answer for display.
 * If it's an array, join with " / ".
 */
export function formatAnswer(correct) {
  if (Array.isArray(correct)) return correct.join(' / ');
  return correct;
}
