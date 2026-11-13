const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://flashback.example.com",
];

function getCors(request) {
  const origin = request.headers.get("Origin");
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCors(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/") {
      return new Response("Flashback R2 Worker is running!", { headers: corsHeaders });
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname.startsWith("/files/")
    ) {
      const fileKey = decodeURIComponent(url.pathname.substring("/files/".length));
      const object = await env.FLASHBACK_BUCKET.get(fileKey);

      if (!object) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=3600");

      if (fileKey.toLowerCase().endsWith(".swf")) {
        headers.set("Content-Type", "application/x-shockwave-flash");
      }

      return new Response(request.method === "HEAD" ? null : object.body, { headers });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};