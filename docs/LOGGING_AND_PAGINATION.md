# Structured Logging and Pagination

This document describes the structured logging system and pagination features in TrustBridge Dashboard.

## Structured Logging

### Overview

The dashboard includes a structured logging system (`src/lib/logger.ts`) for debugging, monitoring, and observability. All logs are emitted as JSON to stdout, making them suitable for ingestion into centralized logging platforms (CloudWatch, Datadog, ELK, etc.).

### Log Format

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "context": "api.contributors",
  "message": "incoming_request",
  "details": {
    "method": "GET",
    "pathname": "/api/contributors",
    "userAgent": "Mozilla/5.0...",
    "origin": "http://localhost:3000"
  }
}
```

**Fields:**
- `timestamp` — ISO 8601 timestamp
- `level` — Log level: `info`, `warn`, `error`, or `debug`
- `context` — Module or feature identifier (e.g., `api.contributors`, `horizon`, `database`)
- `message` — Human-readable message or event type
- `details` — Optional structured data (operation, duration, error details, etc.)

### Usage

#### Creating a logger

```typescript
import { StructuredLogger } from "@/lib/logger";

const logger = new StructuredLogger("api.contributors");
```

#### Logging events

```typescript
// Info level
logger.info("batch_recheck_started", {
  count: 42,
  initiatedBy: "user@example.com",
});

// Warn level
logger.warn("high_latency_detected", {
  endpoint: "horizon.stellar.org",
  responseTime: "2500ms",
  threshold: "2000ms",
});

// Error level
logger.error("horizon_circuit_breaker_open", {
  failureCount: 5,
  recoveryAt: "2025-01-15T10:35:45.123Z",
});

// Debug level (only logged when DEBUG=true)
logger.debug("cache_hit", {
  key: "horizon_GBRPYH...",
  age: "125ms",
});
```

#### Request logging

```typescript
import { createRequestLogger } from "@/lib/logger";

const logRequest = createRequestLogger("api.check");

export async function POST(request: NextRequest) {
  logRequest(request); // Logs incoming request
  // Handle request...
}
```

#### Response logging

```typescript
import { StructuredLogger, logResponse } from "@/lib/logger";

const logger = new StructuredLogger("api.contributors");

export async function GET() {
  const start = Date.now();
  const contributors = await getContributors();
  const duration = Date.now() - start;

  const response = NextResponse.json({ contributors });
  logResponse(logger, response, duration, { count: contributors.length });

  return response;
}
```

### Enabling debug logging

Set the `DEBUG` environment variable to enable debug-level logs:

```bash
DEBUG=true npm run dev
```

### Log aggregation

For production deployments, configure your logging platform to ingest structured JSON logs:

**CloudWatch (AWS):**

```
[ip, id, user_id, timestamp, request_id, event_type = "api", log_level, context, message, details = {}]
```

**Datadog:**

```typescript
const logger = new StructuredLogger("trustbridge.dashboard");
// Datadog automatically ingests JSON logs from stdout
```

**ELK Stack:**

```yaml
input {
  stdin {}
}

filter {
  json {
    source => "message"
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "trustbridge-%{+YYYY.MM.dd}"
  }
}
```

---

## Pagination and Infinite Scroll

### Overview

The dashboard supports cursor-based pagination for efficient handling of large contributor lists (100+ contributors). The `/api/contributors/paginated` endpoint provides pagination, and the `useInfiniteContributors()` React Query hook enables infinite scroll UIs.

### Cursor-based pagination

**Why cursor-based?**
- Offset-based pagination breaks when items are added/deleted during pagination (offset skips or duplicates items)
- Cursor-based pagination is stable — the cursor points to the last seen item, and the next page starts after that item
- More efficient for large datasets

### API Endpoint

**GET `/api/contributors/paginated`**

Query parameters:
- `limit` — Number of items per page (default: 25, max: 100)
- `cursor` — Cursor from previous page's `nextCursor` (optional)

**Response:**

```json
{
  "contributors": [
    {
      "id": "contrib-1",
      "githubUsername": "alice",
      "stellarAddress": "GBRPYHIL...",
      "verified": true,
      "readiness": "ready",
      "lastCheckedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true,
  "nextCursor": "contrib-25"
}
```

**Fields:**
- `contributors` — Array of contributor rows
- `total` — Total number of contributors in database
- `hasMore` — Whether more pages are available
- `nextCursor` — Cursor for the next page (if `hasMore` is true)

### React Query hook

**Basic usage:**

```typescript
import { useInfiniteContributors, flattenContributorPages } from "@/lib/use-infinite-contributors";

export function ContributorList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteContributors();

  const allContributors = flattenContributorPages(data);

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      <ul>
        {allContributors.map((contributor) => (
          <li key={contributor.id}>{contributor.githubUsername}</li>
        ))}
      </ul>
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
```

**Infinite scroll (load more on scroll):**

```typescript
import { useEffect, useRef, useCallback } from "react";
import { useInfiniteContributors, flattenContributorPages } from "@/lib/use-infinite-contributors";

export function InfiniteContributorScroll() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteContributors();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch next page when observer target becomes visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allContributors = flattenContributorPages(data);

  return (
    <div>
      {allContributors.map((contributor) => (
        <div key={contributor.id}>{contributor.githubUsername}</div>
      ))}
      <div ref={observerTarget} className="h-10" />
      {isFetchingNextPage && <div>Loading more...</div>}
    </div>
  );
}
```

### Performance considerations

- **Default page size:** 25 items. Adjust via the `limit` query parameter.
- **Caching:** React Query caches fetched pages by default. Pages are re-fetched after `staleTime` (default: 0 — always stale for real-time data).
- **Cursor lifetime:** Cursors are stable as long as items aren't deleted. Deleting items invalidates cursors; filter/sort changes require a fresh query.

### Migration from offset-based pagination

If you have existing offset-based pagination, migrate by:

1. Replace query with `useInfiniteContributors()`
2. Change pagination controls from "page N" to "Load more" button / infinite scroll
3. Update backend if needed to support cursor-based pagination

The `/api/contributors/paginated` endpoint is new and coexists with the existing `/api/contributors` (non-paginated list). Gradually migrate consumers.
