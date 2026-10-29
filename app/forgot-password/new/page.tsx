import type { Metadata } from "next";
import NewPasswordForm from "./NewPasswordForm";

export const metadata: Metadata = {
  title: "Nueva contraseña | LaRutica",
  description: "Elige una contraseña nueva para tu cuenta de LaRutica.",
};

export default function Page() {
  return <NewPasswordForm />;
}
