import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Mail, Phone, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const SUBJECTS = [
  "Question générale",
  "Partenariat",
  "Problème technique",
  "Réclamation",
  "Autre",
];

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-contact"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("support_email, support_phone, app_name")
        .maybeSingle();
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.subject || !form.message.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("contact_requests").insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      subject: form.subject,
      message: form.message.trim(),
    });

    setLoading(false);
    if (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } else {
      toast.success("Votre message a été envoyé avec succès !");
      setForm({ full_name: "", phone: "", email: "", subject: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Contactez-nous
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Une question, une suggestion ou un problème ? Notre équipe est à votre écoute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {settings?.support_email && (
              <div className="flex flex-col items-center text-center p-6 rounded-xl border bg-card">
                <Mail className="h-8 w-8 text-primary mb-3" />
                <p className="font-medium text-foreground mb-1">Email</p>
                <p className="text-sm text-muted-foreground">{settings.support_email}</p>
              </div>
            )}
            {settings?.support_phone && (
              <div className="flex flex-col items-center text-center p-6 rounded-xl border bg-card">
                <Phone className="h-8 w-8 text-primary mb-3" />
                <p className="font-medium text-foreground mb-1">Téléphone</p>
                <p className="text-sm text-muted-foreground">{settings.support_phone}</p>
              </div>
            )}
            <div className="flex flex-col items-center text-center p-6 rounded-xl border bg-card">
              <MessageSquare className="h-8 w-8 text-primary mb-3" />
              <p className="font-medium text-foreground mb-1">Formulaire</p>
              <p className="text-sm text-muted-foreground">Réponse sous 24-48h</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Votre nom"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+223 XX XX XX XX"
                  maxLength={20}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="votre@email.com"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet *</Label>
                <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un sujet" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décrivez votre demande..."
                rows={5}
                maxLength={2000}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Envoi en cours..." : "Envoyer le message"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
