import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Registrarse | LaRutica",
  description: "Crea una cuenta como viajero, agencia o transporte.",
};

export default function Page() {
  return <RegisterForm />;
}
