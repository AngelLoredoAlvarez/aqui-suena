"use client";

import { useLayoutEffect } from "react";

export function BootSplash() {
  useLayoutEffect(() => {
    if ("isTauri" in window) {
      document.documentElement.classList.add("tauri");
    }
  }, []);

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-label="Cargando Aquí Suena">
      <div className="boot-splash__stack">
        <div className="boot-splash__logo" role="img" aria-label="Logo de Aquí Suena">
          <svg viewBox="87 85 850 850" aria-hidden="true" focusable="false">
            <g fill="none" strokeLinecap="round" strokeWidth="40">
              <path d="M303.2 346.8 A265 265 0 0 0 303.2 673.2" stroke="#FF8A65" />
              <path d="M720.8 346.8 A265 265 0 0 1 720.8 673.2" stroke="#FF8A65" />
              <path d="M208.6 273 A385 385 0 0 0 208.6 747" stroke="#FFC4B3" />
              <path d="M815.4 273 A385 385 0 0 1 815.4 747" stroke="#FFC4B3" />
            </g>
            <g transform="translate(512 510) scale(1.1) translate(-512 -510)">
              <path
                d="M400 300 H624 L672 400 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 Z"
                fill="#FF8A65"
              />
              <rect x="380" y="475" width="264" height="245" rx="24" fill="#FF8A65" />
              <g fill="#0F1720">
                <rect x="442" y="552" width="36" height="90" rx="18" />
                <rect x="494" y="522" width="36" height="150" rx="18" />
                <rect x="546" y="542" width="36" height="110" rx="18" />
              </g>
            </g>
          </svg>
        </div>
        <h1 className="boot-splash__title">Aquí Suena</h1>
        <div className="boot-splash__track" role="progressbar" aria-label="Cargando">
          <div className="boot-splash__fill" />
        </div>
      </div>
      <div className="boot-splash__by" role="img" aria-label="by 17Labs">
        <span className="boot-splash__by-label">by</span>
        <span className="boot-splash__by-mark">
          <svg viewBox="-4 -10 72 72" aria-hidden="true" focusable="false">
            <path
              d="M24 6h16M26 6v20L10 54q-2 5 3 5h38q5 0 3-5L38 26V6"
              fill="none"
              stroke="#F2F5F7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <path
              d="M27 40l-8 8 8 8M37 40l8 8-8 8M34 39l-4 18"
              fill="none"
              stroke="#14B8A6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
            <g
              fill="none"
              stroke="#14B8A6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            >
              <path d="M32.2 -8.5l1.6-1.1v5.2" />
              <ellipse cx="30.5" cy="-1" rx="1.5" ry="2.2" />
              <ellipse cx="33.5" cy="12.2" rx="1.5" ry="2.2" />
              <path d="M29.2 16.3l1.6-1.1v5.2" />
              <ellipse cx="33.5" cy="23.4" rx="1.5" ry="2.2" />
              <path d="M29.2 27.5l1.6-1.1v5.2" />
              <ellipse cx="33.5" cy="34.6" rx="1.5" ry="2.2" />
            </g>
          </svg>
          <span className="boot-splash__wordmark">
            <strong>17</strong>
            <span>Labs</span>
            <i aria-hidden="true" />
          </span>
        </span>
      </div>
    </div>
  );
}
