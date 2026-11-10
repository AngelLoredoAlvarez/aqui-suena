import type {
  CreateServiceInput,
  Service,
  ServiceRepository,
  UpdateServiceInput,
} from "@aqui-suena/api/domain/directory/service";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  created_at: number;
  updated_at: number;
};

export class D1ServiceRepository implements ServiceRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Service[]> {
    const results = await this.db
      .prepare(
        `SELECT s.id, s.business_id, s.name, s.description, s.base_price, s.created_at, s.updated_at
         FROM services s
         JOIN businesses b ON b.id = s.business_id
         WHERE b.hidden_at IS NULL`,
      )
      .all();

    return results.results.map((row) => this.mapRow(row as ServiceRow));
  }

  async getById(id: string): Promise<Service | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, name, description, base_price, created_at, updated_at FROM services WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as ServiceRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Service[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, name, description, base_price, created_at, updated_at FROM services WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as ServiceRow));
  }

  async create(data: CreateServiceInput): Promise<Service> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        "INSERT INTO services (id, business_id, name, description, base_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, data.businessId, data.name, data.description, data.basePrice, now, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create service");
    }

    return this.mapRow({
      id,
      business_id: data.businessId,
      name: data.name,
      description: data.description,
      base_price: data.basePrice,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const now = new Date();
    const updated: Service = {
      ...current,
      name: input.name ?? current.name,
      description: input.description !== undefined ? input.description : current.description,
      basePrice: input.basePrice !== undefined ? input.basePrice : current.basePrice,
      updatedAt: now,
    };

    const result = await this.db
      .prepare(
        "UPDATE services SET name = ?, description = ?, base_price = ?, updated_at = ? WHERE id = ?",
      )
      .bind(updated.name, updated.description, updated.basePrice, toEpoch(now), id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update service");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM services WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: ServiceRow): Service {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      basePrice: row.base_price,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
