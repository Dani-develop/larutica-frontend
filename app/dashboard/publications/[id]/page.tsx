"use client";

import { useParams } from "next/navigation";
import { PublicationDetail } from "@/modules/agency/publications/components/PublicationDetail";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return <PublicationDetail id={id} />;
}
