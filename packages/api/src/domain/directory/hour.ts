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
  list(): Promise<Hour[]>;
  getById(id: string): Promise<Hour | null>;
  listByBusiness(businessId: string): Promise<Hour[]>;
  create(input: CreateHourInput): Promise<Hour>;
  update(id: string, input: UpdateHourInput): Promise<Hour | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryHourRepository implements HourRepository {
  constructor(private readonly hours: Hour[]) {}

  async list(): Promise<Hour[]> {
    return this.hours;
  }

  async getById(id: string): Promise<Hour | null> {
    return this.hours.find((hour) => hour.id === id) ?? null;
  }

  async listByBusiness(businessId: string): Promise<Hour[]> {
    return this.hours.filter((hour) => hour.businessId === businessId);
  }

  async create(input: CreateHourInput): Promise<Hour> {
    const hour: Hour = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      day: input.day,
      openMinute: input.openMinute,
      closeMinute: input.closeMinute,
    };

    this.hours.push(hour);

    return hour;
  }

  async update(id: string, input: UpdateHourInput): Promise<Hour | null> {
    const index = this.hours.findIndex((hour) => hour.id === id);

    if (index === -1) return null;

    const current = this.hours[index] as Hour;
    const updated: Hour = {
      ...current,
      day: input.day ?? current.day,
      openMinute: input.openMinute ?? current.openMinute,
      closeMinute: input.closeMinute ?? current.closeMinute,
    };

    this.hours[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.hours.findIndex((hour) => hour.id === id);

    if (index === -1) return false;

    this.hours.splice(index, 1);

    return true;
  }
}
