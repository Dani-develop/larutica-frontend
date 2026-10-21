"use client";

import { useParams } from "next/navigation";
import { EditPublicationPage } from "@/modules/publications/components/EditPublicationPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  return <EditPublicationPage id={id} />;
}
