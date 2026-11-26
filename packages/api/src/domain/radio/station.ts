export type Station = {
  id: string;
  name: string;
  streamUrl: string;
};

export interface StationRepository {
  getById(id: string): Promise<Station | null>;
  list(): Promise<Station[]>;
}
