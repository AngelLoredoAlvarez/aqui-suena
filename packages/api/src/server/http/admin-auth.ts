const BEARER_PREFIX = "Bearer ";

// A missing or wrong token must look like a missing endpoint (404).
export function isAdminAuthorized(request: Request, adminToken: string | undefined): boolean {
  if (adminToken === undefined || adminToken === "") {
    return false;
  }

  return request.headers.get("authorization") === `${BEARER_PREFIX}${adminToken}`;
}
