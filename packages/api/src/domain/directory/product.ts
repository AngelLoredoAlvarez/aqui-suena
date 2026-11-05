export type Product = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  createdAt: Date;
};

export type CreateProductInput = {
  businessId: string;
  name: string;
  description: string | null;
  price: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
};

export interface ProductRepository {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  listByBusiness(businessId: string): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly products: Product[]) {}

  async list(): Promise<Product[]> {
    return this.products;
  }

  async listByBusiness(businessId: string): Promise<Product[]> {
    return this.products.filter((p) => p.businessId === businessId);
  }

  async getById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      price: input.price,
      createdAt: new Date(),
    };

    this.products.push(product);

    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const index = this.products.findIndex((product) => product.id === id);

    if (index === -1) return null;

    const current = this.products[index] as Product;
    const updated: Product = {
      ...current,
      name: input.name ?? current.name,
      description: input.description !== undefined ? input.description : current.description,
      price: input.price !== undefined ? input.price : current.price,
    };

    this.products[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.products.findIndex((product) => product.id === id);

    if (index === -1) return false;

    this.products.splice(index, 1);

    return true;
  }
}
