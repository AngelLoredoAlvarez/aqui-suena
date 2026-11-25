export interface SplashLayout {
  readonly wide: boolean;
  readonly logoSize: number;
  readonly titleSize: number;
  readonly trackWidth: number;
  readonly trackMargin: number;
  readonly footerBottom: number;
  readonly footerSize: number;
  readonly markSize: number;
}

const WIDE_BREAKPOINT = 600;

export function splashLayout(width: number): SplashLayout {
  const wide = width >= WIDE_BREAKPOINT;

  return {
    wide,
    logoSize: wide ? 196 : 140,
    titleSize: wide ? 48 : 34,
    trackWidth: wide ? 176 : 126,
    trackMargin: wide ? 29 : 21,
    footerBottom: wide ? 48 : 40,
    footerSize: wide ? 17 : 15,
    markSize: wide ? 38 : 32,
  };
}
