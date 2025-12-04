import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CTASection = () => {
  const { data: settings } = useQuery({
    queryKey: ["platform-settings-cta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("cta_pre_title, cta_title, cta_text, cta_button_text, cta_button_link, cta_images")
        .maybeSingle();
      return data;
    },
  });

  const ctaImages: string[] = (settings?.cta_images as string[] | null) || [];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12">
            <p className="text-sm opacity-80 mb-2">
              {settings?.cta_pre_title || "Prêt à vous lancer ?"}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-yellow-400">
              {settings?.cta_title || "Commencez dès maintenant gratuitement"}
            </h2>
            <p className="opacity-90 mb-6">
              {settings?.cta_text ||
                "Profitez de 30 jours d'essai gratuit avec toutes les fonctionnalités. Commission de 10% uniquement sur vos ventes."}
            </p>
            <Link to={settings?.cta_button_link || "/auth"}>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                {settings?.cta_button_text || "Je m'inscris maintenant !"}
              </Button>
            </Link>
          </div>

          {/* Images Grid */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            {ctaImages.length > 0 ? (
              <>
                <div className="space-y-4">
                  {ctaImages[0] && (
                    <img
                      src={ctaImages[0]}
                      alt=""
                      className="w-full h-48 object-cover rounded-xl"
                    />
                  )}
                  {ctaImages[1] && (
                    <img
                      src={ctaImages[1]}
                      alt=""
                      className="w-full h-32 object-cover rounded-xl"
                    />
                  )}
                </div>
                <div className="pt-8">
                  {ctaImages[2] && (
                    <img
                      src={ctaImages[2]}
                      alt=""
                      className="w-full h-64 object-cover rounded-xl"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center">
                    <span className="text-muted-foreground">Image 1</span>
                  </div>
                  <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center">
                    <span className="text-muted-foreground">Image 2</span>
                  </div>
                </div>
                <div className="pt-8">
                  <div className="w-full h-64 bg-muted rounded-xl flex items-center justify-center">
                    <span className="text-muted-foreground">Image 3</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
