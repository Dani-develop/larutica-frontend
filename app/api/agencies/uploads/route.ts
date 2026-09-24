import {
  ApiError,
  apiErrorResponse,
  assertSameOrigin,
} from "@/lib/api/errors";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase/admin-client";

import {
  requireAppSession,
} from "@/lib/supabase/session";

type UploadKind =
  | "logo"
  | "cover"
  | "verification";

type UploadConfig = {
  bucket: string;

  folder: string;

  maxSize: number;

  allowedMimeTypes: string[];

  isPublic: boolean;
};

const TWO_MB =
  2 * 1024 * 1024;

const FIVE_MB =
  5 * 1024 * 1024;

const UPLOAD_CONFIG: Record<
  UploadKind,
  UploadConfig
> = {
  logo: {
    bucket:
      "agency-media",

    folder:
      "logos",

    maxSize:
      TWO_MB,

    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
    ],

    isPublic:
      true,
  },

  cover: {
    bucket:
      "agency-media",

    folder:
      "covers",

    maxSize:
      FIVE_MB,

    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
    ],

    isPublic:
      true,
  },

  verification: {
    bucket:
      "agency-documents",

    folder:
      "verification",

    maxSize:
      FIVE_MB,

    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ],

    isPublic:
      false,
  },
};

function isUploadKind(
  value: unknown,
): value is UploadKind {
  return (
    value ===
      "logo" ||
    value ===
      "cover" ||
    value ===
      "verification"
  );
}

function extensionForMimeType(
  mimeType: string,
): string {
  switch (
    mimeType
  ) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/svg+xml":
      return "svg";

    case "application/pdf":
      return "pdf";

    default:
      return "bin";
  }
}

function validateFile(
  file: File,
  config: UploadConfig,
) {
  if (
    file.size <=
    0
  ) {
    throw new ApiError(
      "El archivo está vacío.",
      400,
    );
  }

  if (
    file.size >
    config.maxSize
  ) {
    const maxMegabytes =
      config.maxSize /
      1024 /
      1024;

    throw new ApiError(
      `El archivo supera el límite de ${maxMegabytes} MB.`,
      400,
    );
  }

  if (
    !config.allowedMimeTypes.includes(
      file.type,
    )
  ) {
    throw new ApiError(
      "El tipo de archivo seleccionado no está permitido.",
      400,
    );
  }
}

export async function POST(
  request: Request,
) {
  /*
   * En desarrollo local no tenemos las claves privadas
   * de Supabase.
   *
   * El proxy reenvía la misma petición multipart al
   * backend compartido, donde sí están disponibles.
   */
  const remote =
    await proxyRemoteApiRequest(
      request,
    );

  if (remote) {
    return remote;
  }

  try {
    assertSameOrigin(
      request,
    );

    const appSession =
      await requireAppSession(
        request,
      );

    if (
      ![
        "Agencia",
        "Transporte",
      ].includes(
        appSession.profile.role,
      )
    ) {
      throw new ApiError(
        "Tu cuenta no tiene permisos para cargar archivos de agencia.",
        403,
      );
    }

    const formData =
      await request.formData();

    const kindValue =
      formData.get(
        "kind",
      );

    const fileValue =
      formData.get(
        "file",
      );

    if (
      typeof kindValue !==
        "string" ||
      !isUploadKind(
        kindValue,
      )
    ) {
      throw new ApiError(
        "El tipo de archivo no es válido.",
        400,
      );
    }

    if (
      !(fileValue instanceof File)
    ) {
      throw new ApiError(
        "Debes seleccionar un archivo.",
        400,
      );
    }

    const kind =
      kindValue;

    const file =
      fileValue;

    const config =
      UPLOAD_CONFIG[
        kind
      ];

    validateFile(
      file,
      config,
    );

    const userId =
      appSession.session
        .userId;

    const extension =
      extensionForMimeType(
        file.type,
      );

    /*
     * Ejemplo:
     *
     * logos/<user-id>/<uuid>.png
     *
     * verification/<user-id>/<uuid>.pdf
     */
    const filePath =
      [
        config.folder,
        userId,
        `${crypto.randomUUID()}.${extension}`,
      ].join(
        "/",
      );

    const admin =
      getSupabaseAdminClient();

    const fileBytes =
      new Uint8Array(
        await file.arrayBuffer(),
      );

    const {
      error:
        uploadError,
    } =
      await admin.storage
        .from(
          config.bucket,
        )
        .upload(
          filePath,
          fileBytes,
          {
            contentType:
              file.type,

            cacheControl:
              config.isPublic
                ? "3600"
                : "0",

            upsert:
              false,
          },
        );

    if (
      uploadError
    ) {
      throw uploadError;
    }

    /*
     * Logo y portada:
     * devolvemos URL pública.
     *
     * Documento:
     * nunca generamos una URL pública.
     */
    if (
      config.isPublic
    ) {
      const {
        data:
          publicUrlData,
      } =
        admin.storage
          .from(
            config.bucket,
          )
          .getPublicUrl(
            filePath,
          );

      return Response.json(
        {
          data: {
            kind,

            bucket:
              config.bucket,

            path:
              filePath,

            url:
              publicUrlData
                .publicUrl,

            value:
              publicUrlData
                .publicUrl,
          },
        },

        {
          status:
            201,

          headers: {
            "cache-control":
              "no-store",
          },
        },
      );
    }

    /*
     * El documento es privado.
     *
     * En verificationDocumentUrl guardamos esta
     * ruta interna. Más adelante un administrador
     * podrá solicitar una signed URL temporal.
     */
    return Response.json(
      {
        data: {
          kind,

          bucket:
            config.bucket,

          path:
            filePath,

          url:
            null,

          value:
            filePath,
        },
      },

      {
        status:
          201,

        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return apiErrorResponse(
      error,
    );
  }
}