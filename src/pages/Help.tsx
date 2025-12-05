import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, HelpCircle, Video, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Help = () => {
  const faqs = [
    {
      question: "Comment créer un compte vendeur ?",
      answer: "Pour créer un compte vendeur, cliquez sur 'S'inscrire' dans le menu, puis sélectionnez 'Vendeur' comme type de compte. Remplissez les informations demandées et validez votre inscription."
    },
    {
      question: "Comment ajouter un produit à ma boutique ?",
      answer: "Une fois connecté à votre espace vendeur, accédez à votre boutique et cliquez sur 'Ajouter un produit'. Remplissez les informations du produit (nom, description, prix, photos) et publiez."
    },
    {
      question: "Comment fonctionne le système de réservation ?",
      answer: "Les clients peuvent réserver vos services directement depuis votre page. Ils sélectionnent une date et un créneau disponible, puis confirment leur réservation avec un acompte si nécessaire."
    },
    {
      question: "Quels sont les frais de commission ?",
      answer: "Fere prélève une commission de 10% sur chaque vente réalisée via la plateforme. Vous bénéficiez de 30 jours d'essai gratuit avec toutes les fonctionnalités."
    },
    {
      question: "Comment contacter le support ?",
      answer: "Vous pouvez nous contacter via le formulaire de contact en bas de page, par email ou par téléphone. Notre équipe vous répondra dans les plus brefs délais."
    },
  ];

  const tutorials = [
    {
      title: "Premiers pas sur Fere",
      description: "Découvrez comment créer votre boutique et publier vos premiers produits",
      icon: BookOpen,
    },
    {
      title: "Gérer vos commandes",
      description: "Apprenez à gérer les commandes et les réservations de vos clients",
      icon: Video,
    },
    {
      title: "Optimiser votre boutique",
      description: "Conseils pour améliorer la visibilité de vos produits et services",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Aide & Tutoriels</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Retrouvez toutes les ressources pour bien utiliser Fere et développer votre activité
          </p>
        </div>

        {/* Tutorials Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Tutoriels</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {tutorials.map((tutorial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <tutorial.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Voir le tutoriel
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contact Section */}
        <section className="text-center py-12 bg-muted/30 rounded-lg">
          <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Besoin d'aide supplémentaire ?</h2>
          <p className="text-muted-foreground mb-6">
            Notre équipe support est là pour vous aider
          </p>
          <Button>
            Contacter le support
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Help;