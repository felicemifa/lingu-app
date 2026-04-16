/**
 * 規則動詞の語幹を取得する
 * - -are / -ere / -ire 動詞の不定詞末尾3文字を除いた部分を小文字で返す
 * - irregular: true の場合は空文字を返す
 */
export function getStem(verb) {
  if (!verb || verb.irregular) return '';
  const name = (verb.name || '').toLowerCase();
  if (name.endsWith('are') || name.endsWith('ere') || name.endsWith('ire')) {
    return name.slice(0, -3);
  }
  return '';
}
