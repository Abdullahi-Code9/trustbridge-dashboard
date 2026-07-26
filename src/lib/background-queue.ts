import "server-only";

export type JobType = "recheck.batch" | "recheck.single";

export interface Job {
  id: string;
  type: JobType;
  data: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: Record<string, unknown>;
}

interface QueueMetrics {
  totalJobs: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessingTimeMs: number;
}

class BackgroundQueue {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private processingCount = 0;
  private maxConcurrentJobs = 2;
  private jobHandlers: Map<JobType, (job: Job) => Promise<void>> = new Map();
  private completedJobs: Job[] = [];
  private maxCompletedJobsInMemory = 100;

  constructor() {
    this.startWorker();
  }

  registerHandler(
    type: JobType,
    handler: (job: Job) => Promise<void>
  ): void {
    this.jobHandlers.set(type, handler);
  }

  enqueue(type: JobType, data: Record<string, unknown>): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const job: Job = {
      id,
      type,
      data,
      status: "pending",
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    this.queue.push(id);

    return id;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getMetrics(): QueueMetrics {
    const jobs = Array.from(this.jobs.values());
    const pendingCount = jobs.filter((j) => j.status === "pending").length;
    const processingCount = jobs.filter(
      (j) => j.status === "processing"
    ).length;
    const completedCount = jobs.filter((j) => j.status === "completed").length;
    const failedCount = jobs.filter((j) => j.status === "failed").length;

    const processingTimes = jobs
      .filter((j) => j.startedAt && j.completedAt)
      .map(
        (j) =>
          (j.completedAt!.getTime() - j.startedAt!.getTime()) / 1000
      );

    const averageProcessingTimeMs =
      processingTimes.length > 0
        ? (processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) *
          1000
        : 0;

    return {
      totalJobs: jobs.length,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      averageProcessingTimeMs,
    };
  }

  private async startWorker(): Promise<void> {
    while (true) {
      try {
        if (
          this.processingCount < this.maxConcurrentJobs &&
          this.queue.length > 0
        ) {
          const jobId = this.queue.shift();
          if (jobId) {
            this.processingCount++;
            this.processJob(jobId).finally(() => {
              this.processingCount--;
            });
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Queue worker error:", error);
      }
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = "processing";
    job.startedAt = new Date();

    try {
      const handler = this.jobHandlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      await handler(job);

      job.status = "completed";
      job.completedAt = new Date();
      this.addCompletedJob(job);
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      console.error(`Job ${jobId} failed:`, job.error);
      this.addCompletedJob(job);
    }
  }

  private addCompletedJob(job: Job): void {
    this.completedJobs.push(job);
    if (this.completedJobs.length > this.maxCompletedJobsInMemory) {
      this.completedJobs.shift();
    }
  }
}

export const backgroundQueue = new BackgroundQueue();
