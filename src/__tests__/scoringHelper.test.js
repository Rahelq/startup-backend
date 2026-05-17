const { weightedScore } = require("../utils/scoringHelper");

test("weightedScore computes correct normalized score", () => {
  const weights = { a: 30, b: 70 };
  const factors = { a: 80, b: 60 };
  const s = weightedScore(weights, factors);
  expect(typeof s).toBe("number");
  // manual calc: (80*30 + 60*70)/(30+70) = (2400+4200)/100 = 66
  expect(s).toBeCloseTo(66, 3);
});
