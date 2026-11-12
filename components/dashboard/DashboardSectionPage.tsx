"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardSectionPageProps = {
  title: string;
  description: string;
};

export function DashboardSectionPage({
  title,
  description,
}: DashboardSectionPageProps) {
  const { t } = usePreferences();
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeading title={t(title)} description={t(description)} eyebrow={<DashboardBreadcrumb className="mb-2" items={[{ label: title }]} />} />
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>{t("En construcción")}</CardTitle>
            <CardDescription>{t("Aquí irá el contenido de ")}{t(title).toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("Esta sección usa los componentes nativos de shadcn/ui. ")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
