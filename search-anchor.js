const MIN_TITLE_MATCH_LEN = 3;
const TITLE_MATCH_RATIO = 0.5;
function buildTitleIndex(notesGraph) {
  const index = /* @__PURE__ */ new Map();
  for (const [slug, entry] of Object.entries(notesGraph)) {
    index.set(slug, entry.title.trim().toLowerCase());
  }
  return index;
}
function scoreAnchorCandidates(notesGraph, titleIndex, query, textHitSlugs) {
  const normalizedQuery = query.trim().toLowerCase();
  const candidates = /* @__PURE__ */ new Map();
  for (const [slug, normTitle] of titleIndex) {
    let titleScore = 0;
    if (normTitle === normalizedQuery) {
      titleScore = 2;
    } else if (normalizedQuery.length > MIN_TITLE_MATCH_LEN) {
      if (normTitle.includes(normalizedQuery) && normalizedQuery.length / normTitle.length >= TITLE_MATCH_RATIO) {
        titleScore = 1;
      } else if (normalizedQuery.includes(normTitle) && normTitle.length / normalizedQuery.length >= TITLE_MATCH_RATIO) {
        titleScore = 1;
      }
    }
    if (titleScore > 0) candidates.set(slug, { slug, ...notesGraph[slug], titleScore });
  }
  for (const slug of textHitSlugs) {
    if (candidates.has(slug)) continue;
    const entry = notesGraph[slug];
    if (entry) candidates.set(slug, { slug, ...entry, titleScore: 0 });
  }
  const best = [...candidates.values()].filter((c) => c.neighbors.length > 0).sort((a, b) => b.titleScore - a.titleScore || b.neighbors.length - a.neighbors.length)[0];
  return best ?? null;
}
export {
  buildTitleIndex,
  scoreAnchorCandidates
};
