import EventEmitter from 'events';

export interface Activity {
  id: string;
  type: 'scan' | 'identify' | 'download' | 'import';
  status: 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  progress?: number; // 0-100
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

class ActivityManager extends EventEmitter {
  private activities: Map<string, Activity> = new Map();
  private maxHistory = 50; // Keep last 50 activities

  /**
   * Start a new activity
   */
  start(
    id: string,
    type: Activity['type'],
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): Activity {
    const activity: Activity = {
      id,
      type,
      status: 'running',
      title,
      description,
      progress: 0,
      startedAt: new Date(),
      metadata,
    };

    this.activities.set(id, activity);
    this.emit('activity:started', activity);
    this.cleanup();

    console.log(`🔄 Activity started: ${title}`);
    return activity;
  }

  /**
   * Update activity progress
   */
  updateProgress(id: string, progress: number, description?: string): void {
    const activity = this.activities.get(id);
    if (!activity) return;

    activity.progress = Math.min(100, Math.max(0, progress));
    if (description) {
      activity.description = description;
    }

    this.activities.set(id, activity);
    this.emit('activity:progress', activity);
  }

  /**
   * Complete an activity
   */
  complete(id: string, description?: string): void {
    const activity = this.activities.get(id);
    if (!activity) return;

    activity.status = 'completed';
    activity.progress = 100;
    activity.completedAt = new Date();
    if (description) {
      activity.description = description;
    }

    this.activities.set(id, activity);
    this.emit('activity:completed', activity);

    const duration = activity.completedAt.getTime() - activity.startedAt.getTime();
    console.log(`✅ Activity completed: ${activity.title} (${duration}ms)`);
  }

  /**
   * Fail an activity
   */
  fail(id: string, error: string): void {
    const activity = this.activities.get(id);
    if (!activity) return;

    activity.status = 'error';
    activity.error = error;
    activity.completedAt = new Date();

    this.activities.set(id, activity);
    this.emit('activity:failed', activity);

    console.error(`❌ Activity failed: ${activity.title} - ${error}`);
  }

  /**
   * Get all activities
   */
  getAll(): Activity[] {
    return Array.from(this.activities.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  /**
   * Get active (running) activities
   */
  getActive(): Activity[] {
    return this.getAll().filter((a) => a.status === 'running');
  }

  /**
   * Get recent activities (completed or failed)
   */
  getRecent(limit = 10): Activity[] {
    return this.getAll()
      .filter((a) => a.status !== 'running')
      .slice(0, limit);
  }

  /**
   * Get specific activity
   */
  get(id: string): Activity | undefined {
    return this.activities.get(id);
  }

  /**
   * Clear old activities to prevent memory leak
   */
  private cleanup(): void {
    const all = this.getAll();
    if (all.length > this.maxHistory) {
      // Remove oldest completed/failed activities
      const toRemove = all
        .filter((a) => a.status !== 'running')
        .slice(this.maxHistory);

      toRemove.forEach((a) => this.activities.delete(a.id));
    }
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities.clear();
    this.emit('activities:cleared');
  }
}

// Singleton instance
let activityManager: ActivityManager | null = null;

export function getActivityManager(): ActivityManager {
  if (!activityManager) {
    activityManager = new ActivityManager();
  }
  return activityManager;
}
