# Capability Map: Aquí Suena (by 17Labs)

Product: Aquí Suena — listen and discover shops. Developed and operated by 17Labs.

| Module id          | Responsibility                                                                                           | Depends on                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| radio-playback     | Persistent audible player with autoplay, top/bottom position, 403 fallback; never disappears             | —                                               |
| business-directory | Listings: name, category, products + prices, photos, phone, email, address, hours, open/closed, delivery | —                                               |
| memberships        | Free vs monthly entitlements (listing limits, photos, priority, spot eligibility)                        | business-directory                              |
| owner-portal       | Owner platform to create/edit listings, hours, photos, products; paywall-gated                           | business-directory, memberships                 |
| ads-display        | Carousel of sponsors during listening, paid priority, tap → listing sheet; audio never stops             | radio-playback, business-directory, memberships |
| radio-spots        | Recorded spots rotated every X songs for monthly members (v1); live mention is post-V1                   | radio-playback, memberships                     |
| radio-origin       | Own station from scratch (post-V1)                                                                       | radio-playback                                  |

Build order: radio-playback → business-directory → memberships → owner-portal → ads-display → radio-spots → radio-origin (future)

Shared stack: React + Next.js + React Native + React Native Web + Expo + Solito (navigation) + Tamagui (components + styling) + tRPC + TanStack Query + Drizzle + PostgreSQL + Biome (lint + format, replaces ESLint/Prettier)
