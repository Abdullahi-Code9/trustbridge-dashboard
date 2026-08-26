"use client";

import { useCallback, useRef, useState } from "react";

export interface JobProgressEvent {
  type: "status" | "processing" | "completed" | "failed" | "error";
  jobId?: string;
  status?: string;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  message?: string;
  createdAt?: string | null;
}

export interface UseJobProgress {
  /** Currently connected job ID, or null */
  activeJobId: string | null;
  /** Latest progress event */
  event: JobProgressEvent | null;
  /** Whether the SSE connection is open */
  isStreaming: boolean;
  /** Any connection or job error */
  error: string | null;
  /** Start streaming progress for a job */
  startProgress: (jobId: string) => void;
  /** Stop streaming */
  stopProgress: () => void;
}

/**
 * Hook that consumes SSE progress events for a background queue job.
 *
 * Usage:
 * `	sx
 * const { activeJobId, event, isStreaming, startProgress, stopProgress } = useJobProgress();
 * // After enqueuing a job:
 * startProgress(response.jobId);
 * `
 */
export function useJobProgress(): UseJobProgress {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [event, setEvent] = useState<JobProgressEvent | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopProgress = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startProgress = useCallback(
    (jobId: string) => {
      stopProgress();

      setActiveJobId(jobId);
      setEvent(null);
      setError(null);
      setIsStreaming(true);

      const url = "/api/contributors/queue/progress?jobId=" + encodeURIComponent(jobId);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data) as JobProgressEvent;
          setEvent(data);

          if (data.type === "completed" || data.type === "failed" || data.type === "error") {
            es.close();
            eventSourceRef.current = null;
            setIsStreaming(false);
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        setError("Connection lost. Refresh to retry.");
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      };
    },
    [stopProgress]
  );

  return {
    activeJobId,
    event,
    isStreaming,
    error,
    startProgress,
    stopProgress,
  };
}