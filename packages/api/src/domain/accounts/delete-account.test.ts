import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import type { PaymentCustomerDeleter } from "@aqui-suena/api/domain/accounts/payment-customer-deleter";
import type { UserDirectory } from "@aqui-suena/api/domain/accounts/user-directory";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { Media } from "@aqui-suena/api/domain/media/media";
import { InMemoryMediaRepository } from "@aqui-suena/api/domain/media/media";
import { InMemoryObjectStorage, type ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const account: Account = {
  id: "acc-1",
  email: "owner@example.com",
  planId: "community",
  locale: "es-MX",
  savedCard: {
    customerId: "cus-1",
    sourceId: "src-1",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 30,
  },
};

function makeMedia(id: string): Media {
  return {
    id,
    ownerId: "acc-1",
    businessId: null,
    kind: "avatar",
    r2Key: `avatar/acc-1/${id}`,
    mime: "image/png",
    size: 70,
    createdAt: new Date("2026-01-01"),
  };
}

function makeBusiness(id: string, accountId = "acc-1"): Business {
  return {
    id,
    accountId,
    name: `Business ${id}`,
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "UTC",
    delivery: false,
    hiddenAt: null,
    retainedUntil: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function failingStorage(): ObjectStorage {
  return {
    presignUpload: async () => ({ key: "k", uploadUrl: "https://example.test/k" }),
    head: async () => null,
    delete: async () => {
      throw new Error("R2 down");
    },
  };
}

function usersThatDelete(): UserDirectory & { calls: number } {
  const directory = {
    calls: 0,
    deleteUser: async () => {
      directory.calls += 1;
    },
  };

  return directory;
}

function setup(
  overrides: {
    users?: UserDirectory;
    storage?: ObjectStorage;
    paymentCustomers?: PaymentCustomerDeleter;
    onPaymentCustomerError?: (error: unknown, customerId: string) => void;
  } = {},
) {
  const accounts = new InMemoryAccountRepository([{ ...account }]);
  const businesses = new InMemoryBusinessRepository([
    makeBusiness("b1"),
    makeBusiness("b2"),
    makeBusiness("foreign", "acc-2"),
  ]);
  const media = new InMemoryMediaRepository([makeMedia("m1"), makeMedia("m2")]);
  const users = overrides.users ?? usersThatDelete();
  const storage = overrides.storage ?? new InMemoryObjectStorage();

  const deleteAccount = new DeleteAccount({
    accounts,
    businesses,
    media,
    storage,
    users,
    paymentCustomers: overrides.paymentCustomers,
    onPaymentCustomerError: overrides.onPaymentCustomerError,
  });

  return { accounts, businesses, media, users, deleteAccount };
}

describe("DeleteAccount", () => {
  it("purges media and businesses and anonymizes the account", async () => {
    const { accounts, businesses, media, deleteAccount } = setup();

    await deleteAccount.execute("acc-1");

    expect(await media.listByOwner({ ownerId: "acc-1", limit: 10, offset: 0 })).toMatchObject({
      items: [],
    });
    expect(await businesses.getById("b1")).toBeNull();
    expect(await businesses.getById("b2")).toBeNull();
    expect(await businesses.getById("foreign")).not.toBeNull();

    const anonymized = await accounts.getById("acc-1");

    expect(anonymized?.email).toBe("deleted-acc-1@deleted.invalid");
    expect(anonymized?.deletedAt).toBeInstanceOf(Date);
  });

  it("deletes the Conekta customer before anonymizing", async () => {
    const calls: string[] = [];
    const paymentCustomers: PaymentCustomerDeleter = {
      deleteCustomer: async (id) => {
        calls.push(id);
      },
    };

    const { accounts, deleteAccount } = setup({ paymentCustomers });

    await deleteAccount.execute("acc-1");

    expect(calls).toEqual(["cus-1"]);
    expect((await accounts.getById("acc-1"))?.savedCard).toBeUndefined();
  });

  it("anonymizes even when the Conekta customer deletion fails", async () => {
    const errors: string[] = [];
    const paymentCustomers: PaymentCustomerDeleter = {
      deleteCustomer: async () => {
        throw new Error("conekta down");
      },
    };

    const { accounts, deleteAccount } = setup({
      paymentCustomers,
      onPaymentCustomerError: (_error, customerId) => errors.push(customerId),
    });

    await deleteAccount.execute("acc-1");

    expect(errors).toEqual(["cus-1"]);
    expect((await accounts.getById("acc-1"))?.deletedAt).toBeInstanceOf(Date);
  });

  it("fails closed when the login cannot be deleted", async () => {
    const users: UserDirectory = {
      deleteUser: async () => {
        throw new Error("supabase down");
      },
    };

    const { accounts, businesses, media, deleteAccount } = setup({ users });

    await expect(deleteAccount.execute("acc-1")).rejects.toThrow("supabase down");

    expect((await accounts.getById("acc-1"))?.email).toBe("owner@example.com");
    expect((await accounts.getById("acc-1"))?.deletedAt).toBeUndefined();
    expect(await businesses.getById("b1")).not.toBeNull();
    expect(
      (await media.listByOwner({ ownerId: "acc-1", limit: 10, offset: 0 })).items,
    ).toHaveLength(2);
  });

  it("keeps the media row when its object cannot be deleted", async () => {
    const { accounts, media, deleteAccount } = setup({ storage: failingStorage() });

    await expect(deleteAccount.execute("acc-1")).rejects.toThrow("R2 down");

    expect(
      (await media.listByOwner({ ownerId: "acc-1", limit: 10, offset: 0 })).items,
    ).toHaveLength(2);
    expect((await accounts.getById("acc-1"))?.deletedAt).toBeUndefined();
  });

  it("is a no-op for an account that is already deleted", async () => {
    const users = usersThatDelete();

    const { accounts, deleteAccount } = setup({ users });

    await deleteAccount.execute("acc-1");

    const firstDeletion = (await accounts.getById("acc-1"))?.deletedAt;

    await deleteAccount.execute("acc-1");

    expect((await accounts.getById("acc-1"))?.deletedAt).toEqual(firstDeletion);
    expect(users.calls).toBe(1);
  });

  it("throws NotFoundError for an unknown account", async () => {
    const { deleteAccount } = setup();

    await expect(deleteAccount.execute("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
