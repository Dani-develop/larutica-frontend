import { z } from "zod";
import { AUTH_ROLES } from "../models/auth";
import { isOptionalPhoneNumber } from "@/lib/phoneValidation";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

export const signInValidators = z.object({
  email: z
    .email({ message: "Ingresa un correo electrónico válido" })
    .trim()
    .min(1, { message: "El correo es obligatorio" })
    .max(255, { message: "El correo no puede tener más de 255 caracteres" }),
  password: z
    .string()
    .min(1, { message: "La contraseña es obligatoria" })
    .max(128, { message: "La contraseña no puede tener más de 128 caracteres" }),
});

export const signUpValidators = z
  .object({
    role: z.enum(AUTH_ROLES, { message: "Selecciona un tipo de cuenta" }),
    fullName: z
      .string()
      .trim()
      .min(2, { message: "Escribe tu nombre completo" })
      .max(120, { message: "El nombre es demasiado largo" }),
    email: z
      .email({ message: "Ingresa un correo electrónico válido" })
      .trim()
      .min(1, { message: "El correo es obligatorio" })
      .max(255, { message: "El correo no puede tener más de 255 caracteres" }),
    phone: z.string().trim().max(30, { message: "El teléfono es demasiado largo" }).refine(isOptionalPhoneNumber, { message: "Ingresa un número de teléfono válido." }),
    companyName: z
      .string()
      .trim()
      .max(160, { message: "El nombre de la empresa es demasiado largo" }),
    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
      .max(128, { message: "La contraseña no puede tener más de 128 caracteres" }),
    confirmPassword: z.string().min(1, { message: "Confirma tu contraseña" }),
    acceptPrivacyPolicy: z.boolean({ error: "Debes aceptar la política de privacidad para crear tu cuenta." }).refine((accepted) => accepted, { message: "Debes aceptar la política de privacidad para crear tu cuenta." }),
    privacyPolicyVersion: z.string().refine((version) => version === PRIVACY_POLICY_VERSION, { message: "La política de privacidad ha cambiado. Actualiza la página y revisa la versión vigente." }),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }

    if (value.role === "Agencia" || value.role === "Transporte") {
      if (!value.companyName.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message: "El nombre de la empresa es obligatorio",
        });
      }
      if (!value.phone.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "El teléfono es obligatorio para este tipo de cuenta",
        });
      }
    }
  });
