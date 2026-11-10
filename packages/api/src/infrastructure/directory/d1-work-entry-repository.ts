import type {
  CreateWorkEntryInput,
  UpdateWorkEntryInput,
  WorkEntry,
  WorkEntryRepository,
} from "@aqui-suena/api/domain/directory/work-entry";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type WorkEntryRow = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

export class D1WorkEntryRepository implements WorkEntryRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<WorkEntry[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, title, description, created_at, updated_at FROM work_entries",
      )
      .all();

    return results.results.map((row) => this.mapRow(row as WorkEntryRow));
  }

  async getById(id: string): Promise<WorkEntry | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, title, description, created_at, updated_at FROM work_entries WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as WorkEntryRow) : null;
  }

  async listByBusiness(businessId: string): Promise<WorkEntry[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, title, description, created_at, updated_at FROM work_entries WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as WorkEntryRow));
  }

  async create(input: CreateWorkEntryInput): Promise<WorkEntry> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        "INSERT INTO work_entries (id, business_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, input.businessId, input.title, input.description, now, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create work entry");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      title: input.title,
      description: input.description,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateWorkEntryInput): Promise<WorkEntry | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const now = new Date();
    const updated: WorkEntry = {
      ...current,
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      updatedAt: now,
    };

    const result = await this.db
      .prepare("UPDATE work_entries SET title = ?, description = ?, updated_at = ? WHERE id = ?")
      .bind(updated.title, updated.description, toEpoch(now), id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update work entry");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM work_entries WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: WorkEntryRow): WorkEntry {
    return {
      id: row.id,
      businessId: row.business_id,
      title: row.title,
      description: row.description,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
