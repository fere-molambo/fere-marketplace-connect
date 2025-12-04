import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useEffect } from "react";

interface PartnerLogo {
  logo_url: string;
  name: string;
  link?: string;
}

export const PartnersSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("partner_logos")
        .maybeSingle();
      return data;
    },
  });

  const partnerLogos: PartnerLogo[] = (settings?.partner_logos as unknown as PartnerLogo[] | null) || [];

  // Auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || partnerLogos.length === 0) return;

    let animationId: number;
    let scrollPosition = 0;

    const scroll = () => {
      scrollPosition += 0.5;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, [partnerLogos]);

  if (partnerLogos.length === 0) {
    return null;
  }

  // Duplicate logos for infinite scroll effect
  const displayLogos = [...partnerLogos, ...partnerLogos];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">Fier d'être nos</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            Partenaires et boutiques de confiance
          </h2>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-8 overflow-x-hidden"
          style={{ scrollBehavior: "auto" }}
        >
          {displayLogos.map((partner, index) => (
            <a
              key={index}
              href={partner.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-32 h-16 flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
            >
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="max-w-full max-h-full object-contain"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
