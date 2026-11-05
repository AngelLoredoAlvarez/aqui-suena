import type {
  CreateProductInput,
  Product,
  ProductRepository,
  UpdateProductInput,
} from "@aqui-suena/api/domain/directory/product";
import { toEpoch } from "@aqui-suena/api/infrastructure/shared/d1-epoch";

type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: number;
};

export class D1ProductRepository implements ProductRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Product[]> {
    const results = await this.db
      .prepare("SELECT id, business_id, name, description, price, created_at FROM products")
      .all();

    return results.results.map((row) => this.mapRow(row as ProductRow));
  }

  async getById(id: string): Promise<Product | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, name, description, price, created_at FROM products WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as ProductRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Product[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, name, description, price, created_at FROM products WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as ProductRow));
  }

  async create(input: CreateProductInput): Promise<Product> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        "INSERT INTO products (id, business_id, name, description, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, input.businessId, input.name, input.description, input.price, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create product");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      name: input.name,
      description: input.description,
      price: input.price,
      created_at: now,
    });
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const updated: Product = {
      ...current,
      name: input.name ?? current.name,
      description: input.description !== undefined ? input.description : current.description,
      price: input.price ?? current.price,
    };

    const result = await this.db
      .prepare("UPDATE products SET name = ?, description = ?, price = ? WHERE id = ?")
      .bind(updated.name, updated.description, updated.price, id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update product");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: ProductRow): Product {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      price: row.price,
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
