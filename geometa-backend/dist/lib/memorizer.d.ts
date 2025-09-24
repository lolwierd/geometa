export declare function calculateNextReview(quality: number, repetitions: number, easeFactor: number, interval: number, state: "new" | "learning" | "review" | "lapsed", lapses: number): {
    readonly repetitions: 0;
    readonly easeFactor: number;
    readonly interval: 0;
    readonly state: "learning";
    readonly lapses: number;
    readonly reviewDelayMinutes: 5;
} | {
    readonly repetitions: 0;
    readonly easeFactor: number;
    readonly interval: 7;
    readonly state: "lapsed";
    readonly lapses: number;
    readonly reviewDelayMinutes?: undefined;
} | {
    readonly repetitions: 1;
    readonly easeFactor: number;
    readonly interval: 1;
    readonly state: "learning";
    readonly lapses: number;
    readonly reviewDelayMinutes: 10;
} | {
    readonly repetitions: number;
    readonly easeFactor: number;
    readonly interval: number;
    readonly state: "learning" | "review";
    readonly lapses: number;
    readonly reviewDelayMinutes?: undefined;
};
//# sourceMappingURL=memorizer.d.ts.map