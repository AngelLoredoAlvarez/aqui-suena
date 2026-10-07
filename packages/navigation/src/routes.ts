// Shared cross-platform route contracts for Aqui Suena.
//
// Solito is the only cross-platform navigation API in shared code:
// navigate with `useRouter` from "solito/router" or `Link` from
// "solito/link" using the constants and helpers below.
// Never import "next/link" in shared code.

export const PLAYER_ROUTE = "/player" as const;

export const PLAYER_STATION_ROUTE = "/player/[stationId]" as const;

export type PlayerParams = {
  stationId: string;
};

// Concrete path for links and deep links.
export function playerPath(stationId?: string): string {
  if (!stationId) {
    return PLAYER_ROUTE;
  }
  return `/player/${encodeURIComponent(stationId)}`;
}

// Next-style URL object accepted by Solito `router.push` / `router.replace`.
export function playerRouteFor(stationId?: string):
  | { readonly pathname: typeof PLAYER_ROUTE }
  | {
      readonly pathname: typeof PLAYER_STATION_ROUTE;
      readonly query: { readonly stationId: string };
    } {
  if (!stationId) {
    return { pathname: PLAYER_ROUTE };
  }
  return { pathname: PLAYER_STATION_ROUTE, query: { stationId } };
}
