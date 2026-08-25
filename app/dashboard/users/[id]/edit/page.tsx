"use client";

import { useParams } from "next/navigation";
import { EditUserPage } from "@/modules/crm/users/components/EditUserPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return <EditUserPage id={id} />;
}
