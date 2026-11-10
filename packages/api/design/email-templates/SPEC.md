# Design specification (in words)

## Overall structure (top to bottom)

External background `#F6F3EE`, padding 24px 12px, centered content. A 600px table (max
width) with three stacked bands and 12px rounded corners at the top and bottom:

1. **Header**, background `#0F1720`, padding 22px 32px. One row: logo (62×41) and, to
   its right, the text "Aquí Suena", 26px, weight 700, Plus Jakarta Sans (fallback
   -apple-system, Segoe UI, Roboto, Helvetica, Arial), color `#F2F5F7`. Logo–text
   spacing: 12px.
2. **Body**, background `#FFFFFF`, padding 32px, in this order:
   - H1, 24/30px, 700, `#1B2430`, bottom margin 16.
   - First paragraph (16/24px, `#1B2430`, bottom margin 16).
   - Optional (templates 7 and 8): summary table, 1px border `#E3DDD2`, radius 8,
     two-cell rows (label on the left 14px `#566170`; value on the right 14px weight
     600 `#1B2430`), padding 10×14, 1px separator between rows.
   - Optional (template 9): business line after the first paragraph.
   - Remaining paragraphs.
   - Optional (9): plan recommendation; list title (15px, 600) and bulleted list
     (15/24px, `#566170`).
   - Button (see below), vertical margin 8.
   - Optional (6): fallback link at 13/20px `#566170` with the full URL in `#C8431D`.
   - Optional (8, 9, 10): secondary link at 14px `#C8431D`, top margin 12.
3. **Footer**, background `#172230`, padding 22px 32px, text 13/20px `#A3B3C2`, links
   `#FF8A65`. Lines: "**Aquí Suena** · {tagline}" (name in `#F2F5F7`);
   "{¿Necesitas ayuda?} {supportEmail}" (mailto); "{Abrir Aquí Suena} · {Mi
   suscripción}" (appUrl, billingUrl). Below, margin 16: 17 Labs logo (40×40) and the
   text "by 17Labs" (monospace 13px; "17" white weight 800, "Labs" `#5EEAD4`).

Preheader: hidden div (`display:none`, `max-height:0`, `overflow:hidden`) at the start
of the body.

## Button

Single-cell table, `bgcolor #C8431D`, radius 8. Link with `display:inline-block`,
padding 14px 28px, 16/20px, weight 700, white text `#FFFFFF`, no underline. Contrast
white/#C8431D ≈ 5.3:1.

## Responsive

Below 620px (`@media` in the head `<style>`): table at 100% width and band side padding
at 20px. Single column, readable down to 320px.

## Tokens (from the app themes "Noche" and "Brasa")

| token      | Noche   | Brasa   |
| ---------- | ------- | ------- |
| background | #0F1720 | #F6F3EE |
| surface    | #172230 | #FFFFFF |
| text       | #F2F5F7 | #1B2430 |
| muted text | #A3B3C2 | #566170 |
| accent     | #FF8A65 | #C8431D |
| ok         | #3CCFA8 | #0B7A63 |
| error      | #FF6B6B | #C62F3A |

The email uses Brasa for the body and Noche for the header and footer. Divider line:
`#E3DDD2`.

## Accessibility

`lang` on `<html>` = locale; `role="presentation"` on layout tables; SVG with
`role="img"` and `aria-label`; no JavaScript; semantic HTML (`h1`, `p`, `ul`).

## App logo (`logo-aqui-suena-noche.svg`)

Horizontal, centered symbol: a **storefront** with a trapezoidal awning of 4 rounded
scallops on top; below it, the store body as a rounded-corner square with **3 vertical
audio bars** cut out: the middle one taller, the left and right shorter. On each side,
**two concentric radio-wave arcs** (like parentheses): the inner one in `#FF8A65` and
the longer outer one in `#FFC4B3`. Storefront and inner arc in `#FF8A65`. Rounded
40-unit stroke on a 1024 canvas.

## 17 Labs logo (footer)

Laboratory flask in white stroke (`#FFFFFF`) with `</>` in `#14B8A6` inside the body
and bits (ovals and small arrows in `#14B8A6`) falling down the neck.

## Templates

See `TEMPLATES.md` (subjects, CTA, links, variables). Runtime copy lives in
`packages/api/src/infrastructure/email/es-MX.json` and `en.json`.
