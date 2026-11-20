const BEARER_PREFIX = "Bearer ";

// A missing or wrong token must look like a missing endpoint (404).
export function isAdminAuthorized(request: Request, adminToken: string | undefined): boolean {
  if (adminToken === undefined || adminToken === "") {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === null || !authorization.startsWith(BEARER_PREFIX)) {
    return false;
  }

  return timingSafeEqual(authorization.slice(BEARER_PREFIX.length), adminToken);
}

// Compare without early exit so the runtime does not leak how many characters matched.
function timingSafeEqual(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < provided.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return difference === 0;
}
