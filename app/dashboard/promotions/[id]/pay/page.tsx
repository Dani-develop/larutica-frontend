"use client";

import { useParams } from "next/navigation";
import { PromotionPaymentPage } from "@/modules/promotions/components/PromotionPaymentPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return <PromotionPaymentPage publicationId={id} />;
}
