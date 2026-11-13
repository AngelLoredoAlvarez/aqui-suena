export type Station = {
  id: string;
  name: string;
  streamUrl: string;
};

export interface StationRepository {
  getById(id: string): Promise<Station | null>;
  list(): Promise<Station[]>;
}

export class InMemoryStationRepository implements StationRepository {
  constructor(private readonly stations: Station[]) {}

  async getById(id: string): Promise<Station | null> {
    return this.stations.find((station) => station.id === id) ?? null;
  }

  async list(): Promise<Station[]> {
    return [...this.stations];
  }
}
