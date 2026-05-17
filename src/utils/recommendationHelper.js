function compatibilityScore(candidate, preferences = {}) {
  // candidate: { industries: [], rating: 4.5, engagement: 80, availabilityScore: 0.8 }
  // preferences: { industry: 'FinTech', minRating: 4.0 }
  let score = 0;
  if (preferences.industry && candidate.industries) {
    score += candidate.industries.includes(preferences.industry) ? 30 : 0;
  }
  score += (Number(candidate.rating || 0) / 5) * 30;
  score += Number(candidate.engagement || 0) * 0.2; // engagement out of 100
  score += Number(candidate.availabilityScore || 0) * 20;
  return Number(score.toFixed(2));
}

module.exports = { compatibilityScore };
