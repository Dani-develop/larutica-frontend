import { PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

export const AUTH_ROLES = ["Viajero", "Agencia", "Transporte"] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export type SignInDto = {
  email: string;
  password: string;
};

export const SignInDtoDefaultValues: SignInDto = {
  email: "",
  password: "",
};

export type SignUpDto = {
  role: AuthRole | "";
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  password: string;
  confirmPassword: string;
  acceptPrivacyPolicy: boolean;
  privacyPolicyVersion: string;
};

export const SignUpDtoDefaultValues: SignUpDto = {
  role: "",
  fullName: "",
  email: "",
  phone: "",
  companyName: "",
  password: "",
  confirmPassword: "",
  acceptPrivacyPolicy: false,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
};

export const ROLE_OPTIONS: {
  value: AuthRole;
  title: string;
  description: string;
}[] = [
  {
    value: "Viajero",
    title: "Viajero",
    description: "Explora tours, guarda experiencias y arma tu ruta.",
  },
  {
    value: "Agencia",
    title: "Agencia",
    description: "Publica excursiones y gestiona tus servicios.",
  },
  {
    value: "Transporte",
    title: "Transporte",
    description: "Ofrece traslados y rutas entre destinos.",
  },
];
