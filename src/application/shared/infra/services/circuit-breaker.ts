import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';

const COUNTER_PATH = path.join(__dirname, 'circuit-breaker-counter.json');

// --- Configuration ---
type CircuitState = 'CLOSED' | 'OPEN';
const FAILURE_THRESHOLD = 3;

// --- Circuit Breaker Logic ---
export class CircuitBreaker {

    // private static failureCount = 0;
    // private static state: CircuitState = 'CLOSED';
    private static instance: CircuitBreaker;

    public static getInstance(): CircuitBreaker {
        if (!CircuitBreaker.instance) {
            CircuitBreaker.instance = new CircuitBreaker();
        }
        return CircuitBreaker.instance;
    }

    public static async execute(action: () => Promise<any>, fallback: string): Promise<CircuitBreakerRes> {

        const instance = CircuitBreaker.getInstance();
        const circuitBreakerState = instance.loadState();

        if (circuitBreakerState.circuit_state === 'OPEN') {
            console.log("⚡ Circuit is OPEN. Returning fallback instantly.");
            return {
                status: circuitBreakerState.circuit_state,
                result: fallback
            }
        }

        try {
            const result = await action();
            // this.reset();
            instance.reset()
            return {
                status: circuitBreakerState.circuit_state,
                result: result
            }
        } catch (error) {
            instance.recordFailure(circuitBreakerState);
            throw error;
        }
    }


    private recordFailure(currentState: CircuitBreakerState) {
        currentState.counter++;
        console.log(`❌ Failure count: ${currentState.counter}`);
        this.saveState(currentState);
        if (currentState.counter >= FAILURE_THRESHOLD) {
            currentState.circuit_state = 'OPEN';
            this.saveState(currentState);
            setTimeout(() => {
                this.reset();
                console.log('🔄 Circuit breaker reset after timeout.');
            }, 10000);
        }
    }

    private reset() {
        const resetState: CircuitBreakerState = {
            counter: 0,
            circuit_state: "CLOSED"
        }
        this.saveState(resetState);
        console.log('✅ Circuit reset to CLOSED state.');
    }

    // ─────────────────────────────────────
    // read & write
    // ─────────────────────────────────────


    private loadState(): CircuitBreakerState {

        const rawData: CircuitBreakerState = {
            counter: 0,
            circuit_state: "CLOSED"
        }

        if (!existsSync(COUNTER_PATH)) {
            console.log("⚡ Circuit breaker state file not found. Initializing with default state.");
            return rawData;
        }

        const raw = readFileSync(COUNTER_PATH, 'utf8');
        console.log(`raw: `, raw);
        if (!raw.trim()) return rawData;

        try {
            return JSON.parse(raw);
        } catch (error) {
            return rawData;
        }
    }

    private saveState(state: CircuitBreakerState) {
        console.log(`state for save: `, state);
        writeFileSync(COUNTER_PATH, JSON.stringify(state, null, 2), 'utf8');
    }
}


export interface CircuitBreakerRes {
    status: CircuitState;
    result: any;
}

export interface CircuitBreakerState {
    counter: number;
    circuit_state: CircuitState;
}