import type { Publication } from "./models/Publication";

export const seedPublications: Publication[] = [
  {
    id: "pub-arenal-01",
    title: "Caminata al volcán Arenal al amanecer",
    destination: "La Fortuna",
    coverUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Sendero guiado entre bosque tropical y miradores del Arenal, con refrigerio local al final.",
    body: `Salimos temprano desde el centro de La Fortuna para aprovechar la luz suave del amanecer.

El recorrido combina tramos de lava antigua, bosque húmedo y pausas interpretativas sobre flora y fauna. Es una experiencia pensada para quienes quieren entender el paisaje, no solo recorrerlo.

Al final compartimos fruta local y un momento corto de preguntas con la guía.`,
    activities: [
      "Caminata interpretativa por senderos del Arenal",
      "Paradas en miradores y zonas de lava",
      "Observación de aves y flora tropical",
      "Refrigerio con fruta local",
    ],
    includes: [
      "Guía naturalista certificada",
      "Entrada al sendero",
      "Transporte desde el centro de La Fortuna",
      "Agua y refrigerio",
    ],
    duration: "4 horas",
    languages: "Español, inglés",
    priceUsd: 58,
    maxGroup: 12,
    status: "Publicada",
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-18T14:30:00.000Z",
  },
  {
    id: "pub-monteverde-02",
    title: "Bosque nuboso de Monteverde",
    destination: "Monteverde",
    coverUrl:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Caminata suave entre neblina, puentes y dosel del bosque nuboso con guía local.",
    body: `Monteverde ofrece una atmósfera distinta: humedad, musgo y una luz filtrada que cambia cada pocos minutos.

Esta publicación describe un recorrido accesible por senderos principales del bosque nuboso, ideal para familias y viajeros que quieren una introducción clara al ecosistema.

La guía combina interpretación ecológica con recomendaciones prácticas para el clima de altura.`,
    activities: [
      "Recorrido por senderos del bosque nuboso",
      "Parada en mirador del dosel",
      "Interpretación de epífitas y aves",
    ],
    includes: [
      "Guía local",
      "Entrada al área protegida",
      "Transporte local de ida y regreso",
    ],
    duration: "3 horas",
    languages: "Español",
    priceUsd: 42,
    maxGroup: 10,
    status: "En revisión",
    createdAt: "2026-08-15T09:00:00.000Z",
    updatedAt: "2026-08-20T11:15:00.000Z",
  },
];
