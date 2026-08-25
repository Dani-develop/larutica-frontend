export type PublicationStatus = "Publicada" | "Borrador" | "En revisión";

export type Publication = {
  id: string;
  title: string;
  destination: string;
  coverUrl: string;
  excerpt: string;
  body: string;
  activities: string[];
  includes: string[];
  duration: string;
  languages: string;
  priceUsd: number;
  maxGroup: number;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicationInput = Omit<
  Publication,
  "id" | "createdAt" | "updatedAt"
>;

export const emptyPublicationInput: PublicationInput = {
  title: "",
  destination: "La Fortuna",
  coverUrl:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  excerpt: "",
  body: "",
  activities: [""],
  includes: [""],
  duration: "4 horas",
  languages: "Español, inglés",
  priceUsd: 58,
  maxGroup: 12,
  status: "Borrador",
};
