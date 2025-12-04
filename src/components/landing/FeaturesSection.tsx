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
    description:
      "Tous nos partenaires sont vérifiés pour garantir la qualité et la fiabilité de leurs produits et services.",
  },
  {
    icon: MessageSquare,
    title: "Négociation Directe",
    description:
      "Discutez directement avec les vendeurs pour négocier les prix et obtenir les meilleures offres.",
  },
  {
    icon: CreditCard,
    title: "Paiements Sécurisés",
    description:
      "Plusieurs options de paiement sécurisées pour vos transactions en toute confiance.",
  },
  {
    icon: Truck,
    title: "Livraison Rapide",
    description:
      "Service de livraison fiable et rapide partout au Mali avec suivi en temps réel.",
  },
  {
    icon: Sparkles,
    title: "Intelligence Artificielle",
    description:
      "Recommandations personnalisées et assistance IA pour une expérience optimale.",
  },
  {
    icon: Share2,
    title: "Réseaux Sociaux Intégrés",
    description:
      "Partagez vos produits favoris et découvrez les tendances sur les réseaux sociaux.",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Fonctionnalités
          </h2>
          <p className="text-lg text-muted-foreground">
            Ce qui nous rend si uniques !
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-background rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
