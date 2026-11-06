const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Worker status
    if (url.pathname === "/") {
      return new Response("Flashback R2 Worker is running!", {
        headers: corsHeaders,
      });
    }

    // Get file from R2
    if (request.method === "GET" && url.pathname.startsWith("/files/")) {
      const fileKey = decodeURIComponent(
        url.pathname.substring("/files/".length)
      );

      const object = await env.FLASHBACK_BUCKET.get(fileKey);

      if (!object) {
        return new Response("File not found", {
          status: 404,
          headers: corsHeaders,
        });
      }

      const headers = new Headers(corsHeaders);

      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=3600");

      return new Response(object.body, {
        headers,
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};