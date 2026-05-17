function percentChange(oldVal, newVal) {
  if (oldVal === 0) return newVal === 0 ? 0 : 100;
  return Number((((newVal - oldVal) / Math.abs(oldVal)) * 100).toFixed(2));
}

function simpleSlope(timeSeries = []) {
  if (!timeSeries.length) return 0;
  const n = timeSeries.length;
  const xmean = (n - 1) / 2;
  const ymean = timeSeries.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xmean) * (timeSeries[i] - ymean);
    den += (i - xmean) * (i - xmean);
  }
  if (den === 0) return 0;
  return Number((num / den).toFixed(4));
}

module.exports = { percentChange, simpleSlope };
