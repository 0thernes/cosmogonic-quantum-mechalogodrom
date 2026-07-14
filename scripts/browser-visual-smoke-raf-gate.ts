/**
 * Browser init script used by the visual-smoke harness.
 *
 * It waits for a requested number of real world animation frames, lets the entire native rAF batch
 * that reached the target finish, and then holds the following batch. The harness can therefore read
 * and capture the last fully presented frame without continuously competing with software WebGL.
 * Production never loads this script.
 */
export const VISUAL_SMOKE_RAF_GATE_SOURCE = String.raw`
(() => {
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  let nextAnimationFrameId = 1;
  const scheduled = new Map();
  const held = new Map();
  let targetFrame = null;
  let lastAllowedBatchTime = null;

  const schedule = (id, callback) => {
    const nativeId = nativeRequestAnimationFrame((time) => {
      scheduled.delete(id);
      const frame = window.__CQM__?.world?.state?.frame;
      if (targetFrame !== null && Number.isFinite(frame) && frame >= targetFrame) {
        // Complete every callback in the native batch that reached the target. Holding callbacks
        // later in that same batch would freeze a half-presented state merely because the world
        // callback happened to run first. The next timestamp starts the wholly held batch.
        lastAllowedBatchTime ??= time;
        if (time > lastAllowedBatchTime) {
          held.set(id, callback);
          return;
        }
      }
      callback(time);
    });
    scheduled.set(id, nativeId);
  };

  window.requestAnimationFrame = (callback) => {
    const id = nextAnimationFrameId++;
    schedule(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    const nativeId = scheduled.get(id);
    if (nativeId !== undefined) nativeCancelAnimationFrame(nativeId);
    scheduled.delete(id);
    held.delete(id);
  };
  Object.defineProperty(window, '__CQM_VISUAL_SMOKE_RAF_GATE__', {
    configurable: false,
    value: {
      get heldCount() {
        return held.size;
      },
      pauseAfterWorldFrames(frames) {
        const currentFrame = window.__CQM__?.world?.state?.frame;
        if (!Number.isFinite(currentFrame)) throw new Error('world frame counter missing');
        targetFrame = currentFrame + Math.max(1, Math.trunc(frames));
        lastAllowedBatchTime = null;
        return { startFrame: currentFrame, targetFrame };
      },
      resume() {
        targetFrame = null;
        lastAllowedBatchTime = null;
        const pending = Array.from(held.entries());
        held.clear();
        for (const [id, callback] of pending) schedule(id, callback);
        return pending.length;
      },
    },
  });
})();
`;
