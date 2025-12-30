// Simulate an external AI call with a 2-second delay
export const simulateAICall = async (redactedMessage: string): Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Generated Answer");
        }, 2000);
    });
};
