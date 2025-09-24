export const logger = {
    info: (...args) => {
        if (process.env.NODE_ENV !== "production") {
            console.log(...args);
        }
    },
    warn: (...args) => {
        if (process.env.NODE_ENV !== "production") {
            console.warn(...args);
        }
    },
    error: (...args) => {
        console.error(...args);
    },
};
//# sourceMappingURL=logger.js.map