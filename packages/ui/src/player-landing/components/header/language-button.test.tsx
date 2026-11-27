// @vitest-environment jsdom

import { LocaleProvider } from "@aqui-suena/ui/i18n";
import { LanguageButton } from "@aqui-suena/ui/player-landing/components/header/language-button";
import { UiProvider } from "@aqui-suena/ui/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function renderButton(
  locale: "es" | "en" = "es",
  onChange: (locale: "es" | "en") => void = () => {},
) {
  return render(
    <UiProvider>
      <LocaleProvider locale={locale} onChange={onChange}>
        <LanguageButton />
      </LocaleProvider>
    </UiProvider>,
  );
}

describe("LanguageButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the current locale and the change-language label", () => {
    renderButton("es");

    const trigger = screen.getByTestId("landing-language");
    expect(trigger.getAttribute("aria-label")).toBe("Cambiar idioma");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.textContent).toContain("ES");
  });

  it("shows EN under the en locale", () => {
    renderButton("en");

    expect(screen.getByTestId("landing-language").textContent).toContain("EN");
  });

  it("switches language from the menu", async () => {
    const onChange = vi.fn();
    renderButton("es", onChange);

    fireEvent.click(screen.getByTestId("landing-language"));

    const english = await screen.findByTestId("landing-language-en");
    fireEvent.click(english);

    expect(onChange).toHaveBeenCalledWith("en");
  });
});
