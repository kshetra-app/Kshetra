/**
 * Startup Profiler — Mobile Performance Telemetry
 * 
 * Instruments and benchmarks mobile cold and warm startup times.
 * Standard: Cold App Startup < 2.0s (2000ms), Warm App Startup < 500ms.
 */

export interface StartupMilestone {
  name: string;
  timestamp: number;
  deltaMs: number;
}

export interface StartupReport {
  bootType: 'cold' | 'warm';
  totalStartupMs: number;
  withinBudget: boolean;
  budgetMs: number;
  milestones: StartupMilestone[];
}

class StartupProfiler {
  private startTime: number = Date.now();
  private milestones: Map<string, number> = new Map();
  private bootType: 'cold' | 'warm' = 'cold';
  private coldBudgetMs: number = 2000; // < 2.0s statutory ceiling
  private warmBudgetMs: number = 500;  // < 500ms warm target

  constructor() {
    this.mark('engine_init');
  }

  public setBootType(type: 'cold' | 'warm'): void {
    this.bootType = type;
  }

  public mark(name: string): void {
    if (!this.milestones.has(name)) {
      this.milestones.set(name, Date.now());
    }
  }

  public getMilestone(name: string): number | undefined {
    return this.milestones.get(name);
  }

  public getDuration(fromMilestone: string, toMilestone: string): number {
    const t1 = this.milestones.get(fromMilestone) ?? this.startTime;
    const t2 = this.milestones.get(toMilestone) ?? Date.now();
    return Math.max(0, t2 - t1);
  }

  public getTotalStartupDuration(): number {
    const end = this.milestones.get('time_to_interactive') 
      ?? this.milestones.get('splash_hidden')
      ?? this.milestones.get('first_contentful_paint') 
      ?? Date.now();
    return Math.max(0, end - this.startTime);
  }

  public isWithinBudget(): boolean {
    const duration = this.getTotalStartupDuration();
    const budget = this.bootType === 'cold' ? this.coldBudgetMs : this.warmBudgetMs;
    return duration <= budget;
  }

  public getReport(): StartupReport {
    const budget = this.bootType === 'cold' ? this.coldBudgetMs : this.warmBudgetMs;
    const totalStartupMs = this.getTotalStartupDuration();
    const milestoneList: StartupMilestone[] = [];

    let prevTime = this.startTime;
    for (const [name, ts] of this.milestones.entries()) {
      milestoneList.push({
        name,
        timestamp: ts,
        deltaMs: ts - prevTime,
      });
      prevTime = ts;
    }

    return {
      bootType: this.bootType,
      totalStartupMs,
      withinBudget: totalStartupMs <= budget,
      budgetMs: budget,
      milestones: milestoneList,
    };
  }

  public reset(type: 'cold' | 'warm' = 'warm'): void {
    this.bootType = type;
    this.startTime = Date.now();
    this.milestones.clear();
    this.mark(type === 'cold' ? 'engine_init' : 'warm_resume');
  }
}

export const startupProfiler = new StartupProfiler();
