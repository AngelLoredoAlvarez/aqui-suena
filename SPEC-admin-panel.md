# Spec: admin-panel — Aquí Suena (by 17Labs)

## Objective

Web-first admin panel for Aquí Suena, used by 17Labs staff to manage business plans, accounts, businesses, flyers, moderation, billing and support. The panel must allow controlled live changes with complete auditability. Success = staff can operate the platform without direct database access or deploys for commercial changes.

## Scope (V1)

The admin panel manages:

- Business plans: name, description, audience, price, billing period, benefits, limits, status.
- Accounts and businesses: view, suspend, reactivate, inspect plan and usage.
- Flyers and media: review, approve, reject, remove.
- Moderation: content reports, flagged businesses, suspicious accounts.
- Billing: payments, failed renewals, grace periods, invoices/receipts.
- Support: account lookup, plan changes, billing exceptions with audit.

## Roles

- **Superadmin**: full access, including plan limits, pricing, roles and destructive actions.
- **Support**: account and business lookup, billing help, non-destructive plan changes with audit.
- **Moderation**: review and approve/reject flyers and business content.
- **Billing**: payment, invoice and renewal operations.

Each role has explicit permissions. No shared admin password.

## Live changes and limits

- Plan text, price, benefits and status can be changed live.
- Plan limits can be changed live, but only by Superadmin.
- Every live change requires a reason.
- Critical changes require explicit confirmation.
- Changes take effect immediately unless a scheduled effective date is selected.

## Audit

Every admin action is recorded in an append-only audit log:

- actor
- role
- action
- entity type and ID
- previous value
- new value
- reason
- timestamp

The audit log is immutable and never user-editable. Revert is supported when technically safe.

## Data and architecture

- Source of truth for plans and admin state: D1.
- Worker exposes admin-only tRPC procedures behind Supabase Auth and role checks.
- Short-lived JWT in Authorization Bearer for API access.
- Sensitive admin operations require server-side validation.
- Plan limits remain protected by server-side enforcement even when edited from the panel.

## Platform and delivery (V1)

- Admin panel is a separate web app: `apps/admin` (Next.js), not embedded in `apps/web` or `apps/mobile`.
- Web-first and responsive: usable from any browser, including mobile browsers, so staff can operate from anywhere without a native mobile app.
- Desktop: staff use the browser; no dedicated Tauri admin build in V1.
- Native mobile admin: out of scope for V1. If a concrete operational need arises (e.g. push-driven quick approvals), add a thin read-only or low-risk companion later.
- Sensitive mutations (plan limits, billing, destructive actions) are web/desktop only, with explicit confirmation + reason + audit.
- Future hardening (not V1 blockers): MFA for Superadmin, IP allowlist, dedicated admin domain (`admin.aqui-suena`) with its own CSP.

## Safety rules

- Never delete user data from the admin panel without explicit confirmation.
- Never bypass entitlement enforcement.
- Never expose raw database access to the frontend.
- All destructive actions must be auditable.
- Failed payments and grace periods must be visible before downgrade.

## Success criteria

- Superadmin can create, edit, activate and deactivate plans without deploy.
- Support can inspect accounts and billing without changing plans.
- Moderation can review and reject flyers.
- Billing can handle failed payments and grace periods.
- Every critical change is auditable and reversible when safe.
- No admin action bypasses server-side entitlement checks.

## Open questions

- Whether Superadmin changes to limits require a second approval.
- Whether billing exceptions can override automated downgrade.
- Whether to enable MFA and IP allowlist for admin access in V1 or defer to hardening phase.
