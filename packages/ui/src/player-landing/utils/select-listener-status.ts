import type { ListenerStatus } from "@aqui-suena/api/client";
import { match, P } from "ts-pattern";

// Normalizes a TanStack Query result into a discriminated union so callers
// branch on {status} exhaustively instead of ad-hoc data/error checks. This
// is the ts-pattern data-fetching-state pattern from the T4 stack.
export type ListenerStatusState =
  | { status: "pending" }
  | { status: "error" }
  | { status: "success"; data: ListenerStatus };

export function selectListenerStatus(query: {
  status: "pending" | "error" | "success";
  data: ListenerStatus | undefined;
}): ListenerStatusState {
  return match(query)
    .with({ status: "success", data: P.nonNullable }, ({ data }) => ({
      status: "success" as const,
      data,
    }))
    .with({ status: "error" }, () => ({ status: "error" as const }))
    .otherwise(() => ({ status: "pending" as const }));
}
