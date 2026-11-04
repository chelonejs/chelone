export interface RealtimeReconnectConfig {
  /** Whether a dropped connection is retried. Default `true`. */
  enabled?: boolean;
  /** The wait before the first retry. Default 1000. */
  initialDelayMs?: number;
  /** The wait never grows past this. Default 30000. */
  maxDelayMs?: number;
  /** Retries before giving up. Default `Infinity`. */
  maxAttempts?: number;
  /** Share of each wait that is randomised, up or down. Default 0.3. */
  jitter?: number;
}

export function resolveReconnectConfig(
  config: RealtimeReconnectConfig = {},
): Required<RealtimeReconnectConfig> {
  return {
    enabled: config.enabled ?? true,
    initialDelayMs: config.initialDelayMs ?? 1000,
    maxDelayMs: config.maxDelayMs ?? 30000,
    maxAttempts: config.maxAttempts ?? Number.POSITIVE_INFINITY,
    jitter: config.jitter ?? 0.3,
  };
}

/** The wait before retry number `attempt` (from 0): exponential, capped, then jittered. */
export function reconnectDelay(
  attempt: number,
  config: Required<RealtimeReconnectConfig>,
  random: () => number = Math.random,
): number {
  const base = Math.min(
    config.initialDelayMs * 2 ** attempt,
    config.maxDelayMs,
  );
  const spread = base * config.jitter;
  return Math.max(0, base + (random() * 2 - 1) * spread);
}
