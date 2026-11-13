export type ActiveListenSessionInput = {
  id: string;
  stationId: string;
  startedAt: Date;
  listeners: number;
};

export interface ListenSessionRepository {
  activeListeners(stationId: string, since: Date): Promise<number>;
  upsertActive(input: ActiveListenSessionInput): Promise<void>;
}

type SessionRow = ActiveListenSessionInput;

export class InMemoryListenSessionRepository implements ListenSessionRepository {
  private readonly sessions = new Map<string, SessionRow>();

  async activeListeners(stationId: string, since: Date): Promise<number> {
    let total = 0;

    for (const session of this.sessions.values()) {
      if (session.stationId === stationId && session.startedAt > since) {
        total += session.listeners;
      }
    }

    return total;
  }

  async upsertActive(input: ActiveListenSessionInput): Promise<void> {
    this.sessions.set(input.id, { ...input });
  }
}
