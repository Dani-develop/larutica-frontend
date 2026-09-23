import {
  ApiError,
  apiErrorResponse,
} from "@/lib/api/errors";

import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

import { requireAppSession } from "@/lib/supabase/session";

type PublicationRow = {
  id: string;
  agency_id: string;

  service_type:
    | "EXCURSION"
    | "TRANSPORT"
    | null;

  title: string | null;
  description: string | null;
  destination: string | null;

  price_per_person:
    | number
    | string
    | null;

  duration_minutes: number | null;

  included: string | null;
  not_included: string | null;

  meeting_point: string | null;

  main_image_url: string | null;

  default_capacity: number | null;

  status:
    | "DRAFT"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "INACTIVE";

  created_at: string;
  updated_at: string;
};

type PublicationLanguageRow = {
  publication_id: string;
  language_id: number;
};

type LanguageRow = {
  id: number;
  name: string;
  code: string;
  active: boolean;
};

export async function GET(
  request: Request,
) {
  try {
    /*
     * Si estamos trabajando sin
     * secretos locales de Supabase,
     * la petición se reenvía al
     * backend compartido.
     */
    const remote =
      await proxyRemoteApiRequest(
        request,
      );

    if (remote) {
      return remote;
    }

    /*
     * Validar sesión.
     */
    const appSession =
      await requireAppSession(
        request,
      );

    const role =
      appSession.profile.role;

    /*
     * Solo proveedores pueden
     * administrar publicaciones.
     */
    if (
      role !== "Agencia" &&
      role !== "Transporte"
    ) {
      throw new ApiError(
        "No tienes permisos para consultar publicaciones.",
        403,
      );
    }

    const supabase =
      getSupabaseAdminClient();

    const userId =
      appSession.session.userId;

    /*
     * Buscar la agencia correspondiente
     * al usuario autenticado.
     */
    const {
      data: agency,
      error: agencyError,
    } = await supabase
      .from("agencies")
      .select(
        `
          id,
          commercial_name,
          status
        `,
      )
      .eq(
        "owner_user_id",
        userId,
      )
      .maybeSingle();

    if (agencyError) {
      console.error(
        "Error consultando agencia:",
        agencyError,
      );

      throw new ApiError(
        "No se pudo consultar la agencia del usuario.",
        500,
      );
    }

    /*
     * Si todavía no existe una agencia,
     * devolvemos una lista vacía.
     */
    if (!agency) {
      return Response.json(
        {
          data: [],
        },
        {
          status: 200,
          headers: {
            "cache-control":
              "no-store",
          },
        },
      );
    }

    /*
     * Obtener las publicaciones
     * pertenecientes únicamente a
     * esta agencia.
     */
    const {
      data: publications,
      error: publicationsError,
    } = await supabase
      .from("publications")
      .select(
        `
          id,
          agency_id,
          service_type,
          title,
          description,
          destination,
          price_per_person,
          duration_minutes,
          included,
          not_included,
          meeting_point,
          main_image_url,
          default_capacity,
          status,
          created_at,
          updated_at
        `,
      )
      .eq(
        "agency_id",
        agency.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (publicationsError) {
      console.error(
        "Error consultando publicaciones:",
        publicationsError,
      );

      throw new ApiError(
        "No se pudieron consultar las publicaciones.",
        500,
      );
    }

    const publicationRows =
      (publications ??
        []) as PublicationRow[];

    /*
     * Si no existen publicaciones,
     * terminamos aquí.
     */
    if (
      publicationRows.length === 0
    ) {
      return Response.json(
        {
          data: [],
        },
        {
          status: 200,
          headers: {
            "cache-control":
              "no-store",
          },
        },
      );
    }

    const publicationIds =
      publicationRows.map(
        (publication) =>
          publication.id,
      );

    /*
     * Obtener relaciones
     * publicación -> idioma.
     */
    const {
      data:
        publicationLanguages,
      error:
        publicationLanguagesError,
    } = await supabase
      .from(
        "publication_languages",
      )
      .select(
        `
          publication_id,
          language_id
        `,
      )
      .in(
        "publication_id",
        publicationIds,
      );

    if (
      publicationLanguagesError
    ) {
      console.error(
        "Error consultando idiomas de publicaciones:",
        publicationLanguagesError,
      );

      throw new ApiError(
        "No se pudieron consultar los idiomas de las publicaciones.",
        500,
      );
    }

    const relationRows =
      (
        publicationLanguages ??
        []
      ) as PublicationLanguageRow[];

    /*
     * Extraer IDs únicos de idiomas.
     */
    const languageIds =
      Array.from(
        new Set(
          relationRows.map(
            (relation) =>
              relation.language_id,
          ),
        ),
      );

    let languages:
      LanguageRow[] = [];

    /*
     * Consultar información de los
     * idiomas únicamente si existen
     * relaciones.
     */
    if (
      languageIds.length > 0
    ) {
      const {
        data: languageData,
        error: languagesError,
      } = await supabase
        .from("languages")
        .select(
          `
            id,
            name,
            code,
            active
          `,
        )
        .in(
          "id",
          languageIds,
        );

      if (languagesError) {
        console.error(
          "Error consultando idiomas:",
          languagesError,
        );

        throw new ApiError(
          "No se pudieron consultar los idiomas.",
          500,
        );
      }

      languages =
        (
          languageData ?? []
        ) as LanguageRow[];
    }

    /*
     * Construir una respuesta cómoda
     * para el frontend.
     *
     * Así el frontend no necesita
     * conocer los nombres snake_case
     * utilizados en Supabase.
     */
    const responseData =
      publicationRows.map(
        (publication) => {
          const relations =
            relationRows.filter(
              (relation) =>
                relation.publication_id ===
                publication.id,
            );

          const publicationLanguageIds =
            relations.map(
              (relation) =>
                relation.language_id,
            );

          const publicationLanguages =
            languages.filter(
              (language) =>
                publicationLanguageIds.includes(
                  language.id,
                ),
            );

          return {
            id:
              publication.id,

            agencyId:
              publication.agency_id,

            serviceType:
              publication.service_type,

            title:
              publication.title,

            description:
              publication.description,

            destination:
              publication.destination,

            pricePerPerson:
              publication.price_per_person ===
              null
                ? null
                : Number(
                    publication.price_per_person,
                  ),

            durationMinutes:
              publication.duration_minutes,

            included:
              publication.included,

            notIncluded:
              publication.not_included,

            meetingPoint:
              publication.meeting_point,

            mainImageUrl:
              publication.main_image_url,

            defaultCapacity:
              publication.default_capacity,

            status:
              publication.status,

            languages:
              publicationLanguages.map(
                (language) => ({
                  id:
                    language.id,

                  name:
                    language.name,

                  code:
                    language.code,
                }),
              ),

            languageIds:
              publicationLanguageIds,

            createdAt:
              publication.created_at,

            updatedAt:
              publication.updated_at,
          };
        },
      );

    return Response.json(
      {
        data:
          responseData,
      },
      {
        status: 200,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
    );
  }
}