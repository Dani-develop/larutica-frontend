import type {
  TravelerPublication,
} from "../types/traveler-publication.types";

export const travelerPublications: TravelerPublication[] = [
  {
    id: "pub-arenal-01",

    title:
      "Excursión al Volcán Arenal",

    description:
      "Explora los senderos del Arenal acompañado por guías locales y disfruta de los paisajes de La Fortuna.",

    destination:
      "La Fortuna",

    mainImageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",

    pricePerPerson:
      58,

    durationMinutes:
      240,

    included:
      "Guía local, entrada y acompañamiento durante el recorrido.",

    notIncluded:
      "Alimentación y transporte hasta el punto de encuentro.",

    meetingPoint:
      "Parque Central de La Fortuna",

    defaultCapacity:
      20,

    languages: [
      "Español",
      "Inglés",
    ],

    serviceType:
      "EXCURSION",
  },

  {
    id: "pub-monteverde-02",

    title:
      "Bosque Nuboso de Monteverde",

    description:
      "Recorre uno de los bosques nubosos más reconocidos de Costa Rica acompañado por un guía local.",

    destination:
      "Monteverde",

    mainImageUrl:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",

    pricePerPerson:
      65,

    durationMinutes:
      300,

    included:
      "Guía local, entrada al recorrido e información de la zona.",

    notIncluded:
      "Alimentación y transporte externo.",

    meetingPoint:
      "Centro de Monteverde",

    defaultCapacity:
      15,

    languages: [
      "Español",
      "Inglés",
    ],

    serviceType:
      "EXCURSION",
  },
];