import {
  BadgeCheck,
  MessageSquare,
  CreditCard,
  Truck,
  Sparkles,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: BadgeCheck,
    title: "Vendeurs Vérifiés",
  },
  {
    icon: MessageSquare,
    title: "Négociation Directe",
  },
  {
    icon: CreditCard,
    title: "Paiements Sécurisés",
  },
  {
    icon: Truck,
    title: "Livraison Rapide",
  },
  {
    icon: Sparkles,
    title: "Intelligence IA",
  },
  {
    icon: Share2,
    title: "Réseaux Sociaux",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-6 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold">
            Ce qui nous rend uniques
          </h2>
        </div>

        {/* Desktop: Grid 6 columns */}
        <div className="hidden md:grid md:grid-cols-6 gap-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-background rounded-lg p-3 border text-center hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xs font-medium">{feature.title}</h3>
            </div>
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-24 bg-background rounded-lg p-3 border text-center"
            >
              <div className="w-8 h-8 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-medium leading-tight">{feature.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
