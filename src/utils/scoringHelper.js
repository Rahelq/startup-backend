function weightedScore(weights = {}, factors = {}) {
  let totalWeight = 0;
  let score = 0;
  for (const [k, w] of Object.entries(weights)) {
    const v = Number(factors[k] || 0);
    score += v * Number(w || 0);
    totalWeight += Number(w || 0);
  }
  if (totalWeight === 0) return 0;
  return Number((score / totalWeight).toFixed(4));
}

module.exports = { weightedScore };
