import { describe, expect, test } from 'bun:test';
import { FrameTimeTracker } from '../src/core/perf-monitor';

describe('FrameTimeTracker', () => {
  test('keeps a bounded ring buffer without changing reported frame metrics', () => {
    let now = 0;
    const tracker = new FrameTimeTracker(3, () => now);

    for (const dt of [10, 20, 30, 40]) {
      now += dt;
      tracker.recordFrame();
    }

    expect(tracker.getSampleCount()).toBe(3);
    expect(tracker.getAverageFrameTime()).toBeCloseTo(30, 12);
    expect(tracker.getFPS()).toBeCloseTo(1000 / 30, 12);
    expect(tracker.getMinFrameTime()).toBe(20);
    expect(tracker.getMaxFrameTime()).toBe(40);
    expect(tracker.getPercentile95FrameTime()).toBe(40);
  });

  test('normalizes invalid sample caps and resets cleanly', () => {
    let now = 100;
    const tracker = new FrameTimeTracker(0, () => now);

    now += 16;
    tracker.recordFrame();
    now += 17;
    tracker.recordFrame();
    expect(tracker.getSampleCount()).toBe(1);
    expect(tracker.getAverageFrameTime()).toBe(17);

    tracker.reset();
    expect(tracker.getSampleCount()).toBe(0);
    expect(tracker.getAverageFrameTime()).toBe(0);
    expect(tracker.getPercentile95FrameTime()).toBe(0);
  });
});
