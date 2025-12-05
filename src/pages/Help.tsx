import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, Video, MessageCircle, Mail, Phone } from "lucide-react";

const Help = () => {
  const faqs = [
    {
      question: "Comment créer un compte vendeur ?",
      answer: "Pour créer un compte vendeur, cliquez sur 'S'inscrire' en haut de la page, puis sélectionnez 'Vendeur' comme type de compte. Remplissez les informations demandées et validez votre inscription."
    },
    {
      question: "Comment ajouter des produits à ma boutique ?",
      answer: "Une fois connecté à votre espace vendeur, accédez à votre boutique via le tableau de bord. Dans l'onglet 'Produits & Services', cliquez sur 'Ajouter un produit' et remplissez le formulaire avec les informations de votre produit."
    },
    {
      question: "Comment fonctionne le système de réservation ?",
      answer: "Pour les services nécessitant une réservation, les clients peuvent sélectionner un créneau disponible dans votre calendrier. Vous recevrez une notification et pourrez confirmer ou refuser la réservation."
    },
    {
      question: "Quels sont les frais de commission ?",
      answer: "Fere prélève une commission de 10% sur chaque vente réalisée. Vous bénéficiez de 30 jours d'essai gratuit avec toutes les fonctionnalités incluses."
    },
    {
      question: "Comment contacter le support ?",
      answer: "Vous pouvez nous contacter par email, téléphone ou via le formulaire de contact en bas de cette page. Notre équipe est disponible pour vous aider du lundi au vendredi."
    },
    {
      question: "Comment créer une vente flash ?",
      answer: "Dans votre tableau de bord, sélectionnez un produit ou service, puis cliquez sur 'Créer une vente flash'. Définissez le prix promotionnel et la durée de l'offre."
    }
  ];

  const tutorials = [
    {
      title: "Premiers pas sur Fere",
      description: "Apprenez à configurer votre boutique et commencer à vendre",
      icon: BookOpen,
    },
    {
      title: "Gérer vos produits",
      description: "Ajoutez, modifiez et organisez votre catalogue",
      icon: BookOpen,
    },
    {
      title: "Optimiser vos ventes",
      description: "Conseils et astuces pour augmenter vos revenus",
      icon: Video,
    },
    {
      title: "Gérer les commandes",
      description: "Suivez et traitez efficacement vos commandes",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Aide & Tutoriels</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trouvez des réponses à vos questions et apprenez à utiliser Fere efficacement
          </p>
        </div>

        {/* Tutorials Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Tutoriels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tutorials.map((tutorial, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <tutorial.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
          <Card>
            <CardContent className="pt-6">
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
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Besoin d'aide supplémentaire ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Chat en direct</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Discutez avec notre équipe support
                </p>
                <Button variant="outline" className="w-full">
                  Démarrer le chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Envoyez-nous un email
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:support@fere.app">Envoyer un email</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Phone className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Téléphone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Appelez-nous directement
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="tel:+22370000000">Appeler</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Help;