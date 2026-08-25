"use client";

import { useParams } from "next/navigation";
import { UserDetail } from "@/modules/crm/users/components/UserDetail";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return <UserDetail id={id} />;
}
