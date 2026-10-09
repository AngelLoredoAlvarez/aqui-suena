// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiProvider } from "../provider";
import { LocaleProvider, useLocale } from "./locale-context";
import {
  detectNativeLocale,
  detectWebLocale,
  LOCALE_STORAGE_KEY,
  type LocaleStore,
  loadPersistedLocale,
  savePersistedLocale,
} from "./locale-env";
import { LocaleSwitcher } from "./locale-switcher";

function memoryStore(): LocaleStore & { backing: Map<string, string> } {
  const backing = new Map<string, string>();
  return {
    backing,
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
  };
}

function LocaleEcho() {
  const { locale, dictionary } = useLocale();
  return (
    <>
      <span>{locale}</span>
      <span>{dictionary.playing}</span>
    </>
  );
}

describe("LocaleProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("throws when useLocale runs outside the provider", () => {
    expect(() => render(<LocaleEcho />)).toThrow(/LocaleProvider/);
  });

  it("supplies the es dictionary", () => {
    render(
      <LocaleProvider locale="es" onChange={() => {}}>
        <LocaleEcho />
      </LocaleProvider>,
    );

    expect(screen.getByText("es")).toBeTruthy();
    expect(screen.getByText("Reproduciendo")).toBeTruthy();
  });

  it("supplies the en dictionary", () => {
    render(
      <LocaleProvider locale="en" onChange={() => {}}>
        <LocaleEcho />
      </LocaleProvider>,
    );

    expect(screen.getByText("en")).toBeTruthy();
    expect(screen.getByText("Playing")).toBeTruthy();
  });
});

describe("LocaleSwitcher", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onChange with the other locale when pressed", () => {
    const onChange = vi.fn();
    render(
      <UiProvider>
        <LocaleProvider locale="es" onChange={onChange}>
          <LocaleSwitcher />
        </LocaleProvider>
      </UiProvider>,
    );

    fireEvent.click(screen.getByText("English"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("switches back to es from en", () => {
    const onChange = vi.fn();
    render(
      <UiProvider>
        <LocaleProvider locale="en" onChange={onChange}>
          <LocaleSwitcher />
        </LocaleProvider>
      </UiProvider>,
    );

    fireEvent.click(screen.getByText("Español"));

    expect(onChange).toHaveBeenCalledWith("es");
  });
});

describe("locale detection", () => {
  it("detectWebLocale resolves exact and regional tags", () => {
    expect(detectWebLocale("es-MX")).toBe("es");
    expect(detectWebLocale("en-US")).toBe("en");
    expect(detectWebLocale("fr-FR")).toBe("es");
  });

  it("detectWebLocale never throws without input", () => {
    expect(["es", "en"]).toContain(detectWebLocale());
  });

  it("detectNativeLocale resolves a device tag or defaults to es", () => {
    expect(detectNativeLocale("es-AR")).toBe("es");
    expect(detectNativeLocale("en-US")).toBe("en");
    expect(detectNativeLocale(undefined)).toBe("es");
  });
});

describe("locale persistence", () => {
  it("round-trips the manual choice through the store", () => {
    const store = memoryStore();

    savePersistedLocale(store, "en");

    expect(store.backing.get(LOCALE_STORAGE_KEY)).toBe("en");
    expect(loadPersistedLocale(store)).toBe("en");
  });

  it("returns undefined for missing or unsupported values", () => {
    const store = memoryStore();

    expect(loadPersistedLocale(store)).toBeUndefined();
    store.backing.set(LOCALE_STORAGE_KEY, "fr");
    expect(loadPersistedLocale(store)).toBeUndefined();
  });

  it("never throws on a broken store", () => {
    const broken: LocaleStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(loadPersistedLocale(broken)).toBeUndefined();
    expect(() => savePersistedLocale(broken, "en")).not.toThrow();
  });
});
