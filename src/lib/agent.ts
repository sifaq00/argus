// ARGUS — agent prompt builder. Pure, testable.
export interface AnomalyRow { source: string; count: number; mean: number; stddev: number; samples: number }

export function buildAgentPrompt(input: { captured_at: string; rows: AnomalyRow[] }): string {
  const lines = input.rows.map(
    (r) => `- ${r.source}: count=${r.count} baseline mean=${r.mean.toFixed(1)} std=${r.stddev.toFixed(1)} (n=${r.samples})`,
  );
  return [
    'You are an ARGUS OSINT analyst. Write in English.',
    `Snapshot ${input.captured_at}. Compare counts against the 7-day baseline.`,
    'Report only anomalous sources (count > mean+2std) or cross-source patterns.',
    'Reply with raw JSON only: {"severity":"CRITICAL|HIGH|ELEVATED|LOW","summary":"<=280 chars","details":{"notes":"1-2 sentences"}}.',
    'Data:', ...lines,
  ].join('\n');
}
