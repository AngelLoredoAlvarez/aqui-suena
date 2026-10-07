import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Aqui Suena",
  description: "Aqui Suena web placeholder",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
