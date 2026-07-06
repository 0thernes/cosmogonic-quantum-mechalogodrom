export {};

declare global {
  interface PerformanceMemory {
    readonly usedJSHeapSize: number;
    readonly totalJSHeapSize?: number;
    readonly jsHeapSizeLimit: number;
  }

  interface Performance {
    readonly memory?: PerformanceMemory;
  }

  interface Window {
    world?: unknown;
    cqmCopilot?: {
      toggle(open?: boolean): void;
    };
    pantheonArchitecturePanel?: unknown;
    cqmToggleSettings?: () => void;
  }
}
