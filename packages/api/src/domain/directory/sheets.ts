import type { PlanId } from "@aqui-suena/api/domain/billing/entitlements";
import { getEntitlements } from "@aqui-suena/api/domain/billing/entitlements";
import { capProducts } from "@aqui-suena/api/domain/directory/listing";

export type SheetBusiness = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly timezone: string;
  readonly delivery: boolean;
};

export type SheetProduct = {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly photos: readonly string[];
};

export type SheetWorkEntry = {
  readonly title: string;
  readonly description: string | null;
  readonly photos: readonly string[];
};

export type SheetService = {
  readonly name: string;
  readonly basePrice: number | null;
};

export type SheetSocialLink = {
  readonly type: string;
  readonly url: string;
};

export type SheetSource = {
  readonly business: SheetBusiness;
  readonly isOpen: boolean;
  readonly flyerUrl: string | null;
  readonly specialties: readonly string[];
  readonly coverageArea: string | null;
  readonly services: readonly SheetService[];
  readonly workEntries: readonly SheetWorkEntry[];
  readonly urgencyBadge: boolean;
  readonly diagnosticRates: boolean;
  readonly products: readonly SheetProduct[];
  readonly featuredProductId: string | null;
  readonly socialLinks: readonly SheetSocialLink[];
  readonly paymentMethods: readonly string[];
};

export type SheetBase = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly timezone: string;
  readonly delivery: boolean;
  readonly isOpen: boolean;
  readonly flyerUrl: string | null;
};

export type TradeExtras = {
  readonly specialties: readonly string[];
  readonly coverageArea: string | null;
  readonly services: readonly SheetService[];
  readonly workEntries: readonly SheetWorkEntry[];
  readonly urgencyBadge: boolean;
  readonly diagnosticRates: boolean;
};

export type CommerceExtras = {
  readonly products: readonly SheetProduct[];
  readonly featuredProductId: string | null;
  readonly socialLinks: readonly SheetSocialLink[];
  readonly paymentMethods: readonly string[];
};

export type CommunitySheet = SheetBase & { readonly plan: "community" };
export type TradesSheet = SheetBase & { readonly plan: "trades" } & TradeExtras;
export type CommerceSheet = SheetBase & { readonly plan: "commerce" } & TradeExtras &
  CommerceExtras;

export type BusinessSheet = CommunitySheet | TradesSheet | CommerceSheet;

export function resolveSheet(plan: PlanId, source: SheetSource): BusinessSheet {
  const base: SheetBase = {
    id: source.business.id,
    name: source.business.name,
    category: source.business.category,
    phone: source.business.phone,
    email: source.business.email,
    address: source.business.address,
    timezone: source.business.timezone,
    delivery: source.business.delivery,
    isOpen: source.isOpen,
    flyerUrl: source.flyerUrl,
  };

  if (plan === "community") {
    return { ...base, plan: "community" };
  }

  const trades: TradesSheet = {
    ...base,
    plan: "trades",
    specialties: source.specialties,
    coverageArea: source.coverageArea,
    services: source.services,
    workEntries: source.workEntries,
    urgencyBadge: source.urgencyBadge,
    diagnosticRates: source.diagnosticRates,
  };

  if (plan === "trades") {
    return trades;
  }

  // Guard against entitlement drift: only commerce enables product listing.
  if (!getEntitlements(plan).productListingEnabled) {
    return trades;
  }

  const cappedProducts = capProducts(source.products, plan);

  const commerce: CommerceSheet = {
    ...trades,
    plan: "commerce",
    products: cappedProducts,
    featuredProductId: source.featuredProductId,
    socialLinks: source.socialLinks,
    paymentMethods: source.paymentMethods,
  };

  return commerce;
}
