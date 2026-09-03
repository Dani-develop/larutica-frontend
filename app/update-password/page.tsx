import type { Metadata } from "next";
import UpdatePasswordForm from "./UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Cambiar contraseña | LaRutica",
  description: "Crea una nueva contraseña para tu cuenta.",
};

export default function Page() {
  return <UpdatePasswordForm />;
}
