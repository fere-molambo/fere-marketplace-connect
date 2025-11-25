import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ShopStoriesSection = ({ shopId }: { shopId: string }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stories</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une story
        </Button>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune story pour le moment. Ajoutez votre première story!
        </p>
      </div>
    </div>
  );
};
