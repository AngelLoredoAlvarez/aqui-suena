import { atom } from "jotai";

// Client-side global state (Jotai, from the T4 stack). Server state stays in
// TanStack Query; this atom holds the user's in-place station selection so the
// landing, player card and station sheet read and write the same value.
export const selectedStationIdAtom = atom("test-pop");
