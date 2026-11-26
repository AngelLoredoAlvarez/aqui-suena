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

export interface WorkEntryRepository {
  getById(id: string): Promise<WorkEntry | null>;
  listByBusiness(input: ListWorkEntriesByBusinessInput): Promise<OffsetPage<WorkEntry>>;
  create(input: CreateWorkEntryInput): Promise<WorkEntry>;
  update(id: string, input: UpdateWorkEntryInput): Promise<WorkEntry | null>;
  delete(id: string): Promise<boolean>;
}
