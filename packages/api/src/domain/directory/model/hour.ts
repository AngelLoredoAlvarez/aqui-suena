export type Hour = {
  id: string;
  businessId: string;
  day: number;
  openMinute: number;
  closeMinute: number;
};

export type CreateHourInput = {
  businessId: string;
  day: number;
  openMinute: number;
  closeMinute: number;
};

export type UpdateHourInput = {
  day?: number;
  openMinute?: number;
  closeMinute?: number;
};

export interface HourRepository {
  getById(id: string): Promise<Hour | null>;
  listByBusiness(businessId: string): Promise<Hour[]>;
  create(input: CreateHourInput): Promise<Hour>;
  update(id: string, input: UpdateHourInput): Promise<Hour | null>;
  delete(id: string): Promise<boolean>;
}
