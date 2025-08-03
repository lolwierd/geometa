import { describe, expect, it } from 'vitest';
import { calculateNextReview } from '../app/api/memorizer/route';

describe('calculateNextReview', () => {
  it('keeps new Hard answers in learning with a short delay', () => {
    const result = calculateNextReview(2, 0, 2.5, 0, 'new', 0);
    expect(result.reviewDelayMinutes).toBe(5);
    expect(result.state).toBe('learning');
    expect(result.lapses).toBe(0);
  });

  it('marks Hard answers after the first review as lapsed', () => {
    const result = calculateNextReview(1, 1, 2.5, 6, 'review', 0);
    expect(result.state).toBe('lapsed');
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(0);
    expect(result.lapses).toBe(1);
  });

  it('resets interval and repetitions for lapsed cards', () => {
    const result = calculateNextReview(1, 3, 2.5, 15, 'review', 0);
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBeCloseTo(2.3, 5);
  });

  it('recovers lapsed cards with a short delay when answered again', () => {
    const result = calculateNextReview(3, 0, 2.5, 7, 'lapsed', 1);
    expect(result.interval).toBe(1);
    expect(result.state).toBe('learning');
    expect(result.repetitions).toBe(1);
    expect(result.lapses).toBe(1);
  });

  it('increases interval and ease factor for Good and Easy grades', () => {
    const good = calculateNextReview(3, 2, 2.5, 6, 'review', 0);
    expect(good.interval).toBe(15);
    expect(good.easeFactor).toBeCloseTo(2.36, 2);

    const easy = calculateNextReview(5, 2, 2.5, 6, 'review', 0);
    expect(easy.interval).toBe(20);
    expect(easy.easeFactor).toBeCloseTo(2.6, 5);
  });

  it('enforces the ease-factor floor', () => {
    const result = calculateNextReview(3, 2, 1.3, 6, 'review', 0);
    expect(result.easeFactor).toBe(1.3);
  });
});
