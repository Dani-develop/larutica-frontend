import Link from "next/link";
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
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span className="text-muted-foreground"> / {title}</span>
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            Aquí irá el contenido de {title.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta sección usa los componentes nativos de shadcn/ui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
