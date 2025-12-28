import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

// Couleurs prédéfinies courantes
const PRESET_COLORS = [
  { hex: "#000000", name: "Noir" },
  { hex: "#FFFFFF", name: "Blanc" },
  { hex: "#FF0000", name: "Rouge" },
  { hex: "#0000FF", name: "Bleu" },
  { hex: "#008000", name: "Vert" },
  { hex: "#FFFF00", name: "Jaune" },
  { hex: "#FFA500", name: "Orange" },
  { hex: "#800080", name: "Violet" },
  { hex: "#FFC0CB", name: "Rose" },
  { hex: "#808080", name: "Gris" },
  { hex: "#A52A2A", name: "Marron" },
  { hex: "#F5F5DC", name: "Beige" },
];

export interface ColorItem {
  hex: string;
  name: string;
}

// Fonction utilitaire pour normaliser les couleurs (ancien format string -> nouveau format objet)
export const normalizeColor = (color: string | ColorItem): ColorItem => {
  if (typeof color === "object" && color.hex) {
    return color;
  }
  
  // Si c'est déjà un code hex
  if (typeof color === "string" && color.startsWith("#")) {
    const preset = PRESET_COLORS.find(p => p.hex.toLowerCase() === color.toLowerCase());
    return { hex: color, name: preset?.name || color };
  }
  
  // Essayer de mapper un nom FR vers un hex
  const colorNameLower = String(color).toLowerCase().trim();
  const colorMap: Record<string, string> = {
    "noir": "#000000",
    "blanc": "#FFFFFF",
    "rouge": "#FF0000",
    "bleu": "#0000FF",
    "vert": "#008000",
    "jaune": "#FFFF00",
    "orange": "#FFA500",
    "violet": "#800080",
    "rose": "#FFC0CB",
    "gris": "#808080",
    "marron": "#A52A2A",
    "beige": "#F5F5DC",
    "black": "#000000",
    "white": "#FFFFFF",
    "red": "#FF0000",
    "blue": "#0000FF",
    "green": "#008000",
    "yellow": "#FFFF00",
    "purple": "#800080",
    "pink": "#FFC0CB",
    "gray": "#808080",
    "grey": "#808080",
    "brown": "#A52A2A",
  };
  
  if (colorMap[colorNameLower]) {
    return { hex: colorMap[colorNameLower], name: String(color) };
  }
  
  // Fallback: couleur grise avec le nom original
  return { hex: "#808080", name: String(color) };
};

// Fonction pour convertir le format DB (peut être string[] ou ColorItem[]) en ColorItem[]
export const normalizeColors = (colors: unknown[]): ColorItem[] => {
  if (!Array.isArray(colors)) return [];
  return colors.map((c) => normalizeColor(c as string | ColorItem));
};

// Fonction pour obtenir le hex d'une couleur (compatible ancien/nouveau format)
export const getColorHex = (color: string | ColorItem): string => {
  if (typeof color === "object" && color !== null && "hex" in color) {
    return color.hex;
  }
  return normalizeColor(color as string).hex;
};

// Fonction pour obtenir le nom d'une couleur
export const getColorName = (color: string | ColorItem): string => {
  if (typeof color === "object" && color !== null && "name" in color) {
    return color.name;
  }
  return normalizeColor(color as string).name;
};

interface ColorPickerProps {
  colors: ColorItem[];
  onChange: (colors: ColorItem[]) => void;
}

export const ColorPicker = ({ colors, onChange }: ColorPickerProps) => {
  const [customHex, setCustomHex] = useState("#000000");
  const [customName, setCustomName] = useState("");

  const addPresetColor = (preset: typeof PRESET_COLORS[0]) => {
    if (!colors.some(c => c.hex.toLowerCase() === preset.hex.toLowerCase())) {
      onChange([...colors, preset]);
    }
  };

  const addCustomColor = () => {
    if (customHex && !colors.some(c => c.hex.toLowerCase() === customHex.toLowerCase())) {
      const name = customName.trim() || customHex;
      onChange([...colors, { hex: customHex, name }]);
      setCustomName("");
    }
  };

  const removeColor = (hex: string) => {
    onChange(colors.filter(c => c.hex.toLowerCase() !== hex.toLowerCase()));
  };

  return (
    <div className="space-y-3">
      <Label>Couleurs disponibles</Label>
      
      {/* Couleurs prédéfinies */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => {
          const isSelected = colors.some(c => c.hex.toLowerCase() === preset.hex.toLowerCase());
          return (
            <button
              key={preset.hex}
              type="button"
              onClick={() => addPresetColor(preset)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 border-primary" 
                  : "border-muted hover:border-muted-foreground"
              }`}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
            />
          );
        })}
      </div>

      {/* Couleur personnalisée */}
      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Personnalisée</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nom (optionnel)"
              className="w-32"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomColor())}
            />
          </div>
        </div>
        <Button type="button" onClick={addCustomColor} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Couleurs sélectionnées */}
      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {colors.map((color) => (
            <div
              key={color.hex}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border bg-background text-sm"
            >
              <span
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: color.hex }}
              />
              <span>{color.name}</span>
              <button
                type="button"
                onClick={() => removeColor(color.hex)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
