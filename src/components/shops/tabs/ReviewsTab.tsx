import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const ReviewsTab = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8">
      <Construction className="h-16 w-16 text-muted-foreground" />
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">En construction</h3>
        <p className="text-sm text-muted-foreground">
          Cette fonctionnalité sera disponible prochainement.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate(-1)}>
        Retour aux infos
      </Button>
    </div>
  );
};
