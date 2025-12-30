## infor

3. The Twist: The system must include a "Circuit Breaker." If the Mock AI Call fails 3 times in a row, the API should instantly return a fallback message ("Service Busy") without waiting for the timeout.

## Key Implementation Points

In system design, a **Circuit Breaker** is a critical stability pattern used to prevent a failing service from dragging down the rest of your system. It acts exactly like an electrical circuit breaker in your home.

Here are the main architectural points for implementing this "Twist":

---

### 1. The Three States of the Circuit

You need to manage a global or persistent **State Machine** to track the health of the Mock AI service:

- **Closed (Normal):** The circuit is "closed," allowing requests to flow through to the Mock AI. We count failures here.
- **Open (Tripped):** After **3 consecutive failures**, the circuit "trips" or opens. All incoming requests are **instantly rejected** with the "Service Busy" fallback, bypassing the 2-second `setTimeout`.
- **Half-Open (Testing):** After a "cool-down" period, the circuit allows a single "test" request. If it succeeds, the circuit closes; if it fails, it opens again.

---

### 2. Logic & Counter Implementation

- **Failure Tracking:** You must maintain a `failureCount` variable outside the request scope.
- **The Threshold:** Increment the counter every time the Mock AI fails. If `failureCount >= 3`, change the state to `OPEN`.
- **The Fallback Path:** At the very beginning of Step 2, check the state.
- `if (state === 'OPEN') return "Service Busy";`

- **Success Reset:** If a call succeeds before hitting the threshold, reset the `failureCount` to `0`.

---

### 3. Fail-Fast Mechanism

The primary goal here is **Resource Protection**:

- By returning "Service Busy" instantly, you save 2 seconds of execution time per request.
- This prevents a "backlog" of waiting requests that could exhaust your server's memory or connection pool while the AI service is struggling.

---

### Summary of Circuit Behavior

| State         | Request Action            | Delay  | Transition Condition       |
| ------------- | ------------------------- | ------ | -------------------------- |
| **Closed**    | Call Mock AI              | 2s     | 3 Failures Open            |
| **Open**      | **Return "Service Busy"** | **0s** | Time passes Half-Open      |
| **Half-Open** | Call Mock AI (once)       | 2s     | Success Closed / Fail Open |
