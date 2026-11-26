import type { BusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import {
  hiddenBusinessIds,
  retentionDeadline,
} from "@aqui-suena/api/domain/directory/rules/retention";

export type BusinessVisibilityRepository = Pick<BusinessRepository, "listAllByAccount" | "update">;

export async function hideBusinessesOutsideSelection(
  businesses: BusinessVisibilityRepository,
  accountId: string,
  visibleBusinessIds: string[],
  now: Date,
): Promise<void> {
  const owned = await businesses.listAllByAccount(accountId);

  const toHide = hiddenBusinessIds(
    owned.map((business) => business.id),
    visibleBusinessIds,
  );

  const retainedUntil = retentionDeadline(now);

  for (const id of toHide) {
    await businesses.update(id, { hiddenAt: now, retainedUntil });
  }
}
