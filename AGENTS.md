<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sistema de diseño LaRutica

Antes de cambiar una pantalla, leer `docs/sistema-diseno.md`.

- La familia tipográfica es Poppins, autohospedada en `public/fonts` y declarada una sola vez en `app/fonts.css`.
- Colores, tamaños y radios compartidos se definen en `app/design-tokens.css`.
- Reutilizar `components/ui`: Button, Input, Select, Textarea, Card, Badge y Dialog.
- Para títulos, reutilizar PageHeading/SectionHeading. Si un h1 necesita una referencia propia, conservar la clase `lr-page-title`.
- Los estilos de cada módulo resuelven su composición; no deben crear otra familia tipográfica ni otra paleta de marca.
- No añadir reglas globales de navegación ni títulos con tamaños de hero que afecten otros módulos.
- Ejecutar `npm run design:check`, TypeScript y build; comprobar escritorio, móvil, foco y texto ampliado en los componentes modificados.
