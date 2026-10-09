import { fetchProxiedStream } from "@aqui-suena/api";

// Thin Next.js adapter over the shared proxy core: the browser calls our
// same-origin endpoint, the server fetches the mirror without hotlink
// headers. All policy lives in fetchProxiedStream (unit-tested).
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  return fetchProxiedStream(fetch, searchParams.get("url"));
}
