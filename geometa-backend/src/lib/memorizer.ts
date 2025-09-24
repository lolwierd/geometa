export function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
  state: "new" | "learning" | "review" | "lapsed",
  lapses: number,
) {
  let newState = state;
  let newLapses = lapses;

  // Brand new card answered "hard": keep it in learning and reshow
  // it shortly instead of waiting a full day
  if (repetitions === 0 && quality === 2 && state !== "lapsed") {
    return {
      repetitions: 0,
      easeFactor,
      interval: 0,
      state: "learning",
      lapses: newLapses,
      reviewDelayMinutes: 5,
    } as const;
  }

  if (quality <= 1) {
    // Lapsed card: dramatically reduce the interval but don't reset to a single day
    newLapses += 1;
    const newEaseFactor = Math.max(1.3, easeFactor - 0.2);
    return {
      repetitions: 0,
      easeFactor: newEaseFactor,
      interval: 7, // Revisit in about a week
      state: "lapsed",
      lapses: newLapses,
    } as const;
  }

  if (state === "lapsed" && repetitions === 0 && quality >= 3) {
    return {
      repetitions: 1,
      easeFactor,
      interval: 1,
      state: "learning",
      lapses: newLapses,
      reviewDelayMinutes: 10,
    } as const;
  }

  let newRepetitions;
  let newEaseFactor;
  let newInterval;

  if (repetitions === 0) {
    newRepetitions = 1;
    newInterval = 1;
    newState = "learning";
  } else if (repetitions === 1) {
    newRepetitions = 2;
    newInterval = quality === 2 ? 3 : 6;
    newState = "review";
  } else {
    newRepetitions = repetitions + 1;
    if (quality === 2) {
      newInterval = Math.max(1, Math.round(interval / 2));
    } else {
      newInterval = Math.round(interval * easeFactor);
      if (quality === 5) {
        newInterval = Math.round(newInterval * 1.3);
      }
    }
    newState = "review";
  }

  newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
    state: newState,
    lapses: newLapses,
  } as const;
}

