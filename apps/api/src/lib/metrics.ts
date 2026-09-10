export interface ApiMetricsSnapshot {
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
  };
  requests: {
    total: number;
    active: number;
    byStatusClass: {
      '2xx': number;
      '3xx': number;
      '4xx': number;
      '5xx': number;
    };
  };
  latency: {
    p50Ms: number;
    p90Ms: number;
    p99Ms: number;
    avgMs: number;
  };
  database: {
    totalQueries: number;
    failedQueries: number;
    avgLatencyMs: number;
    lastCheckedAt: string | null;
    status: 'healthy' | 'degraded' | 'unreachable' | 'unconfigured';
  };
  timestamp: string;
}

class MetricsCollector {
  private totalRequests = 0;
  private activeRequests = 0;
  private status2xx = 0;
  private status3xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private latencies: number[] = [];
  private readonly maxLatencies = 1000;

  private dbQueries = 0;
  private dbFailures = 0;
  private dbTotalDurationMs = 0;
  private dbLastChecked: string | null = null;
  private dbStatus: 'healthy' | 'degraded' | 'unreachable' | 'unconfigured' = 'unconfigured';

  onRequestStart(): void {
    this.totalRequests++;
    this.activeRequests++;
  }

  onRequestEnd(statusCode: number, durationMs: number): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (statusCode >= 200 && statusCode < 300) this.status2xx++;
    else if (statusCode >= 300 && statusCode < 400) this.status3xx++;
    else if (statusCode >= 400 && statusCode < 500) this.status4xx++;
    else if (statusCode >= 500) this.status5xx++;

    this.latencies.push(durationMs);
    if (this.latencies.length > this.maxLatencies) {
      this.latencies.shift();
    }
  }

  recordDatabaseCheck(success: boolean, durationMs: number, status: 'healthy' | 'degraded' | 'unreachable' | 'unconfigured'): void {
    this.dbQueries++;
    if (!success) {
      this.dbFailures++;
    }
    this.dbTotalDurationMs += durationMs;
    this.dbLastChecked = new Date().toISOString();
    this.dbStatus = status;
  }

  getSnapshot(): ApiMetricsSnapshot {
    const mem = process.memoryUsage();
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const p50 = count > 0 ? sorted[Math.floor(count * 0.50)] : 0;
    const p90 = count > 0 ? sorted[Math.floor(count * 0.90)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;
    const avg = count > 0 ? Number((sorted.reduce((acc, curr) => acc + curr, 0) / count).toFixed(2)) : 0;

    const dbAvg = this.dbQueries > 0
      ? Number((this.dbTotalDurationMs / this.dbQueries).toFixed(2))
      : 0;

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      },
      requests: {
        total: this.totalRequests,
        active: this.activeRequests,
        byStatusClass: {
          '2xx': this.status2xx,
          '3xx': this.status3xx,
          '4xx': this.status4xx,
          '5xx': this.status5xx,
        },
      },
      latency: {
        p50Ms: Number(p50.toFixed(2)),
        p90Ms: Number(p90.toFixed(2)),
        p99Ms: Number(p99.toFixed(2)),
        avgMs: avg,
      },
      database: {
        totalQueries: this.dbQueries,
        failedQueries: this.dbFailures,
        avgLatencyMs: dbAvg,
        lastCheckedAt: this.dbLastChecked,
        status: this.dbStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  resetForTests(): void {
    this.totalRequests = 0;
    this.activeRequests = 0;
    this.status2xx = 0;
    this.status3xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.latencies = [];
    this.dbQueries = 0;
    this.dbFailures = 0;
    this.dbTotalDurationMs = 0;
    this.dbLastChecked = null;
    this.dbStatus = 'unconfigured';
  }
}

export const metricsCollector = new MetricsCollector();
