import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateRenderer,
  EmailTemplateVars,
  RenderedEmail,
} from "@aqui-suena/api/domain/email/email-template";
import { renderEmail } from "@aqui-suena/api/infrastructure/email/renderer";

export interface EmailTemplateRendererOptions {
  readonly appUrl: string;
  readonly supportEmail: string;
  readonly billingPath: string;
  readonly ownerPortalPath: string;
}

export function createEmailTemplateRenderer(
  options: EmailTemplateRendererOptions,
): EmailTemplateRenderer {
  const links: EmailTemplateVars = {
    appUrl: options.appUrl,
    supportEmail: options.supportEmail,
    billingUrl: `${options.appUrl}${options.billingPath}`,
    ownerPortalUrl: `${options.appUrl}${options.ownerPortalPath}`,
  };

  return {
    render(id: EmailTemplateId, locale: EmailLocale, vars: EmailTemplateVars): RenderedEmail {
      return renderEmail(id, locale, { ...links, ...vars });
    },
  };
}
