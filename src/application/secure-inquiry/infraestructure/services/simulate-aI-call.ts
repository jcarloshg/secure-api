// Simulate an external AI call with a 2-second delay
export const simulateAICall = async (redactedMessage: string): Promise<string> => {
    return new Promise((resolve, reject) => {

        // Simulate a failure 25% of the time
        if (Math.random() < 0.25) {
            reject(new Error("Simulated AI call failed"));
            return;
        }

        setTimeout(() => {
            resolve("Generated Answer");
        }, 2000);

    });
};
