import type {
  Business,
  BusinessRepository,
  CreateBusinessInput,
  ListBusinessesInput,
  UpdateBusinessInput,
} from "@aqui-suena/api/domain/directory/business";
import { parseBusinessCategory } from "@aqui-suena/api/domain/directory/contracts/listing";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { decodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import type { CursorPage } from "@aqui-suena/api/shared/pagination/page";
import { paginateCursor } from "@aqui-suena/api/shared/pagination/page";

type BusinessRow = {
  id: string;
  account_id: string;
  name: string;
  category: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  delivery: number;
  hidden_at: number | null;
  retained_until: number | null;
  created_at: number;
  updated_at: number;
};

export class D1BusinessRepository implements BusinessRepository {
  constructor(private readonly db: D1Database) {}

  async list(input: ListBusinessesInput): Promise<CursorPage<Business>> {
    const point = input.cursor === null ? null : decodeCursor(input.cursor);

    const base =
      "SELECT id, account_id, name, category, phone, email, address, timezone, delivery, hidden_at, retained_until, created_at, updated_at FROM businesses WHERE hidden_at IS NULL";

    const sql =
      point === null
        ? `${base} ORDER BY created_at, id LIMIT ?`
        : `${base} AND (created_at, id) > (?, ?) ORDER BY created_at, id LIMIT ?`;

    const limitPlusOne = input.limit + 1;

    const statement = this.db.prepare(sql);

    const result =
      point === null
        ? await statement.bind(limitPlusOne).all()
        : await statement.bind(point.createdAt, point.id, limitPlusOne).all();

    const businesses = result.results.map((row) => this.mapRow(row as BusinessRow));

    return paginateCursor(businesses, input.limit, (business) => ({
      createdAt: toEpoch(business.createdAt),
      id: business.id,
    }));
  }

  async listVisible(): Promise<Business[]> {
    const result = await this.db
      .prepare(
        "SELECT id, account_id, name, category, phone, email, address, timezone, delivery, hidden_at, retained_until, created_at, updated_at FROM businesses WHERE hidden_at IS NULL",
      )
      .all();

    return result.results.map((row) => this.mapRow(row as BusinessRow));
  }

  async getById(id: string): Promise<Business | null> {
    const row = await this.db
      .prepare(
        "SELECT id, account_id, name, category, phone, email, address, timezone, delivery, hidden_at, retained_until, created_at, updated_at FROM businesses WHERE id = ? AND hidden_at IS NULL",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as BusinessRow) : null;
  }

  async getByIdForOwner(id: string): Promise<Business | null> {
    const row = await this.db
      .prepare(
        "SELECT id, account_id, name, category, phone, email, address, timezone, delivery, hidden_at, retained_until, created_at, updated_at FROM businesses WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as BusinessRow) : null;
  }

  async listByAccount(accountId: string): Promise<Business[]> {
    const result = await this.db
      .prepare(
        "SELECT id, account_id, name, category, phone, email, address, timezone, delivery, hidden_at, retained_until, created_at, updated_at FROM businesses WHERE account_id = ?",
      )
      .bind(accountId)
      .all();

    return result.results.map((row) => this.mapRow(row as BusinessRow));
  }

  async create(input: CreateBusinessInput): Promise<Business> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        `
      INSERT INTO businesses (
        id,
        account_id,
        name,
        category,
        phone,
        email,
        address,
        timezone,
        delivery,
        hidden_at,
        retained_until,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        id,
        input.accountId,
        input.name,
        input.category,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.timezone,
        input.delivery ? 1 : 0,
        null,
        null,
        now,
        now,
      )
      .run();

    if (!result.success) {
      throw new Error("Failed to create business");
    }

    return this.mapRow({
      id,
      account_id: input.accountId,
      name: input.name,
      category: input.category,
      phone: input.phone,
      email: input.email,
      address: input.address,
      timezone: input.timezone,
      delivery: input.delivery ? 1 : 0,
      hidden_at: null,
      retained_until: null,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateBusinessInput): Promise<Business | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const now = new Date();
    const updated: Business = {
      ...current,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      phone: input.phone !== undefined ? input.phone : current.phone,
      email: input.email !== undefined ? input.email : current.email,
      address: input.address !== undefined ? input.address : current.address,
      timezone: input.timezone ?? current.timezone,
      delivery: input.delivery ?? current.delivery,
      hiddenAt: input.hiddenAt ?? current.hiddenAt,
      retainedUntil: input.retainedUntil ?? current.retainedUntil,
      updatedAt: now,
    };

    const result = await this.db
      .prepare(
        `UPDATE businesses
         SET name = ?, category = ?, phone = ?, email = ?, address = ?,
             timezone = ?, delivery = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        updated.name,
        updated.category,
        updated.phone,
        updated.email,
        updated.address,
        updated.timezone,
        updated.delivery ? 1 : 0,
        toEpoch(now),
        id,
      )
      .run();

    if (!result.success) {
      throw new Error("Failed to update business");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM businesses WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM businesses WHERE retained_until IS NOT NULL AND retained_until <= ?")
      .bind(toEpoch(now))
      .run();

    return result.success ? (result.meta?.changes ?? 0) : 0;
  }

  private mapRow(row: BusinessRow): Business {
    return {
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      category: parseBusinessCategory(row.category),
      phone: row.phone,
      email: row.email,
      address: row.address,
      timezone: row.timezone,
      delivery: row.delivery === 1,
      hiddenAt: fromEpoch(row.hidden_at),
      retainedUntil: fromEpoch(row.retained_until),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
