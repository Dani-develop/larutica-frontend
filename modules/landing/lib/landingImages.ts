import { normalizeText } from "./searchText";

export const forestImage = "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1000&q=85";
export const mountainsImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85";
export const beachImage = "/playa.jpg";

export const popularDestinations = [
  { name: "La Fortuna", image: mountainsImage },
  { name: "Guanacaste", image: beachImage },
  { name: "Monteverde", image: forestImage },
  { name: "Nosara", image: beachImage },
];

export function destinationImage(name: string) {
  return popularDestinations.find(item => normalizeText(item.name) === normalizeText(name))?.image;
}

export function serviceFallbackImage(serviceType: "EXCURSION" | "TRANSPORT") {
  return serviceType === "TRANSPORT" ? mountainsImage : forestImage;
}
