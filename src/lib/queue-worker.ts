import "server-only";

import { backgroundQueue, type Job } from "@/lib/background-queue";
import {
  getContributors,
  refreshAllContributors,
  refreshContributor,
} from "@/lib/registrations";

backgroundQueue.registerHandler("recheck.batch", async (job: Job) => {
  const startTime = Date.now();

  try {
    const refreshed = await refreshAllContributors();
    const contributors = await getContributors();

    job.result = {
      refreshed,
      contributorCount: contributors.length,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
});

backgroundQueue.registerHandler("recheck.single", async (job: Job) => {
  const startTime = Date.now();
  const { contributorId } = job.data;

  if (!contributorId || typeof contributorId !== "string") {
    throw new Error("contributorId is required and must be a string");
  }

  try {
    const contributor = await refreshContributor(contributorId);

    if (!contributor) {
      throw new Error(`Contributor ${contributorId} not found`);
    }

    job.result = {
      contributorId,
      githubUsername: contributor.githubUsername,
      readiness: contributor.readiness,
      verified: contributor.verified,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
});

export { backgroundQueue };
