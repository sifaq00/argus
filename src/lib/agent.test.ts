import { describe, expect, it } from 'vitest';
import { buildAgentPrompt } from './agent';

describe('buildAgentPrompt', () => {
  it('includes anomaly + baseline', () => {
    const p = buildAgentPrompt({
      captured_at: '2026-09-08T00:00:00Z',
      rows: [{ source: 'flights', count: 90, mean: 30, stddev: 5, samples: 100 }],
    });
    expect(p).toContain('flights');
    expect(p).toContain('90');
    expect(p).toContain('Write in English');
  });
});
