import type { SupportedLocale } from "@aqui-suena/ui/i18n";
import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { UiProvider } from "@aqui-suena/ui/shared";
import { type RenderOptions, type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// Shared render helper for UI tests: wraps the subtree in the same provider
// stack (UiProvider + LocaleProvider) every component test needs. Centralizing
// this keeps the provider setup in one place so a change to the app shell
// (e.g. a new context) updates every test at once instead of N files.
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { locale?: SupportedLocale },
): RenderResult {
  const locale = options?.locale ?? "en";
  const { locale: _locale, ...renderOptions } = options ?? {};
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <LocaleProvider locale={locale} onChange={() => {}}>
        {children}
      </LocaleProvider>
    </UiProvider>
  );
  return render(ui, { ...renderOptions, wrapper });
}
