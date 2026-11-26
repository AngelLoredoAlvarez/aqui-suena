import type { Station, StationRepository } from "@aqui-suena/api/domain/radio/station";

export class InMemoryStationRepository implements StationRepository {
  constructor(private readonly stations: Station[]) {}

  async getById(id: string): Promise<Station | null> {
    return this.stations.find((station) => station.id === id) ?? null;
  }

  async list(): Promise<Station[]> {
    return [...this.stations];
  }
}
