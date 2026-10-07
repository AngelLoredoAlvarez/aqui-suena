"use client";

import { greeting } from "@aqui/ui";

export default function HomePage() {
  return (
    <main>
      <h1>Aqui Suena</h1>
      <p>{greeting()}</p>
    </main>
  );
}
