# Sistema de diseño de LaRutica

La referencia es la landing existente: Poppins, verde bosque, verde vivo de acento y superficies blancas. Estas reglas se comparten con catálogo, detalle, reservas, autenticación, páginas legales y paneles de administración/proveedores.

## Fuentes y jerarquía

Poppins se declara una sola vez en app/fonts.css, importado por el layout raíz. Los cinco pesos se sirven desde public/fonts; ahí se incluyen la licencia SIL OFL 1.1 y las fuentes de descarga. No importar fuentes en una página ni declarar Arial, Geist, Trip Sans o Roboto como una segunda identidad. El fallback del sistema es únicamente para una carga fallida. Los valores están en app/design-tokens.css.

| Uso | Token | Tamaño | Peso |
| --- | --- | --- | --- |
| Portada principal | type-display | 36–56 px | 800 |
| Mensaje destacado de portada | type-feature | 28–44 px | 800 |
| Título de pantalla, incluido dashboard | type-page | 28–40 px | 700 |
| Título de sección | type-section | 24–28 px | 700 |
| Título de tarjeta | type-card | 20 px | 600–700 |
| Introducción destacada | type-lead | 18 px | 400 |
| Texto y campos | type-body | 16 px | 400 |
| Botones, etiquetas y metadatos | type-small | 14 px | 500–600 |
| Etiquetas de estado y notas breves | type-caption | 12 px | 500–600 |

Los títulos de portada son variantes explícitas, no reglas globales de h1/h2. Mantener un solo h1 principal por pantalla. Usar 1.2 de interlineado en encabezados y 1.6 en texto. Los campos mantienen 16 px también en móvil.

## Colores semánticos

| Uso | Token | Valor base |
| --- | --- | --- |
| Texto principal y acción primaria | brand-forest / primary | #003b22 |
| Hover primario | brand-forest-hover | #155536 |
| Acento de marca, búsqueda y destacados | brand-green | #00df5b |
| Superficie | surface / background / card | #ffffff |
| Fondo secundario | surface-muted | #f2f4f2 |
| Texto secundario | text-secondary | #455349 |
| Metadatos | text-muted | #647266 |
| Borde | stroke | #d9e1dc |
| Foco | focus / ring | #167443 |
| Acción destructiva | danger / destructive | #9b271f |

Botón primario: fondo bosque y texto blanco. Botón de acento: fondo verde vivo y texto bosque; no texto blanco sobre verde vivo. Los colores de error, advertencia, éxito o rol comunican estado y no sustituyen la paleta de marca. No distinguir estados solo mediante color: conservar texto, icono y/o aria-pressed/aria-current.

Los alias históricos ink, green, line, detail-ink y discovery-ink consumen estos tokens. No crear nuevas variantes de verdes mediante valores hexadecimales locales.

## Espacio, estructura y forma

- Escala de espacio: múltiplos de 4 px, con unidades de 4, 8, 12, 16, 20, 24, 32, 48 y 64 px.
- Contenido público: máximo 1120 px; paneles de trabajo/tablas: máximo 1280 px. El gutter varía entre 16 y 24 px según el ancho disponible.
- Separación de secciones públicas: 40–64 px; separación ordinaria entre controles: 8–16 px; padding de tarjetas y paneles: 24 px.
- Campos: radio de 12 px. Tarjetas: 16 px. Diálogos: 20 px. Botones y chips: forma de píldora. Fotografías pueden usar radio de 12 px sin un marco de tarjeta.
- Sombras suaves en superficies elevadas. No añadir sombras distintas a cada botón ni movimientos verticales al pasar el cursor.

## Componentes a utilizar

| Necesidad | Componente o contrato |
| --- | --- |
| Acción | Button de components/ui/button; variantes default, outline, secondary, ghost, link y destructive |
| Tamaño de acción | default 44 px; lg 48 px; sm 40 px; xs 32 px para acciones compactas; icon usa el mismo tamaño de área interactiva |
| Buscador principal | Button secondary + lr-brand-accent, size lg; el contenedor compuesto puede ser una píldora |
| Campo de formulario | Input, Select y PhoneNumberInput: 48 px; Textarea: mínimo 96 px |
| Nombre y ayuda del campo | Label y texto auxiliar, asociados mediante htmlFor/id y aria-describedby |
| Superficie | Card; encabezado, contenido y pie de sus componentes compartidos |
| Encabezado de pantalla | PageHeading; title, description, eyebrow y actions |
| Encabezado de sección | SectionHeading; title, description, id, focusable y actions |
| Estado breve | Badge o componente de estado del dominio, con texto explícito |
| Confirmación o formulario modal | Dialog; no recrear otra ventana con tipografía y radios propios |
| Navegación pública | SiteHeader, compartido por portada y detalle |

Las clases históricas button siguen siendo un adaptador visual para formularios existentes. Para componentes nuevos usar Button. Los encabezados que necesitan ref propia conservan lr-page-title, sin tamaños de fuente ni pesos particulares.

## Estados y accesibilidad

Conservar default, hover, focus-visible, disabled, loading e invalid. Los componentes Radix/shadcn usan un anillo de foco de 3 px; los controles nativos usan el mismo token focus como outline. No quitar el foco de todos los descendientes de una tarjeta o sidebar. Mantener labels visibles, textos de error, enlaces de salto, preferencias de idioma/moneda, alto contraste, texto ampliado y reducción de movimiento.

Revisar escritorio y móvil: ausencia de desplazamiento horizontal, títulos legibles, botones sin recortes, campos de 16 px, acciones que puedan envolver y navegación accesible. No resolver un desbordamiento ocultando controles.

## Alcance de esta estandarización

Se revisó el código de las 31 rutas de pantalla y los componentes compartidos de landing, viajeros, reservas, autenticación, CRM, agencias, publicaciones, rutas y vehículos. El sistema se aplica mediante tokens, primitives y estilos de encabezado comunes, sin depender de que una pantalla privada esté abierta durante la edición.

La verificación visual cubre las páginas públicas accesibles y una muestra local de componentes de formularios, tarjetas, estados y acciones. Una sesión privada no disponible no equivale a una prueba visual completa de los datos de cada rol.

## Mantenimiento

1. Modificar una decisión compartida en design-tokens.css.
2. Modificar comportamiento/apariencia de un componente en components/ui.
3. Reservar CSS del módulo para su composición, contenido e imágenes.
4. Ejecutar npm run design:check, TypeScript y build, y revisar las pantallas afectadas en escritorio y móvil.

Las instrucciones para futuras ediciones están también en AGENTS.md. No instalar otra biblioteca visual ni otra fuente para resolver una pantalla aislada.
