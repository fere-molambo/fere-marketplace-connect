import { z } from "zod";

// Schema pour la connexion (email OU téléphone)
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email ou numéro de téléphone requis")
    .refine(
      (val) => {
        // Doit être soit un email valide, soit un numéro de téléphone au format international
        const isEmail = z.string().email().safeParse(val).success;
        const isPhone = /^\+\d{10,15}$/.test(val);
        return isEmail || isPhone;
      },
      { message: "Format invalide. Utilisez un email ou un numéro avec indicatif (ex: +22370123456)" }
    ),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// Schema pour l'inscription
export const signupSchema = z.object({
  nom_complet: z
    .string()
    .min(2, "Le nom complet doit contenir au moins 2 caractères")
    .max(100, "Le nom complet est trop long"),
  contact: z
    .string()
    .regex(/^\+\d{10,15}$/, "Format requis: +223XXXXXXXX (indicatif + numéro)"),
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  role: z.enum(["vendeur", "livreur", "membre"], {
    required_error: "Veuillez sélectionner votre rôle",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schema pour la création d'utilisateur (par admin/vendeur)
export const createUserSchema = z.object({
  nom_complet: z
    .string()
    .min(2, "Le nom complet doit contenir au moins 2 caractères")
    .max(100, "Le nom complet est trop long"),
  contact: z
    .string()
    .regex(/^\+\d{10,15}$/, "Format requis: +223XXXXXXXX (indicatif + numéro)"),
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  role: z.enum(["super_admin", "admin", "vendeur", "livreur", "membre", "equipe"], {
    required_error: "Veuillez sélectionner un rôle",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
