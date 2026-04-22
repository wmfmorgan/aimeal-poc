const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "bowl",
  "bowls",
  "for",
  "fresh",
  "herby",
  "of",
  "one",
  "pan",
  "quick",
  "rice",
  "simple",
  "skillet",
  "the",
  "with",
]);

function sanitizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueQueries(queries: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const query of queries) {
    const normalized = query?.trim().replace(/\s+/g, " ") ?? "";
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function buildSpoonacularSearchQueries(title: string): string[] {
  const normalizedTitle = title
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rawTokens = normalizedTitle
    .split(/\s+/)
    .map(sanitizeToken)
    .filter((token) => token.length > 1);

  const keywords = rawTokens.filter((token) => !STOP_WORDS.has(token));
  const leadKeywords = keywords.slice(0, 3);
  const tailKeywords = keywords.slice(-3);
  const strongestPair = keywords.slice(0, 2);

  return uniqueQueries([
    normalizedTitle,
    keywords.join(" "),
    leadKeywords.join(" "),
    tailKeywords.join(" "),
    strongestPair.join(" "),
    keywords.length >= 2 ? `${keywords[0]} ${keywords[keywords.length - 1]}` : null,
  ]);
}
