export interface TimeoutController {
  signal: AbortSignal;
  clear: () => void;
}

/**
 * Creates an AbortController with automatic timeout
 * Returns both the signal and a cleanup function
 */
export function createTimeoutController(timeoutMs: number): TimeoutController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}
