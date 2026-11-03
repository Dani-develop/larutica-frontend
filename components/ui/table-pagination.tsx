"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePreferences } from "@/lib/preferences/Preferences"

/** Pagina en el cliente. Vuelve a la primera página cuando cambia la lista recibida. */
export function usePagedRows<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1)
  const [source, setSource] = useState(rows)
  if (source !== rows) {
    setSource(rows)
    setPage(1)
  }
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, totalPages)
  return {
    pageRows: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageSize,
    total: rows.length,
    totalPages,
    setPage,
  }
}

type TablePaginationProps = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function TablePagination({ page, pageSize, total, totalPages, onPageChange }: TablePaginationProps) {
  const { t } = usePreferences()
  if (total <= pageSize) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return (
    <nav aria-label={t("Paginación")} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" role="status">{first}–{last} {t("de")} {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("Ir a la página anterior")}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="text-sm tabular-nums">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label={t("Ir a la página siguiente")}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}

/** Controles extraídos de Gestión de usuarios; no alteran la paginación de cards. */
export function RecordTablePagination({ page, totalPages, onPageChange, showSinglePage = false }: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  showSinglePage?: boolean
}) {
  const { t } = usePreferences()
  const lastPage = Math.max(1, totalPages)
  const currentPage = Math.max(1, Math.min(page, lastPage))
  if (!showSinglePage && lastPage <= 1) return null
  const buttonClass = (enabled: boolean) => [
    "flex size-9 items-center justify-center rounded-full border bg-background shadow-sm transition-colors",
    enabled ? "cursor-pointer hover:bg-muted active:bg-muted" : "pointer-events-none opacity-40",
  ].join(" ")
  return <nav aria-label={t("Paginación")} className="flex w-full items-center justify-between gap-3">
    <button type="button" aria-label={t("Ir a la página anterior")} disabled={currentPage <= 1}
      onClick={() => onPageChange(Math.max(1, currentPage - 1))} className={buttonClass(currentPage > 1)}>
      <ChevronLeft className="size-4" />
    </button>
    <span className="bg-muted/50 rounded-full border px-3 py-1 !text-sm !font-medium tabular-nums">{t("Pág. ")}{currentPage} / {lastPage}</span>
    <button type="button" aria-label={t("Ir a la página siguiente")} disabled={currentPage >= lastPage}
      onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))} className={buttonClass(currentPage < lastPage)}>
      <ChevronRight className="size-4" />
    </button>
  </nav>
}
