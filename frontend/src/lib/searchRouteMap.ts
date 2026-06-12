type RouteMapEntry = {
  keywords: string[];
  route: string;
};

const ROUTES: RouteMapEntry[] = [
  { keywords: ["booking", "book", "tickets", "ticket"], route: "/booking" },
  { keywords: ["shop", "spark club", "sparkclub", "spark-club", "spark", "sparkstage", "stage55", "stage 55", "sparksatge"], route: "/shop" },
  { keywords: ["glam", "glam room", "beauty", "makeup"], route: "/glam" },
  { keywords: ["charm", "charm bar", "charm-bar", "charmbar"], route: "/charm-bar" },
  { keywords: ["dressing", "dressing-room", "fashion", "fashion on demand", "rental", "sewa"], route: "/dressing-room" },
  { keywords: ["news", "artikel", "blog"], route: "/news" },
  { keywords: ["events", "event", "agenda"], route: "/events" },
];

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[’'"“”]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(keyword: string, input: string): boolean {
  const k = normalize(keyword);
  const q = normalize(input);
  if (!k || !q) return false;
  if (q === k) return true;
  if (q.includes(k) || k.includes(q)) return true;

  // token-level check
  const qTokens = q.split(/\s+/);
  for (const token of qTokens) {
    if (token === k) return true;
    if (token.includes(k) || k.includes(token)) return true;
    const d = levenshtein(token, k);
    if (d <= 2) return true;
  }

  // keyword tokens vs whole query
  const kTokens = k.split(/\s+/);
  for (const kt of kTokens) {
    const d = levenshtein(kt, q);
    if (d <= 2) return true;
  }

  return false;
}

export function mapSearchQueryToRoute(input: string): string | null {
  if (!input) return null;
  const q = normalize(input);

  // exact or fuzzy match against keywords
  for (const entry of ROUTES) {
    for (const k of entry.keywords) {
      if (fuzzyMatch(k, q)) return entry.route;
    }
  }

  return null;
}
