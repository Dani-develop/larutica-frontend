export type AgencyUploadKind =
  | "logo"
  | "cover"
  | "verification";

export interface AgencyUploadResult {
  kind:
    AgencyUploadKind;

  bucket:
    string;

  path:
    string;

  url:
    string | null;

  /*
   * Para logo y cover:
   * value = URL pública
   *
   * Para verification:
   * value = ruta privada
   */
  value:
    string;
}

interface ApiResponse<T> {
  data:
    T;
}

async function readApiError(
  response: Response,
): Promise<string> {
  const body =
    await response
      .json()
      .catch(
        () =>
          null,
      );

  return (
    body?.message ??
    body?.error ??
    "No se pudo cargar el archivo."
  );
}

export async function uploadAgencyFile(
  file: File,
  kind: AgencyUploadKind,
): Promise<AgencyUploadResult> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  formData.append(
    "kind",
    kind,
  );

  const response =
    await fetch(
      "/api/agencies/uploads",
      {
        method:
          "POST",

        credentials:
          "include",

        /*
         * IMPORTANTE:
         * NO colocar Content-Type manualmente.
         *
         * El navegador necesita generar automáticamente
         * el boundary de multipart/form-data.
         */
        body:
          formData,
      },
    );

  if (
    !response.ok
  ) {
    const message =
      await readApiError(
        response,
      );

    throw new Error(
      message,
    );
  }

  const result =
    (await response.json()) as
      ApiResponse<AgencyUploadResult>;

  return result.data;
}