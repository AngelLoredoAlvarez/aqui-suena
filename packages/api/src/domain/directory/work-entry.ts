export type WorkEntry = {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateWorkEntryInput = {
  businessId: string;
  title: string;
  description: string | null;
};

export type UpdateWorkEntryInput = {
  title?: string;
  description?: string | null;
};

export interface WorkEntryRepository {
  list(): Promise<WorkEntry[]>;
  getById(id: string): Promise<WorkEntry | null>;
  listByBusiness(businessId: string): Promise<WorkEntry[]>;
  create(input: CreateWorkEntryInput): Promise<WorkEntry>;
  update(id: string, input: UpdateWorkEntryInput): Promise<WorkEntry | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryWorkEntryRepository implements WorkEntryRepository {
  constructor(private readonly workEntries: WorkEntry[]) {}

  async list(): Promise<WorkEntry[]> {
    return this.workEntries;
  }

  async getById(id: string): Promise<WorkEntry | null> {
    return this.workEntries.find((entry) => entry.id === id) ?? null;
  }

  async listByBusiness(businessId: string): Promise<WorkEntry[]> {
    return this.workEntries.filter((entry) => entry.businessId === businessId);
  }

  async create(input: CreateWorkEntryInput): Promise<WorkEntry> {
    const entry: WorkEntry = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      title: input.title,
      description: input.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workEntries.push(entry);

    return entry;
  }

  async update(id: string, input: UpdateWorkEntryInput): Promise<WorkEntry | null> {
    const index = this.workEntries.findIndex((entry) => entry.id === id);

    if (index === -1) return null;

    const current = this.workEntries[index] as WorkEntry;
    const updated: WorkEntry = {
      ...current,
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      updatedAt: new Date(),
    };

    this.workEntries[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.workEntries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    this.workEntries.splice(index, 1);

    return true;
  }
}
