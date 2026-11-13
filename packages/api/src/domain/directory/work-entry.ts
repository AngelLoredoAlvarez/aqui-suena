import { type CursorPoint, toEpochSeconds } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

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

export type ListWorkEntriesByBusinessInput = {
  businessId: string;
  limit: number;
  offset: number;
};

function toWorkEntryPoint(entry: WorkEntry): CursorPoint {
  return { createdAt: toEpochSeconds(entry.createdAt), id: entry.id };
}

export interface WorkEntryRepository {
  getById(id: string): Promise<WorkEntry | null>;
  listByBusiness(input: ListWorkEntriesByBusinessInput): Promise<OffsetPage<WorkEntry>>;
  create(input: CreateWorkEntryInput): Promise<WorkEntry>;
  update(id: string, input: UpdateWorkEntryInput): Promise<WorkEntry | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryWorkEntryRepository implements WorkEntryRepository {
  constructor(private readonly workEntries: WorkEntry[]) {}

  async getById(id: string): Promise<WorkEntry | null> {
    return this.workEntries.find((entry) => entry.id === id) ?? null;
  }

  async listByBusiness(input: ListWorkEntriesByBusinessInput): Promise<OffsetPage<WorkEntry>> {
    const owned = this.workEntries.filter((entry) => entry.businessId === input.businessId);

    return paginateOffsetRows(owned, input, toWorkEntryPoint);
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
