export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function queryTokens(query: string) {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

export function matchesQuery(text: string, query: string) {
  const haystack = normalizeText(text);
  return queryTokens(query).every(token => haystack.includes(token));
}

export type TextPart = { text: string; match: boolean };

// Matching runs on accent-free text, so each normalized char keeps a pointer to its source index.
export function highlightParts(text: string, query: string): TextPart[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [{ text, match: false }];
  let normalized = "";
  const sourceIndex: number[] = [];
  Array.from(text).forEach((char, index) => {
    for (const piece of normalizeText(char)) {
      normalized += piece;
      sourceIndex.push(index);
    }
  });
  const chars = Array.from(text);
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const token of tokens) {
    let from = normalized.indexOf(token);
    while (from !== -1) {
      for (let i = from; i < from + token.length; i++) marked[sourceIndex[i]] = true;
      from = normalized.indexOf(token, from + token.length);
    }
  }
  const parts: TextPart[] = [];
  chars.forEach((char, index) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[index]) last.text += char;
    else parts.push({ text: char, match: marked[index] });
  });
  return parts;
}
