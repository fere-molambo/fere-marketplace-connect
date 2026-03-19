import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserAdminSchema,
  createUserPhoneSchema,
  type CreateUserAdminFormData,
  type CreateUserPhoneFormData,
} from "@/lib/validators";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const PHONE_BASED_ROLES = ["vendeur", "livreur", "membre", "equipe"];
const ADMIN_ROLES = ["super_admin", "admin"];

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrateur",
  admin: "Administrateur",
  vendeur: "Vendeur",
  livreur: "Livreur",
  membre: "Membre",
  equipe: "Équipe",
};

export const CreateUserDialog = ({ onUserCreated }: { onUserCreated?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { getCreatableRoles } = useUserRoles();
  const creatableRoles = getCreatableRoles();

  const isPhoneMode = PHONE_BASED_ROLES.includes(selectedRole);

  // Admin form
  const adminForm = useForm<CreateUserAdminFormData>({
    resolver: zodResolver(createUserAdminSchema),
  });

  // Phone form
  const phoneForm = useForm<CreateUserPhoneFormData>({
    resolver: zodResolver(createUserPhoneSchema),
  });

  const activeForm = isPhoneMode ? phoneForm : adminForm;
  const errors = activeForm.formState.errors;

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    if (PHONE_BASED_ROLES.includes(value)) {
      phoneForm.setValue("role", value as any);
    } else {
      adminForm.setValue("role", value as any);
    }
  };

  const onSubmit = async (data: CreateUserAdminFormData | CreateUserPhoneFormData) => {
    try {
      setIsLoading(true);

      let body: Record<string, any>;

      if (isPhoneMode) {
        const d = data as CreateUserPhoneFormData;
        body = {
          nom_complet: d.nom_complet,
          contact: d.contact,
          email: d.email || undefined,
          role: d.role,
          pin: d.pin,
        };
      } else {
        const d = data as CreateUserAdminFormData;
        body = {
          nom_complet: d.nom_complet,
          contact: d.contact || undefined,
          email: d.email,
          password: d.password,
          role: d.role,
        };
      }

      const { data: result, error } = await supabase.functions.invoke('create-user', { body });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success("Utilisateur créé avec succès !");
      adminForm.reset();
      phoneForm.reset();
      setSelectedRole("");
      setOpen(false);
      onUserCreated?.();
    } catch (error: any) {
      console.error("Erreur lors de la création:", error);
      toast.error(error.message || "Erreur lors de la création de l'utilisateur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) { adminForm.reset(); phoneForm.reset(); setSelectedRole(""); }
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Créer utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau compte utilisateur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={activeForm.handleSubmit(onSubmit)} className="space-y-4">
          {/* Role selector first — determines form mode */}
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {creatableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(errors as any).role && (
              <p className="text-sm text-destructive">{(errors as any).role.message}</p>
            )}
          </div>

          {selectedRole && (
            <>
              {/* Nom complet */}
              <div className="space-y-2">
                <Label htmlFor="nom_complet">Nom complet</Label>
                <Input
                  id="nom_complet"
                  {...activeForm.register("nom_complet")}
                  placeholder="Jean Dupont"
                />
                {errors.nom_complet && (
                  <p className="text-sm text-destructive">{errors.nom_complet.message}</p>
                )}
              </div>

              {/* Contact (phone) — required for phone roles, optional for admin */}
              <div className="space-y-2">
                <Label htmlFor="contact">
                  Contact {isPhoneMode ? "" : "(optionnel)"}
                </Label>
                <Input
                  id="contact"
                  {...activeForm.register("contact")}
                  placeholder="+22370123456"
                />
                {(errors as any).contact && (
                  <p className="text-sm text-destructive">{(errors as any).contact.message}</p>
                )}
              </div>

              {/* Email — required for admin, optional for phone roles */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email {isPhoneMode ? "(optionnel)" : ""}
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...activeForm.register("email")}
                  placeholder="jean@example.com"
                />
                {(errors as any).email && (
                  <p className="text-sm text-destructive">{(errors as any).email.message}</p>
                )}
              </div>

              {isPhoneMode ? (
                <>
                  {/* PIN */}
                  <div className="space-y-2">
                    <Label>PIN (6 chiffres)</Label>
                    <InputOTP
                      maxLength={6}
                      value={phoneForm.watch("pin") || ""}
                      onChange={(value) => phoneForm.setValue("pin", value, { shouldValidate: true })}
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    {(errors as any).pin && (
                      <p className="text-sm text-destructive">{(errors as any).pin.message}</p>
                    )}
                  </div>

                  {/* Confirm PIN */}
                  <div className="space-y-2">
                    <Label>Confirmer le PIN</Label>
                    <InputOTP
                      maxLength={6}
                      value={phoneForm.watch("confirmPin") || ""}
                      onChange={(value) => phoneForm.setValue("confirmPin", value, { shouldValidate: true })}
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    {(errors as any).confirmPin && (
                      <p className="text-sm text-destructive">{(errors as any).confirmPin.message}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      {...adminForm.register("password")}
                      placeholder="••••••••"
                    />
                    {(errors as any).password && (
                      <p className="text-sm text-destructive">{(errors as any).password.message}</p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...adminForm.register("confirmPassword")}
                      placeholder="••••••••"
                    />
                    {(errors as any).confirmPassword && (
                      <p className="text-sm text-destructive">{(errors as any).confirmPassword.message}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                adminForm.reset();
                phoneForm.reset();
                setSelectedRole("");
                setOpen(false);
              }}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !selectedRole}>
              {isLoading ? "Création..." : "Créer l'utilisateur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
