"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgencyVerificationDocument } from "@/modules/agency/services/admin/admin-agency.service";
import { cn } from "@/lib/utils";

type DocumentKind = "pdf" | "image" | "unknown";

function detectDocumentKind(url: string, pathHint?: string | null): DocumentKind {
  const source = `${pathHint ?? ""} ${url}`.toLowerCase();
  if (source.includes(".pdf") || source.includes("application/pdf")) {
    return "pdf";
  }
  if (
    source.includes(".jpg") ||
    source.includes(".jpeg") ||
    source.includes(".png") ||
    source.includes(".webp") ||
    source.includes("image/")
  ) {
    return "image";
  }
  return "unknown";
}

function DocumentPreviewModal({
  url,
  title,
  kind,
  onClose,
}: {
  url: string;
  title: string;
  kind: DocumentKind;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate !text-sm !font-medium">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 !text-sm text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Nueva pestaña
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 !text-sm text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <a href={url} download>
              <Download className="size-4" />
              Descargar
            </a>
          </Button>
          <button
            type="button"
            aria-label="Cerrar documento"
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <iframe
            src={url}
            title={title}
            className="bg-background size-full max-h-full max-w-5xl rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

type VerificationDocumentViewerProps = {
  agencyId: string;
  hasDocument: boolean;
  documentPath?: string | null;
  title?: string;
  className?: string;
};

export function VerificationDocumentViewer({
  agencyId,
  hasDocument,
  documentPath,
  title = "Documento de verificación",
  className,
}: VerificationDocumentViewerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const kind = useMemo(
    () =>
      signedUrl
        ? detectDocumentKind(signedUrl, documentPath)
        : detectDocumentKind("", documentPath),
    [documentPath, signedUrl],
  );

  async function handleOpen() {
    if (!hasDocument || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getAgencyVerificationDocument(agencyId);
      setSignedUrl(result.url);
      setOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir el documento.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className={cn("bg-card rounded-xl p-5", className)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
                {title}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm!">
                {hasDocument
                  ? "El documento está almacenado de forma privada y el acceso generado es temporal."
                  : "Esta agencia aún no ha cargado un documento de verificación."}
              </p>
              {error ? (
                <p className="text-destructive mt-2 !text-xs" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2 !text-sm"
            disabled={!hasDocument || loading}
            onClick={() => void handleOpen()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}
            {loading ? "Cargando…" : "Ver documento"}
          </Button>
        </div>
      </section>

      {open && signedUrl ? (
        <DocumentPreviewModal
          url={signedUrl}
          title={title}
          kind={kind}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
