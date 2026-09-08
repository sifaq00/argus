import { describe, expect, it } from 'vitest';
import { isAnomaly, meanStd } from './baseline';

describe('meanStd', () => {
  it('computes mean+std', () => {
    expect(meanStd([10, 12, 11, 13, 12])).toEqual({ mean: 11.6, std: expect.closeTo(1.02, 1) });
  });
});
describe('isAnomaly', () => {
  it('requires at least 5 samples', () => {
    expect(isAnomaly(99, 10, 2, 3)).toBe(false);
  });
  it('true when > mean+2std', () => {
    expect(isAnomaly(30, 10, 2, 7)).toBe(true);
  });
  it('false when normal', () => {
    expect(isAnomaly(11, 10, 2, 7)).toBe(false);
  });
});
