import { generateOpenAPISpec, validateOpenAPISpec } from "@/lib/openapi-spec";

/**
 * GET /api/openapi.json
 *
 * Returns the OpenAPI 3.0.0 specification for the TrustBridge Dashboard API.
 * Can be used with Swagger UI or other API documentation tools.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const spec = generateOpenAPISpec(baseUrl);
  const validation = validateOpenAPISpec(spec);

  if (!validation.valid) {
    return Response.json(
      {
        error: "OpenAPI spec generation failed",
        details: validation.errors,
      },
      { status: 500 }
    );
  }

  return Response.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
