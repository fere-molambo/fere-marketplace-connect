import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import fereLogo from "@/assets/fere-logo.webp";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-8 px-4">
        <img src={fereLogo} alt="Fere" className="h-20 w-auto mx-auto mb-8" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-['Space_Grotesk']">
          Bienvenue sur Fere
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          La marketplace qui connecte fournisseurs de produits, prestataires de services et clients.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto">
              Se connecter
            </Button>
          </Link>
          <Link to="/auth?tab=signup">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              S'inscrire
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
