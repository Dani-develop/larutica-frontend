"use client";

import { SiteBreadcrumb, type BreadcrumbEntry } from "@/components/ui/site-breadcrumb";

/** Migas del panel: "Inicio" apunta al dashboard. Las páginas públicas usan SiteBreadcrumb. */
export function DashboardBreadcrumb({ items, className }: { items: BreadcrumbEntry[]; className?: string }) {
  return <SiteBreadcrumb items={items} homeHref="/dashboard" className={className} />;
}
