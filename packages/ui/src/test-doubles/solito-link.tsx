import type { ReactNode } from "react";

// Test double for solito/link: the real module pulls react-native (Flow
// source Vite cannot parse) and the Next router, neither of which exists
// in jsdom. What is ours — the href we pass — is asserted through this
// anchor. Solito's own rendering is Solito's tested code; deep-link
// navigation belongs to headed e2e (Task 8).
export function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href}>{children}</a>;
}
