const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://flashback.example.com",
];

function getCors(request) {
  const origin = request.headers.get("Origin");
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
    "Vary": "Origin",
  };
}

function isAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key");
  return Boolean(key) && Boolean(env.ADMIN_KEY) && key === env.ADMIN_KEY;
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

    if (request.method === "GET" && url.pathname.startsWith("/list/")) {
      const prefix = decodeURIComponent(url.pathname.substring("/list/".length));
      const listed = await env.FLASHBACK_BUCKET.list({ prefix });
      const keys = listed.objects.map((o) => o.key);
      return new Response(JSON.stringify(keys), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT" && url.pathname.startsWith("/files/")) {
      if (!isAdmin(request, env)) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      const fileKey = decodeURIComponent(url.pathname.substring("/files/".length));
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      await env.FLASHBACK_BUCKET.put(fileKey, request.body, { httpMetadata: { contentType } });
      return new Response(JSON.stringify({ key: fileKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/files/")) {
      if (!isAdmin(request, env)) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      const fileKey = decodeURIComponent(url.pathname.substring("/files/".length));
      await env.FLASHBACK_BUCKET.delete(fileKey);
      return new Response(JSON.stringify({ deleted: fileKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/prefix/")) {
      if (!isAdmin(request, env)) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      const prefix = decodeURIComponent(url.pathname.substring("/prefix/".length));
      const listed = await env.FLASHBACK_BUCKET.list({ prefix });
      await Promise.all(listed.objects.map((o) => env.FLASHBACK_BUCKET.delete(o.key)));
      return new Response(JSON.stringify({ deleted: listed.objects.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};