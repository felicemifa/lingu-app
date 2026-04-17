/**
 * Parse an accent-marked form string into clean text and accented character positions.
 *
 * Format: vowel(s) inside [] are underline-marked.
 * Example: 'cr[e]do' → { clean: 'credo', accentedIndices: Set {2} }
 *
 * @param {string} accentForm
 * @returns {{ clean: string, accentedIndices: Set<number> }}
 */
export function parseAccentForm(accentForm) {
  if (!accentForm || typeof accentForm !== 'string') {
    return { clean: accentForm || '', accentedIndices: new Set() };
  }
  let clean = '';
  const accentedIndices = new Set();
  let i = 0;
  while (i < accentForm.length) {
    if (accentForm[i] === '[') {
      const end = accentForm.indexOf(']', i);
      if (end === -1) {
        // Malformed — treat '[' as literal
        clean += accentForm[i];
        i++;
      } else {
        const inside = accentForm.slice(i + 1, end);
        for (const ch of inside) {
          accentedIndices.add(clean.length);
          clean += ch;
        }
        i = end + 1;
      }
    } else {
      clean += accentForm[i];
      i++;
    }
  }
  return { clean, accentedIndices };
}
