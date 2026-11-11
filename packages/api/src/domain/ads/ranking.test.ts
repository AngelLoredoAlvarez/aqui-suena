import { rankSponsors, selectCarouselSlots } from "@aqui-suena/api/domain/ads/ranking";
import { describe, expect, it } from "vitest";

describe("rankSponsors", () => {
  it("orders sponsors by plan priority descending", () => {
    const input = [
      { id: "a", priority: 0, updatedAt: 10 },
      { id: "b", priority: 20, updatedAt: 5 },
      { id: "c", priority: 10, updatedAt: 7 },
    ];
    const result = rankSponsors(input);

    expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("uses recency as tie-breaker within the same priority", () => {
    const input = [
      { id: "a", priority: 10, updatedAt: 5 },
      { id: "b", priority: 10, updatedAt: 9 },
      { id: "c", priority: 10, updatedAt: 7 },
    ];
    const result = rankSponsors(input);

    expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("excludes ineligible sponsors", () => {
    const input = [
      { id: "a", priority: 20, updatedAt: 5, eligible: false },
      { id: "b", priority: 10, updatedAt: 9, eligible: true },
    ];
    const result = rankSponsors(input);

    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("treats missing eligible as eligible", () => {
    const input = [{ id: "a", priority: 0, updatedAt: 1 }];
    const result = rankSponsors(input);

    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { id: "a", priority: 0, updatedAt: 1 },
      { id: "b", priority: 20, updatedAt: 2 },
    ];
    const snapshot = input.map((s) => s.id);

    rankSponsors(input);

    expect(input.map((s) => s.id)).toEqual(snapshot);
  });

  it("is deterministic for identical input", () => {
    const input = [
      { id: "a", priority: 10, updatedAt: 5 },
      { id: "b", priority: 10, updatedAt: 5 },
    ];
    const first = rankSponsors(input).map((s) => s.id);
    const second = rankSponsors(input).map((s) => s.id);

    expect(first).toEqual(second);
  });
});

describe("selectCarouselSlots", () => {
  it("returns one slot for a single eligible sponsor", () => {
    expect(selectCarouselSlots([{ id: "a", priority: 0, updatedAt: 1, appearances: 1 }])).toEqual([
      "a",
    ]);
  });

  it("returns empty when there are no eligible sponsors", () => {
    expect(
      selectCarouselSlots([
        { id: "a", priority: 0, updatedAt: 1, appearances: 1, eligible: false },
      ]),
    ).toEqual([]);
  });

  it("treats missing eligible as eligible", () => {
    expect(selectCarouselSlots([{ id: "a", priority: 0, updatedAt: 1, appearances: 1 }])).toEqual([
      "a",
    ]);
  });

  it("interleaves to avoid consecutive repeats", () => {
    const slots = selectCarouselSlots([
      { id: "trades", priority: 10, updatedAt: 1, appearances: 2 },
      { id: "community", priority: 0, updatedAt: 2, appearances: 1 },
    ]);

    expect(slots).toEqual(["trades", "community", "trades"]);
  });

  it("produces the right total number of slots", () => {
    const slots = selectCarouselSlots([
      { id: "commerce", priority: 20, updatedAt: 1, appearances: 3 },
      { id: "trades", priority: 10, updatedAt: 2, appearances: 2 },
      { id: "community", priority: 0, updatedAt: 3, appearances: 1 },
    ]);

    expect(slots).toHaveLength(6);
  });

  it("never places the same sponsor in consecutive slots", () => {
    const slots = selectCarouselSlots([
      { id: "commerce", priority: 20, updatedAt: 1, appearances: 3 },
      { id: "trades", priority: 10, updatedAt: 2, appearances: 2 },
      { id: "community", priority: 0, updatedAt: 3, appearances: 1 },
    ]);

    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]).not.toBe(slots[i - 1]);
    }
  });

  it("does not mutate the input array", () => {
    const input = [
      { id: "a", priority: 0, updatedAt: 1, appearances: 2 },
      { id: "b", priority: 10, updatedAt: 2, appearances: 1 },
    ];

    const snapshot = input.map((s) => s.id);

    selectCarouselSlots(input);

    expect(input.map((s) => s.id)).toEqual(snapshot);
  });

  it("is deterministic for identical input", () => {
    const input = [
      { id: "a", priority: 10, updatedAt: 5, appearances: 2 },
      { id: "b", priority: 10, updatedAt: 5, appearances: 1 },
    ];

    const first = selectCarouselSlots(input);

    const second = selectCarouselSlots(input);

    expect(first).toEqual(second);
  });
});
