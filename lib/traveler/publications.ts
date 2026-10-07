import { publicationDepartures } from "./availability";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";

type PublicationRow = {
  id: string;
  agency_id: string;
  title: string | null;
  description: string | null;
  destination: string | null;
  price_per_person: number | string | null;
  duration_minutes: number | null;
  included: string | null;
  not_included: string | null;
  meeting_point: string | null;
  main_image_url: string | null;
  default_capacity: number | null;
  service_type: string | null;
};

type PublicationLanguageRow = {
  publication_id: string;
  language_id: number;
};

type LanguageRow = { id: number; name: string };
type AgencyRow = { id: string; agency_name: string; commercial_name: string };

const PUBLICATION_COLUMNS =
  "id, agency_id, title, description, destination, price_per_person, duration_minutes, included, not_included, meeting_point, main_image_url, default_capacity, service_type";

export async function listTravelerPublications(
  admin: SupabaseClient,
  publicationIds?: string[],
): Promise<TravelerPublication[]> {
  if (publicationIds && publicationIds.length === 0) return [];

  let query = admin
    .from("publications")
    .select(PUBLICATION_COLUMNS)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false });

  if (publicationIds) query = query.in("id", publicationIds);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as PublicationRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const agencyIds = [...new Set(rows.map((row) => row.agency_id))];
  const [departures, agencyResult, languageResult] = await Promise.all([
    publicationDepartures(admin, ids),
    admin.from("agencies").select("id, agency_name, commercial_name").in("id", agencyIds).eq("status", "APPROVED"),
    admin.from("publication_languages").select("publication_id, language_id").in("publication_id", ids),
  ]);
  if (agencyResult.error) throw agencyResult.error;
  if (languageResult.error) throw languageResult.error;
  const agenciesById = new Map(((agencyResult.data ?? []) as AgencyRow[]).map(agency => [agency.id, agency]));
  const publicationLanguageData = languageResult.data;

  const publicationLanguages = (publicationLanguageData ?? []) as PublicationLanguageRow[];
  const languageIds = [...new Set(publicationLanguages.map((row) => row.language_id))];
  const languagesById = new Map<number, string>();

  if (languageIds.length > 0) {
    const { data: languageData, error: languageError } = await admin
      .from("languages")
      .select("id, name")
      .in("id", languageIds);
    if (languageError) throw languageError;
    for (const language of (languageData ?? []) as LanguageRow[]) {
      languagesById.set(Number(language.id), language.name);
    }
  }

  const languagesByPublication = new Map<string, string[]>();
  for (const row of publicationLanguages) {
    const name = languagesById.get(Number(row.language_id));
    if (!name) continue;
    const names = languagesByPublication.get(row.publication_id) ?? [];
    names.push(name);
    languagesByPublication.set(row.publication_id, names);
  }

  return rows.filter(row => agenciesById.has(row.agency_id)).map((row) => {
    const agency = agenciesById.get(row.agency_id);
    if (
      !row.title
      || !row.description
      || !row.destination
      || row.price_per_person === null
      || !row.duration_minutes
      || !row.included
      || !row.not_included
      || !row.meeting_point
      || !row.default_capacity
      || !agency
      || !["EXCURSION", "TRANSPORT"].includes(row.service_type ?? "")
    ) {
      console.error("Publicación aprobada incompleta:", row.id);
      throw new ApiError("Una publicación aprobada no tiene todos sus datos.", 500);
    }

    return {
      departures: departures.filter(d => d.publicationId === row.id).map(({ id, startAt, available }) => ({ id, startAt, available })),
      id: row.id,
      title: row.title,
      description: row.description,
      destination: row.destination,
      mainImageUrl: row.main_image_url,
      pricePerPerson: Number(row.price_per_person),
      durationMinutes: row.duration_minutes,
      included: row.included,
      notIncluded: row.not_included,
      meetingPoint: row.meeting_point,
      defaultCapacity: row.default_capacity,
      languages: languagesByPublication.get(row.id) ?? [],
      serviceType: row.service_type as TravelerPublication["serviceType"],
      providerName: agency.commercial_name || agency.agency_name,
      providerSlug: (agency.commercial_name || agency.agency_name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    };
  });
}
