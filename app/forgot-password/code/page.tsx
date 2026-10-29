import type { Metadata } from "next";
import ResetCodeForm from "./ResetCodeForm";

export const metadata: Metadata = {
  title: "Código de recuperación | LaRutica",
  description: "Escribe el código de 5 dígitos para recuperar tu contraseña.",
};

export default function Page() {
  return <ResetCodeForm />;
}
