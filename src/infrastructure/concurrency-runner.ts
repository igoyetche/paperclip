/**
 * Implements Task 8: Concurrency runner
 * A worker pool that processes items asynchronously with per-worker delay and concurrency limits.
 *
 * Implements §8 of the spec:
 * - Step 8.1: Process items with at most `concurrency` in-flight at any time
 * - Step 8.2: Per-worker delay enforcement (not before first call)
 * - Step 8.3: Tests with fake timers
 */

/**
 * Options for the concurrency runner
 */
export interface RunWithConcurrencyOptions {
  /** Maximum number of concurrent operations */
  readonly concurrency: number;
  /** Delay in milliseconds between each worker's consecutive calls */
  readonly perWorkerDelayMs: number;
  /** Optional progress callback invoked after each item completes */
  readonly onProgress?: (done: number, total: number) => void;
}

/**
 * Simple sleep utility for inter-request delays
 *
 * @param ms Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async function over items with concurrency and per-worker delay limits.
 *
 * @param items Array of items to process
 * @param fn Async function that processes each item
 * @param options Configuration (concurrency, perWorkerDelayMs, onProgress)
 * @returns Promise resolving to results array in original item order
 *
 * Behavior:
 * - Output order matches input order, even if operations complete out of order
 * - At most `concurrency` operations are in-flight at any time
 * - Each worker waits `perWorkerDelayMs` between its own consecutive calls
 * - The delay is NOT applied before the first call by each worker
 * - With N workers and delay D ms, effective rate ≈ N/D requests per second
 * - Progress callback (if provided) is invoked exactly `items.length` times
 *
 * Example:
 * ```
 * const results = await runWithConcurrency(
 *   ['a', 'b', 'c', 'd'],
 *   async (item) => item.toUpperCase(),
 *   { concurrency: 2, perWorkerDelayMs: 500 }
 * );
 * // results = ['A', 'B', 'C', 'D']
 * ```
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: RunWithConcurrencyOptions,
): Promise<R[]> {
  const { concurrency, perWorkerDelayMs, onProgress } = options;

  // Handle edge case: empty items
  if (items.length === 0) {
    return [];
  }

  // Results array: maintain input order
  const results: Array<R | undefined> = new Array(items.length);

  // Track progress
  let completedCount = 0;
  const errors: Error[] = [];

  // Create a work queue: each item is (index, item) pair
  let currentWorkIndex = 0;

  /**
   * Atomically fetch the next work item
   * This is called before the async fn() to ensure no double-processing
   */
  function dequeueWork(): { index: number; item: T } | null {
    if (currentWorkIndex >= items.length) {
      return null;
    }
    const index = currentWorkIndex;
    currentWorkIndex += 1;
    return { index, item: items[index] };
  }

  /**
   * Worker loop: processes items sequentially from the queue
   * Each worker waits perWorkerDelayMs between its calls (but not before the first)
   */
  async function worker(): Promise<void> {
    let isFirstCall = true;

    // Each worker continuously pulls items from the shared queue
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Enforce per-worker delay between calls (not before first call)
      if (!isFirstCall) {
        await sleep(perWorkerDelayMs);
      }

      // Atomically dequeue work BEFORE doing async work
      const work = dequeueWork();
      if (!work) {
        // No more items - this worker is done
        break;
      }

      isFirstCall = false;

      try {
        const result = await fn(work.item);
        results[work.index] = result;
      } catch (err) {
        // Store error but continue processing
        if (err instanceof Error) {
          errors.push(err);
        } else {
          errors.push(new Error(String(err)));
        }
      } finally {
        completedCount += 1;
        if (onProgress) {
          onProgress(completedCount, items.length);
        }
      }
    }
  }

  /**
   * Start up to `concurrency` workers, then wait for all to complete
   */
  const workerPromises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workerPromises.push(worker());
  }

  // Wait for all workers to finish
  await Promise.all(workerPromises);

  // If any worker encountered an error, throw the first one
  if (errors.length > 0) {
    throw errors[0];
  }

  // Return results in original order
  return results as R[];
}
