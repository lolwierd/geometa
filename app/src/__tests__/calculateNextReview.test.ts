import { describe, expect, it } from 'vitest';
import { calculateNextReview } from '../app/api/memorizer/route';

describe('calculateNextReview', () => {
  it('keeps new Hard answers in learning with a short delay', () => {
    const result = calculateNextReview(2, 0, 2.5, 0, 'new', 0);
    expect(result.reviewDelayMinutes).toBe(5);
    expect(result.state).toBe('learning');
    expect(result.lapses).toBe(0);
  });

  it('treats Again answers as lapses', () => {
    const result = calculateNextReview(0, 3, 2.5, 15, 'review', 0);
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('lapsed');
  });

  it('adjusts intervals for Hard, Good, and Easy grades', () => {
    const hard = calculateNextReview(2, 2, 2.5, 6, 'review', 0);
    expect(hard.interval).toBe(3);
    expect(hard.easeFactor).toBeCloseTo(2.18, 2);

    const good = calculateNextReview(3, 2, 2.5, 6, 'review', 0);
    expect(good.interval).toBe(15);
    expect(good.easeFactor).toBeCloseTo(2.36, 2);

    const easy = calculateNextReview(5, 2, 2.5, 6, 'review', 0);
    expect(easy.interval).toBe(20);
    expect(easy.easeFactor).toBeCloseTo(2.6, 5);
  });
});
