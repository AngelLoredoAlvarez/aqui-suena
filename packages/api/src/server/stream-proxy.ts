// Server-side stream proxy core: fetch a temporary mirror without the
// browser's hotlink-triggering headers (no Referer is sent by server fetch),
// then hand the bytes back same-origin. Host allowlist keeps this from
// becoming an open proxy. Pure in its inputs: the fetch implementation is
// injected so tests never touch the network.

const ALLOWED_STREAM_HOSTS: readonly string[] = [
  "ice1.somafm.com",
  "ice2.somafm.com",
  "ice3.somafm.com",
];

export async function fetchProxiedStream(
  upstreamFetch: typeof fetch,
  target: string | null,
): Promise<Response> {
  if (!target) {
    return new Response("missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("bad url", { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_STREAM_HOSTS.includes(parsed.hostname)) {
    return new Response("forbidden host", { status: 403 });
  }

  const upstream = await upstreamFetch(target);
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream failed", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "accept-ranges": "bytes",
      "cache-control": "no-store",
    },
  });
}
