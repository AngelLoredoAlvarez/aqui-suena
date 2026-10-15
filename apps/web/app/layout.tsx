import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: "Aqui Suena",
  description: "Aqui Suena web placeholder",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={jakarta.className}>
      {/* Viewport chrome mirrors $nocheBg: no white frame around the app shell. */}
      <body style={{ margin: 0, backgroundColor: "#0F1720", fontSize: 14 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
