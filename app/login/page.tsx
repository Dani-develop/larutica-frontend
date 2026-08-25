import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | LaRutica",
  description: "Accede a tu cuenta de LaRutica.",
};

export default function Page() {
  return <LoginForm />;
}
