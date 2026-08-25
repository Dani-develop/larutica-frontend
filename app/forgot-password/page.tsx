import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña | LaRutica",
  description: "Recupera el acceso a tu cuenta de LaRutica.",
};

export default function Page() {
  return <ForgotPasswordForm />;
}