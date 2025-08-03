import { describe, expect, it } from 'vitest';
import { calculateNextReview } from '../app/api/memorizer/route';

describe('calculateNextReview', () => {
  it('marks new Hard answers as lapsed and returns reviewDelayMinutes', () => {
    const result = calculateNextReview(1, 0, 2.5, 0, 'new', 0);
    expect(result.reviewDelayMinutes).toBe(5);
    expect(result.state).toBe('lapsed');
    expect(result.lapses).toBe(1);
  });

  it('resets interval and repetitions for lapsed cards', () => {
    const result = calculateNextReview(1, 3, 2.5, 15, 'review', 0);
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(0);
  });

  it('increases interval and ease factor for Good and Easy grades', () => {
    const good = calculateNextReview(3, 2, 2.5, 6, 'review', 0);
    expect(good.interval).toBe(15);
    expect(good.easeFactor).toBeCloseTo(2.36, 2);

    const easy = calculateNextReview(5, 2, 2.5, 6, 'review', 0);
    expect(easy.interval).toBe(20);
    expect(easy.easeFactor).toBeCloseTo(2.6, 5);
  });
});
