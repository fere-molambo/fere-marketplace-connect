import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface ShopViewToggleProps {
  viewMode: "cards" | "list";
  setViewMode: (mode: "cards" | "list") => void;
}

export const ShopViewToggle = ({ viewMode, setViewMode }: ShopViewToggleProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant={viewMode === "cards" ? "default" : "outline"}
        size="sm"
        onClick={() => setViewMode("cards")}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Cards
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "outline"}
        size="sm"
        onClick={() => setViewMode("list")}
      >
        <List className="mr-2 h-4 w-4" />
        Liste
      </Button>
    </div>
  );
};
