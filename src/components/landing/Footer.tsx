import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";

export const Footer = () => {
  const { data: settings } = useQuery({
    queryKey: ["platform-settings-footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("app_name, logo_principal, company_email, support_email, support_phone")
        .maybeSingle();
      return data;
    },
  });

  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="mb-4">
              {settings?.logo_principal ? (
                <img
                  src={settings.logo_principal}
                  alt={settings?.app_name || "Fere"}
                  className="h-8 w-auto brightness-0 invert"
                />
              ) : (
                <span className="text-xl font-bold">
                  {settings?.app_name || "Fere"}
                </span>
              )}
            </div>
            <p className="text-sm opacity-80">
              La marketplace qui connecte les vendeurs et prestataires de services
              avec leurs clients au Mali.
            </p>
          </div>

          {/* Pages */}
          <div>
            <h3 className="font-semibold mb-4">Pages</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <Link to="/" className="hover:opacity-100 transition-opacity">
                  Accueil
                </Link>
              </li>
              <li>
                <a href="/#products" className="hover:opacity-100 transition-opacity">
                  Produits
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:opacity-100 transition-opacity">
                  Services
                </a>
              </li>
              <li>
                <Link to="/auth" className="hover:opacity-100 transition-opacity">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <Link to="/cgu" className="hover:opacity-100 transition-opacity">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:opacity-100 transition-opacity">
                  Politique de cookies
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:opacity-100 transition-opacity">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm opacity-80">
              {settings?.company_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${settings.company_email}`}>
                    {settings.company_email}
                  </a>
                </li>
              )}
              {settings?.support_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${settings.support_email}`}>
                    {settings.support_email}
                  </a>
                </li>
              )}
              {settings?.support_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${settings.support_phone}`}>
                    {settings.support_phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Bamako, Mali</span>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex gap-4 mt-4">
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm opacity-70">
          <p>
            © {currentYear} {settings?.app_name || "Fere"}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};
