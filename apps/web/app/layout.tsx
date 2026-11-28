import "@aqui-suena/web/app/ads-carousel.css";
import { BootSplash } from "@aqui-suena/web/app/boot-splash";
import { Providers } from "@aqui-suena/web/app/providers";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: "Aquí Suena",
  description: "Aquí Suena web placeholder",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1720" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={jakarta.className} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/boot-splash.css" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if('isTauri' in window)document.documentElement.classList.add('tauri')}catch(e){}})()",
          }}
        />
      </head>
      {/* Viewport chrome mirrors $nocheBg: no white frame around the app shell. */}
      <body style={{ margin: 0, backgroundColor: "#0F1720", fontSize: 14 }}>
        <Providers>{children}</Providers>
        <BootSplash />
      </body>
    </html>
  );
}
