import { DataIntegrityError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";

/** SAT catalog keys this product can issue against. */
export const TAX_REGIMES = [
  "601", // General de Ley Personas Morales
  "603", // Personas Morales con Fines no Lucrativos
  "605", // Sueldos y Salarios e Ingresos Asimilados a Salarios
  "606", // Arrendamiento
  "608", // Demás ingresos
  "612", // Personas Físicas con Actividades Empresariales y Profesionales
  "614", // Ingresos por intereses
  "616", // Sin obligaciones fiscales
  "621", // Incorporación Fiscal
  "626", // Régimen Simplificado de Confianza (RESICO)
] as const;

export const CFDI_USES = [
  "G01", // Adquisición de mercancías
  "G03", // Gastos en general
  "I08", // Otra maquinaria y equipo
  "P01", // Por definir
  "S01", // Sin efectos fiscales
  "CP01", // Pagos
  "CN01", // Nómina
] as const;

const taxRegimeSchema = v.picklist(TAX_REGIMES);
const cfdiUseSchema = v.picklist(CFDI_USES);

/** Suffixes the CFDI receptor must not carry in `Nombre`. */
const CORPORATE_SUFFIX =
  /\b(S\.?\s?A\.?\s?(DE\s?C\.?\s?V\.?)?|S\.?\s?DE\s?R\.?\s?L\.?(\s?DE\s?C\.?\s?V\.?)?|S\.?\s?A\.?\s?P\.?\s?I\.?(\s?DE\s?C\.?\s?V\.?)?|A\.?\s?C\.?)\s*$/;

const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

function isRealDate(yymmdd: string): boolean {
  const year = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  // Century is irrelevant here: the check is calendar validity, not age.
  const date = new Date(Date.UTC(2000 + year, month - 1, day));

  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export const fiscalProfileSchema = v.object({
  rfc: v.pipe(
    v.string(),
    v.trim(),
    v.toUpperCase(),
    v.check((value) => RFC_PATTERN.test(value), "rfc must match the SAT person/moral shape"),
    v.check((value) => isRealDate(value.slice(-9, -3)), "rfc must encode a real calendar date"),
  ),
  legalName: v.pipe(
    v.string(),
    v.transform(collapseSpaces),
    v.toUpperCase(),
    v.minLength(1, "legalName is required"),
    v.maxLength(254, "legalName is too long"),
    v.check(
      (value) => !CORPORATE_SUFFIX.test(value),
      "legalName must not include the régimen societario",
    ),
  ),
  taxRegime: taxRegimeSchema,
  taxZipCode: v.pipe(v.string(), v.regex(/^\d{5}$/, "taxZipCode must be five digits")),
  cfdiUse: cfdiUseSchema,
  billingEmail: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email(), v.maxLength(254)),
});

export type FiscalProfile = v.InferOutput<typeof fiscalProfileSchema>;

export type StoredFiscalProfileRow = {
  readonly rfc: string | null;
  readonly legal_name: string | null;
  readonly tax_regime: string | null;
  readonly tax_zip_code: string | null;
  readonly cfdi_use: string | null;
  readonly billing_email: string | null;
};

/** Raises `ValidationError`, which the transport maps to `BAD_REQUEST`. */
export function parseFiscalProfile(input: unknown): FiscalProfile {
  const result = v.safeParse(fiscalProfileSchema, input);

  if (!result.success) {
    const issue = result.issues[0];
    const path = issue?.path?.map((segment) => String(segment.key)).join(".") ?? "fiscalProfile";

    throw new ValidationError(`${path}: ${issue?.message ?? "invalid fiscal profile"}`);
  }

  return result.output;
}

/** A missing profile is `null`; an unknown persisted catalog value is integrity debt. */
export function parseStoredFiscalProfile(row: StoredFiscalProfileRow): FiscalProfile | null {
  if (!row.rfc || !row.legal_name) {
    return null;
  }

  if (!(TAX_REGIMES as readonly string[]).includes(row.tax_regime ?? "")) {
    throw new DataIntegrityError("tax_regime", row.tax_regime);
  }

  if (!(CFDI_USES as readonly string[]).includes(row.cfdi_use ?? "")) {
    throw new DataIntegrityError("cfdi_use", row.cfdi_use);
  }

  const profile = v.safeParse(fiscalProfileSchema, {
    rfc: row.rfc,
    legalName: row.legal_name,
    taxRegime: row.tax_regime,
    taxZipCode: row.tax_zip_code,
    cfdiUse: row.cfdi_use,
    billingEmail: row.billing_email,
  });

  if (!profile.success) {
    const issue = profile.issues[0];
    throw new DataIntegrityError(
      issue?.path?.map((segment) => String(segment.key)).join(".") ?? "fiscal_profile",
      issue?.input,
    );
  }

  return profile.output;
}
