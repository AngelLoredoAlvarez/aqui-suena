// Shared locale contract. Spanish and English ship now; adding a language
// means adding one dictionary below plus one entry in SupportedLocale.
// The parity test in i18n.test.ts fails when a key is missing, so drift
// between languages is caught at test time, not in production.

export type SupportedLocale = "es" | "en";

export type Dictionary = {
  readonly playing: string;
  readonly paused: string;
  readonly loading: string;
  readonly pause: string;
  readonly resume: string;
  readonly tapToEnableSound: string;
  readonly tapToPlay: string;
  readonly movePlayer: string;
  readonly sheetTitle: string;
  readonly changeStation: (name: string) => string;
  readonly liveBadge: string;
  readonly closeSheet: string;
  readonly signalUnavailable: string;
  readonly playbackFailed: string;
  readonly listening: (count: number) => string;
  readonly appTitle: string;
  readonly loadingStation: string;
  readonly trayPlay: string;
  readonly trayPause: string;
  readonly trayStations: string;
  readonly trayCloseToTray: string;
  readonly trayToggleWindow: string;
  readonly trayQuit: string;
  readonly open: string;
  readonly closed: string;
  readonly delivery: string;
  readonly deliveryBadge: string;
  readonly category: (value: string) => string;
  readonly opensAt: (time: string) => string;
  readonly viewBusiness: string;
  readonly noSponsoredBusinesses: string;
  readonly noSponsoredBusinessesHint: string;
  readonly adGroupLabel: (index: number, count: number) => string;
  readonly previousAd: string;
  readonly nextAd: string;
  readonly openFlyer: string;
  readonly closeFlyer: string;
  readonly fullscreenFlyer: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly resetZoom: string;
  readonly downloadFlyer: string;
  readonly searchBusinesses: string;
  readonly searchBusinessesAria: string;
  readonly assistant: string;
  readonly assistantAria: string;
  readonly changeLanguage: string;
  readonly openMenu: string;
  readonly changeTheme: string;
  readonly advertisements: string;
  readonly myBusinesses: string;
  readonly businesses: string;
  readonly privacyNotice: string;
  readonly termsAndConditions: string;
  readonly reportContent: string;
  readonly allFilter: string;
  readonly openNowFilter: string;
  readonly deliveryFilter: string;
  readonly phone: string;
  readonly whatsapp: string;
  readonly address: string;
  readonly schedule: string;
  readonly call: string;
  readonly directions: string;
  readonly weekdays: readonly string[];
};

const categoryLabelsEs: Readonly<Record<string, string>> = {
  food: "Comida",
  health: "Salud",
  retail: "Comercio",
  services: "Servicios",
  computing: "Cómputo",
  other: "Otros",
};

const categoryLabelsEn: Readonly<Record<string, string>> = {
  food: "Food",
  health: "Health",
  retail: "Retail",
  services: "Services",
  computing: "Computing",
  other: "Other",
};

export const es: Dictionary = {
  playing: "Reproduciendo",
  paused: "En pausa",
  loading: "Cargando…",
  pause: "Pausar",
  resume: "Reanudar",
  tapToPlay: "Toca para escuchar",
  movePlayer: "Mover reproductor arriba o abajo",
  sheetTitle: "Estaciones",
  changeStation: (name: string) => `Cambiar estación, actual: ${name}`,
  liveBadge: "En vivo",
  closeSheet: "Cerrar",
  tapToEnableSound: "Toca para activar el sonido",
  signalUnavailable: "Señal no disponible, probando espejo…",
  playbackFailed: "Falló la reproducción.",
  listening: (count: number) => `${count} escuchando`,
  appTitle: "Aquí Suena",
  loadingStation: "Cargando estado de la estación…",
  trayPlay: "Reproducir",
  trayPause: "Pausar",
  trayStations: "Estaciones",
  trayCloseToTray: "Cerrar a la bandeja",
  trayToggleWindow: "Mostrar/Ocultar ventana",
  trayQuit: "Salir",
  open: "Abierto",
  closed: "Cerrado",
  delivery: "Servicio a domicilio",
  deliveryBadge: "A domicilio",
  category: (value: string) => categoryLabelsEs[value] ?? value,
  opensAt: (time: string) => `Abre ${time}`,
  viewBusiness: "Ver negocio",
  noSponsoredBusinesses: "Aún no hay negocios patrocinados",
  noSponsoredBusinessesHint: "Vuelve pronto: aquí verás los negocios cerca de ti.",
  adGroupLabel: (index: number, count: number) => `Anuncio ${index} de ${count}`,
  previousAd: "Anuncio anterior",
  nextAd: "Anuncio siguiente",
  openFlyer: "Ver flyer completo",
  closeFlyer: "Cerrar flyer",
  fullscreenFlyer: "Flyer a pantalla completa",
  zoomIn: "Acercar",
  zoomOut: "Alejar",
  resetZoom: "Restablecer zoom",
  downloadFlyer: "Descargar flyer",
  searchBusinesses: "Buscar",
  searchBusinessesAria: "Buscar negocios por nombre, categoría o producto",
  assistant: "Asistente",
  assistantAria: "Asistente de negocios con IA",
  changeLanguage: "Cambiar idioma",
  openMenu: "Abrir menú",
  changeTheme: "Cambiar tema",
  advertisements: "Anuncios",
  myBusinesses: "Mis negocios",
  businesses: "Negocios",
  privacyNotice: "Aviso de privacidad",
  termsAndConditions: "Términos y condiciones",
  reportContent: "Reportar contenido",
  allFilter: "Todos",
  openNowFilter: "Abierto ahora",
  deliveryFilter: "A domicilio",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  address: "Dirección",
  schedule: "Horario",
  call: "Llamar",
  directions: "Cómo llegar",
  weekdays: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};

export const en: Dictionary = {
  playing: "Playing",
  paused: "Paused",
  loading: "Loading…",
  pause: "Pause",
  resume: "Resume",
  tapToPlay: "Tap to listen",
  movePlayer: "Move player up or down",
  sheetTitle: "Stations",
  changeStation: (name: string) => `Change station, current: ${name}`,
  liveBadge: "Live",
  closeSheet: "Close",
  tapToEnableSound: "Tap to enable sound",
  signalUnavailable: "Signal unavailable, trying mirror…",
  playbackFailed: "Playback failed.",
  listening: (count: number) => `${count} listening`,
  appTitle: "Aquí Suena",
  loadingStation: "Loading station status…",
  trayPlay: "Play",
  trayPause: "Pause",
  trayStations: "Stations",
  trayCloseToTray: "Close to tray",
  trayToggleWindow: "Show/Hide window",
  trayQuit: "Quit",
  open: "Open",
  closed: "Closed",
  delivery: "Home delivery",
  deliveryBadge: "Delivery",
  category: (value: string) => categoryLabelsEn[value] ?? value,
  opensAt: (time: string) => `Opens ${time}`,
  viewBusiness: "View business",
  noSponsoredBusinesses: "No sponsored businesses yet",
  noSponsoredBusinessesHint: "Check back soon — you'll see businesses near you here.",
  adGroupLabel: (index: number, count: number) => `Ad ${index} of ${count}`,
  previousAd: "Previous ad",
  nextAd: "Next ad",
  openFlyer: "View full flyer",
  closeFlyer: "Close flyer",
  fullscreenFlyer: "Fullscreen flyer",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetZoom: "Reset zoom",
  downloadFlyer: "Download flyer",
  searchBusinesses: "Search",
  searchBusinessesAria: "Search businesses by name, category, or product",
  assistant: "Assistant",
  assistantAria: "AI business assistant",
  changeLanguage: "Change language",
  openMenu: "Open menu",
  changeTheme: "Change theme",
  advertisements: "Advertisements",
  myBusinesses: "My businesses",
  businesses: "Businesses",
  privacyNotice: "Privacy notice",
  termsAndConditions: "Terms and conditions",
  reportContent: "Report content",
  allFilter: "All",
  openNowFilter: "Open now",
  deliveryFilter: "Delivery",
  phone: "Phone",
  whatsapp: "WhatsApp",
  address: "Address",
  schedule: "Hours",
  call: "Call",
  directions: "Get directions",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const defaultLocale: SupportedLocale = "es";

const dictionaries: Record<SupportedLocale, Dictionary> = { es, en };

function isSupportedLocale(value: string): value is SupportedLocale {
  return value === "es" || value === "en";
}

// Exact match first, then the base language tag ("es-MX" -> "es",
// "en_US" -> "en"), then the default locale. Never throws.
export function resolveLocale(input: string | undefined): SupportedLocale {
  const tag = input?.trim().toLowerCase().replace("_", "-");
  if (!tag) {
    return defaultLocale;
  }
  if (isSupportedLocale(tag)) {
    return tag;
  }
  const base = tag.split("-")[0];
  if (base && isSupportedLocale(base)) {
    return base;
  }
  return defaultLocale;
}

export function getDictionary(locale: string | undefined): Dictionary {
  return dictionaries[resolveLocale(locale)];
}
