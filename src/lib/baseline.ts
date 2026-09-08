// ARGUS — baseline math (mean/std + anomaly gate). Pure, testable.

export function meanStd(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export function isAnomaly(count: number, mean: number, std: number, samples: number): boolean {
  if (samples < 5) return false;
  return count > mean + 2 * std;
}
