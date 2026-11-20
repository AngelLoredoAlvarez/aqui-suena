import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

export const CFDI_INVOICE_STATUSES = [
  "issued",
  "failed",
  "cancellation_pending",
  "cancelled",
  "cancellation_rejected",
] as const;

export const CFDI_CANCELLATION_MOTIVES = ["01", "02", "03", "04"] as const;

export type CfdiCancellationMotive = (typeof CFDI_CANCELLATION_MOTIVES)[number];

export type CfdiInvoiceStatus = (typeof CFDI_INVOICE_STATUSES)[number];

export type CfdiInvoice = {
  id: string;
  accountId: string;
  paymentId: string | null;
  status: CfdiInvoiceStatus;
  uuid: string | null;
  providerId: string | null;
  xmlKey: string | null;
  pdfKey: string | null;
  failureReason: string | null;
  cancellationMotive: CfdiCancellationMotive | null;
  cancellationRequestedAt: Date | null;
  cancellationResolvedAt: Date | null;
  cancellationExpiresAt: Date | null;
  cancellationDetail: string | null;
  acuseKey: string | null;
  /** UUID of the CFDI that replaced this one; only set for motive `01`. */
  substitutionUuid: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewCfdiInvoice = Omit<CfdiInvoice, "id" | "createdAt" | "updatedAt">;

export type ListInvoicesInput = {
  readonly accountId: string;
  readonly limit: number;
  readonly offset: number;
};

/** What the provider answered, already normalised by the port. */
export type CancellationOutcomeUpdate = {
  readonly id: string;
  readonly accountId: string;
  readonly status: CfdiInvoiceStatus;
  readonly resolvedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly detail: string | null;
  readonly acuseKey: string | null;
  readonly updatedAt: Date;
};

export interface CfdiInvoiceRepository {
  create(input: NewCfdiInvoice): Promise<CfdiInvoice>;
  /**
   * Every row except `failed`: a PAC rejection is not a document the owner owns,
   * but a cancelled invoice is still fiscal history.
   */
  listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>>;
  /** Any status: the caller decides what each one may do. */
  getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null>;
  /**
   * Rows waiting on the receiver, oldest check first. Reconciliation needs them
   * ordered so a batch never starves the same invoice twice.
   */
  listPendingCancellations(input: { accountId: string; limit: number }): Promise<CfdiInvoice[]>;
  /**
   * Every account's pending row, for the scheduled sweep: the cron has no session
   * and no account in scope.
   */
  listPendingCancellationsForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]>;
  /**
   * Compare-and-set to `cancellation_pending`. `false` means another request
   * already claimed it, so the provider must not be called twice.
   */
  markCancellationRequested(input: {
    id: string;
    accountId: string;
    motive: CfdiCancellationMotive;
    requestedAt: Date;
  }): Promise<boolean>;
  /** Records what the provider answered, without touching the motive. */
  recordCancellationOutcome(input: CancellationOutcomeUpdate): Promise<void>;
  /**
   * Stores the UUID of the stamped substitute. It is written before the
   * cancellation request so a retry reuses it instead of stamping another CFDI.
   */
  recordSubstitutionUuid(input: {
    id: string;
    accountId: string;
    substitutionUuid: string;
    updatedAt: Date;
  }): Promise<void>;
}

export interface CfdiDocumentStore {
  saveXml(input: { accountId: string; xml: string }): Promise<string>;
  savePdf(input: { accountId: string; pdf: Uint8Array }): Promise<string>;
  /** The acuse proves a cancellation: it is a fiscal document like the CFDI. */
  saveAcuse(input: { accountId: string; xml: string }): Promise<string>;
}

/** Signs a short-lived download for an archived document. */
export interface CfdiDocumentLinker {
  signedDownloadUrl(input: { key: string; fileName: string; contentType: string }): Promise<string>;
}

export class InMemoryCfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(readonly rows: CfdiInvoice[] = []) {}

  async listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>> {
    const listed = this.rows
      .filter((row) => row.accountId === input.accountId && row.status !== "failed")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return paginateOffset(
      listed.slice(input.offset, input.offset + input.limit),
      input.limit,
      input.offset,
    );
  }

  async getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null> {
    return this.rows.find((row) => row.id === id && row.accountId === accountId) ?? null;
  }

  /** Compare-and-set: the winner is the only caller that reaches the provider. */
  async markCancellationRequested(input: {
    id: string;
    accountId: string;
    motive: CfdiCancellationMotive;
    requestedAt: Date;
  }): Promise<boolean> {
    const row = this.rows.find(
      (candidate) =>
        candidate.id === input.id &&
        candidate.accountId === input.accountId &&
        candidate.status === "issued",
    );

    if (row === undefined) return false;

    row.status = "cancellation_pending";
    row.cancellationMotive = input.motive;
    row.cancellationRequestedAt = input.requestedAt;
    row.updatedAt = input.requestedAt;

    return true;
  }

  async listPendingCancellations(input: {
    accountId: string;
    limit: number;
  }): Promise<CfdiInvoice[]> {
    return this.rows
      .filter((row) => row.accountId === input.accountId && row.status === "cancellation_pending")
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, input.limit);
  }

  async listPendingCancellationsForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]> {
    return this.rows
      .filter((row) => row.status === "cancellation_pending")
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, input.limit);
  }

  async recordCancellationOutcome(input: CancellationOutcomeUpdate): Promise<void> {
    const row = this.rows.find(
      (candidate) => candidate.id === input.id && candidate.accountId === input.accountId,
    );

    if (row === undefined) return;

    row.status = input.status;
    row.cancellationResolvedAt = input.resolvedAt;
    row.cancellationExpiresAt = input.expiresAt;
    row.cancellationDetail = input.detail;
    row.acuseKey = input.acuseKey;
    row.updatedAt = input.updatedAt;
  }

  async recordSubstitutionUuid(input: {
    id: string;
    accountId: string;
    substitutionUuid: string;
    updatedAt: Date;
  }): Promise<void> {
    const row = this.rows.find(
      (candidate) => candidate.id === input.id && candidate.accountId === input.accountId,
    );

    if (row === undefined) return;

    row.substitutionUuid = input.substitutionUuid;
    row.updatedAt = input.updatedAt;
  }

  async create(input: NewCfdiInvoice): Promise<CfdiInvoice> {
    const now = new Date();

    const invoice: CfdiInvoice = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.rows.push(invoice);

    return invoice;
  }
}
