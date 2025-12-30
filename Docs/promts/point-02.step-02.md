## step

◦ Step 2 (Mock AI Call): Simulate an external AI call (use a setTimeout of 2 seconds) that returns a "Generated Answer."

## Key Implementation Points

- Asynchronous Simulation: Use a Promise to wrap the setTimeout. This allows you to use async/await syntax, making your code look and behave like a real network request.

- Non-Blocking Delay: By setting the timer to 2000ms (2 seconds), you ensure the code "waits" for the AI to process before moving to the Audit Log step.

- Data Flow: The function should ideally take the redacted message as an input and return the string "Generated Answer" as the resolved value.

## Prompt 01

1. add a simulation and external AI call with 2 seconds of timeOut.
2. Use a Promise to wrap the setTimeout. This allows you to use async/await syntax.
3. By setting the timer to 2000ms (2 seconds), you ensure the code "waits" for the AI to process before moving to the Audit Log step.
4. The function should ideally take the redacted message as an input and return the string "Generated Answer" as the resolved value.
5. Apply the changes into the file