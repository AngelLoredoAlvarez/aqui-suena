// Shared cross-platform route contracts for Aqui Suena.
//
// Product decision: the player switches stations in place on the landing.
// There are deliberately NO player routes and no station screens, so this
// module currently defines no contracts. It stays as the home for future
// modules' route contracts (e.g. business-directory deep links).
//
// When routes exist, Solito is the cross-platform navigation API in shared
// code. Never import the Next.js Link component in shared code.
export {};
