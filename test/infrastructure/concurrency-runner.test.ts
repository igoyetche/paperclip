import { describe, it, expect, vi } from "vitest";
import { runWithConcurrency } from "../../src/infrastructure/concurrency-runner.js";

describe("concurrency-runner", () => {
  describe("runWithConcurrency", () => {
    it("processes empty items array and returns empty result", async () => {
      const result = await runWithConcurrency([], async (x) => x, {
        concurrency: 1,
        perWorkerDelayMs: 0,
      });
      expect(result).toEqual([]);
    });

    it("preserves input order in output", async () => {
      const result = await runWithConcurrency(
        ["a", "b", "c", "d"],
        async (item) => item.toUpperCase(),
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual(["A", "B", "C", "D"]);
    });

    it("handles concurrency greater than item count gracefully", async () => {
      const result = await runWithConcurrency(
        [1, 2],
        async (item) => item * 2,
        { concurrency: 10, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([2, 4]);
    });

    it("returns array with correct length matching input", async () => {
      const sizes = [1, 2, 5, 10];

      for (const size of sizes) {
        const result = await runWithConcurrency(
          Array.from({ length: size }, (_, i) => i),
          async (item) => item,
          { concurrency: 3, perWorkerDelayMs: 0 },
        );
        expect(result).toHaveLength(size);
      }
    });

    it("maintains correct order with large concurrency number", async () => {
      const result = await runWithConcurrency(
        [10, 20, 30, 40, 50],
        async (item) => item * 2,
        { concurrency: 100, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([20, 40, 60, 80, 100]);
    });

    it("propagates errors from async function", async () => {
      const error = new Error("Test error");

      const promise = runWithConcurrency(
        [1, 2, 3],
        async (item) => {
          if (item === 2) {
            throw error;
          }
          return item;
        },
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      await expect(promise).rejects.toThrow("Test error");
    });

    it("handles items that return undefined", async () => {
      const result = await runWithConcurrency<number, undefined>(
        [1, 2, 3],
        async () => {
          return undefined;
        },
        { concurrency: 1, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([undefined, undefined, undefined]);
    });

    it("handles items with complex return types", async () => {
      interface Result {
        value: number;
        squared: number;
      }

      const result = await runWithConcurrency<number, Result>(
        [1, 2, 3],
        async (item) => {
          return {
            value: item,
            squared: item * item,
          };
        },
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([
        { value: 1, squared: 1 },
        { value: 2, squared: 4 },
        { value: 3, squared: 9 },
      ]);
    });

    it("works with zero delay", async () => {
      const result = await runWithConcurrency(
        [1, 2, 3, 4],
        async (item) => item * 2,
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([2, 4, 6, 8]);
    });

    it("does not invoke progress callback when onProgress is undefined", async () => {
      let callCount = 0;

      const result = await runWithConcurrency(
        [1, 2, 3],
        async (item) => {
          callCount += 1;
          return item;
        },
        { concurrency: 1, perWorkerDelayMs: 0, onProgress: undefined },
      );

      expect(result).toEqual([1, 2, 3]);
      expect(callCount).toBe(3);
    });

    it("enforces concurrency limit: at most N operations in-flight", async () => {
      const maxConcurrent = { value: 0 };
      let activeTasks = 0;

      const result = await runWithConcurrency(
        Array.from({ length: 10 }, (_, i) => i),
        async () => {
          activeTasks += 1;
          maxConcurrent.value = Math.max(maxConcurrent.value, activeTasks);
          await Promise.resolve();
          activeTasks -= 1;
        },
        { concurrency: 3, perWorkerDelayMs: 0 },
      );

      expect(result).toHaveLength(10);
      expect(maxConcurrent.value).toBeLessThanOrEqual(3);
    });

    it("enforces sequential processing with concurrency=1", async () => {
      const executionOrder: number[] = [];
      let maxConcurrent = 0;
      let activeTasks = 0;

      await runWithConcurrency(
        [1, 2, 3, 4],
        async (item) => {
          activeTasks += 1;
          maxConcurrent = Math.max(maxConcurrent, activeTasks);
          executionOrder.push(item);
          await Promise.resolve();
          activeTasks -= 1;
        },
        { concurrency: 1, perWorkerDelayMs: 0 },
      );

      expect(maxConcurrent).toBe(1);
      expect(executionOrder).toEqual([1, 2, 3, 4]);
    });

    it("invokes progress callback exactly items.length times", async () => {
      const progressCalls: Array<[number, number]> = [];

      await runWithConcurrency(
        [1, 2, 3, 4, 5],
        async () => {
          await Promise.resolve();
        },
        {
          concurrency: 2,
          perWorkerDelayMs: 0,
          onProgress: (done, total) => {
            progressCalls.push([done, total]);
          },
        },
      );

      expect(progressCalls).toHaveLength(5);
      expect(progressCalls[progressCalls.length - 1]).toEqual([5, 5]);
    });

    it("progress callback increments done count correctly", async () => {
      const progressCalls: Array<[number, number]> = [];

      await runWithConcurrency(
        [1, 2, 3],
        async () => {
          await Promise.resolve();
        },
        {
          concurrency: 1,
          perWorkerDelayMs: 0,
          onProgress: (done, total) => {
            progressCalls.push([done, total]);
          },
        },
      );

      expect(progressCalls).toEqual([
        [1, 3],
        [2, 3],
        [3, 3],
      ]);
    });

    it("progress callback shows accurate counts with concurrent workers", async () => {
      const progressCalls: Array<[number, number]> = [];

      await runWithConcurrency(
        [1, 2, 3, 4],
        async () => {
          await Promise.resolve();
        },
        {
          concurrency: 2,
          perWorkerDelayMs: 0,
          onProgress: (done, total) => {
            progressCalls.push([done, total]);
          },
        },
      );

      expect(progressCalls).toHaveLength(4);
      // Done count should monotonically increase
      for (let i = 1; i < progressCalls.length; i++) {
        expect(progressCalls[i][0]).toBeGreaterThanOrEqual(progressCalls[i - 1][0]);
      }
    });



    it("returns results in original order with per-worker delays", async () => {
      vi.useFakeTimers();

      const promise = runWithConcurrency(
        [10, 20, 30, 40],
        async (item) => {
          return item * 2;
        },
        { concurrency: 1, perWorkerDelayMs: 100 },
      );

      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toEqual([20, 40, 60, 80]);
      vi.useRealTimers();
    });

    it("works with single item", async () => {
      const result = await runWithConcurrency(
        [42],
        async (item) => item * 2,
        { concurrency: 1, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([84]);
    });

    it("continues processing all items even after an error", async () => {
      const processed: number[] = [];

      try {
        await runWithConcurrency(
          [1, 2, 3, 4],
          async (item) => {
            processed.push(item);
            if (item === 2) {
              throw new Error("Item 2 failed");
            }
            return item;
          },
          { concurrency: 2, perWorkerDelayMs: 0 },
        );
      } catch {
        // Expected to throw
      }

      // All items should have been attempted
      expect(processed).toHaveLength(4);
    });

    it("returns correct types from async operations", async () => {
      interface Person {
        name: string;
        age: number;
      }

      const result = await runWithConcurrency<number, Person>(
        [1, 2, 3],
        async (item) => ({
          name: `Person${item}`,
          age: 20 + item,
        }),
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: "Person1", age: 21 });
      expect(result[1]).toEqual({ name: "Person2", age: 22 });
      expect(result[2]).toEqual({ name: "Person3", age: 23 });
    });

    it("processes items concurrently with real timers", async () => {
      const timings: number[] = [];
      const startTime = Date.now();

      const result = await runWithConcurrency(
        [0, 1, 2, 3],
        async (index) => {
          timings.push(Date.now() - startTime);
          return index * 10;
        },
        { concurrency: 2, perWorkerDelayMs: 0 },
      );

      expect(result).toEqual([0, 10, 20, 30]);
      // First two calls should start near the same time
      expect(Math.abs(timings[0] - timings[1])).toBeLessThan(50);
    });
  });
});
