export type D1TestStatement = {
  readonly sql: string;
  readonly params: readonly unknown[];
};

export type D1TestResponse = {
  readonly all?: readonly unknown[];
  readonly first?: unknown;
  readonly run?: {
    readonly success?: boolean;
    readonly changes?: number;
  };
};

export type D1TestResponder = (statement: D1TestStatement, call: number) => D1TestResponse;

/**
 * In-memory D1 stand-in for repository tests. It records every executed
 * statement and answers through a responder, so tests describe rows instead of
 * hand-stubbing prepare/bind/first/all/run.
 */
export class FakeD1Database {
  readonly statements: D1TestStatement[] = [];

  constructor(private readonly respond: D1TestResponder = () => ({})) {}

  get db(): D1Database {
    return this as unknown as D1Database;
  }

  prepare(sql: string): unknown {
    return this.statement(sql, []);
  }

  private statement(sql: string, params: readonly unknown[]) {
    const record = (): D1TestResponse => {
      const statement = { sql, params };
      this.statements.push(statement);

      return this.respond(statement, this.statements.length - 1);
    };

    return {
      bind: (...next: unknown[]) => this.statement(sql, next),
      all: async () => ({ results: [...(record().all ?? [])] }),
      first: async () => record().first ?? null,
      run: async () => {
        const result = record();

        return {
          success: result.run?.success ?? true,
          meta: { changes: result.run?.changes ?? 1 },
        };
      },
      raw: async () => [...(record().all ?? [])],
    };
  }
}
