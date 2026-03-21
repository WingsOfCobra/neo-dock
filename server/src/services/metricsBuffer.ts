interface TimestampedEntry<T> {
  timestamp: number;
  data: T;
}

export class MetricsBuffer<T> {
  private entries: TimestampedEntry<T>[] = [];
  private readonly maxAge: number;
  private readonly maxInterval: number;

  constructor(maxAge: number = 3600000, maxInterval: number = 1000) {
    this.maxAge = maxAge;
    this.maxInterval = maxInterval;
  }

  push(timestamp: number, data: T): void {
    // Deduplicate: skip if last entry is within maxInterval
    if (this.entries.length > 0) {
      const last = this.entries[this.entries.length - 1]!;
      if (timestamp - last.timestamp < this.maxInterval) {
        return;
      }
    }

    this.entries.push({ timestamp, data });
    this.prune();
  }

  getRange(from?: number, to?: number): TimestampedEntry<T>[] {
    const now = Date.now();
    const start = from ?? now - this.maxAge;
    const end = to ?? now;

    return this.entries.filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end,
    );
  }

  prune(): void {
    const cutoff = Date.now() - this.maxAge;
    // Find first index that's within range
    let firstValid = 0;
    while (firstValid < this.entries.length && this.entries[firstValid]!.timestamp < cutoff) {
      firstValid++;
    }
    if (firstValid > 0) {
      this.entries.splice(0, firstValid);
    }
  }
}

// --- Exported singleton instances ---

export interface SystemMetrics {
  cpu: number;
  memUsedPercent: number;
  loadAvg: number[];
}

export interface ContainerMetrics {
  cpuPercent: number;
  memPercent: number;
  memUsage: number;
}

export const systemMetricsBuffer = new MetricsBuffer<SystemMetrics>(
  3600000, // 1 hour
  1000,    // 1 second min interval
);

export const containerMetricsBuffer = new Map<string, MetricsBuffer<ContainerMetrics>>();

export function getOrCreateContainerBuffer(containerId: string): MetricsBuffer<ContainerMetrics> {
  let buffer = containerMetricsBuffer.get(containerId);
  if (!buffer) {
    buffer = new MetricsBuffer<ContainerMetrics>(3600000, 1000);
    containerMetricsBuffer.set(containerId, buffer);
  }
  return buffer;
}
