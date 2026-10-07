import type { ReactNode } from "react";

export const metadata = {
  title: "Aqui Suena",
  description: "Aqui Suena web placeholder",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
