import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface HeroCard {
  image_url: string;
  title: string;
  text: string;
  button_text: string;
  button_link: string;
}

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-hero"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("hero_cards")
        .maybeSingle();
      return data;
    },
  });

  const heroCards: HeroCard[] = (settings?.hero_cards as unknown as HeroCard[] | null) || [
    {
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
      title: "Découvrez nos produits",
      text: "Explorez une large gamme de produits de qualité proposés par nos partenaires vérifiés",
      button_text: "Voir les produits",
      button_link: "/#products",
    },
    {
      image_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800",
      title: "Services à la demande",
      text: "Des prestations professionnelles à portée de main pour tous vos besoins",
      button_text: "Voir les services",
      button_link: "/#services",
    },
    {
      image_url: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800",
      title: "Rejoignez-nous",
      text: "Devenez partenaire et développez votre activité avec Fere",
      button_text: "S'inscrire",
      button_link: "/auth",
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroCards.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroCards.length) % heroCards.length);
  };

  const HeroCard = ({ card, className }: { card: HeroCard; className?: string }) => (
    <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: card.image_url
            ? `url(${card.image_url}?t=${Date.now()})`
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{card.title}</h2>
        <p className="text-sm text-white/80 mb-3 line-clamp-2">{card.text}</p>
        <Link to={card.button_link}>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
          >
            {card.button_text}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <section className="relative">
      {/* Desktop: Masonry Layout */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 p-4">
        {/* First card - tall */}
        {heroCards[0] && (
          <HeroCard card={heroCards[0]} className="h-[500px]" />
        )}
        
        {/* Right column - two smaller cards */}
        <div className="flex flex-col gap-4">
          {heroCards[1] && (
            <HeroCard card={heroCards[1]} className="h-[242px]" />
          )}
          {heroCards[2] && (
            <HeroCard card={heroCards[2]} className="h-[242px]" />
          )}
        </div>
      </div>

      {/* Mobile: Carousel */}
      <div className="md:hidden relative">
        <div className="relative h-[280px] overflow-hidden">
          {heroCards.map((card, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
                index === currentSlide
                  ? "translate-x-0"
                  : index < currentSlide
                  ? "-translate-x-full"
                  : "translate-x-full"
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: card.image_url
                    ? `url(${card.image_url}?t=${Date.now()})`
                    : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h2 className="text-xl font-bold mb-2">{card.title}</h2>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">{card.text}</p>
                <Link to={card.button_link}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                  >
                    {card.button_text}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dots Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {heroCards.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
