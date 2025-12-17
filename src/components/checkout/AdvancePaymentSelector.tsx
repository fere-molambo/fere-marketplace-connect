import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AdvancePaymentSelectorProps {
  value: number;
  onChange: (value: number) => void;
  totalAmount: number;
}

export function AdvancePaymentSelector({
  value,
  onChange,
  totalAmount,
}: AdvancePaymentSelectorProps) {
  const [customValue, setCustomValue] = useState("");

  const presets = [
    { label: "100% (Paiement intégral)", value: 100 },
    { label: "50% (Acompte)", value: 50 },
    { label: "30%", value: 30 },
  ];

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 10 && num <= 100) {
      onChange(num);
    }
  };

  const isCustom = !presets.some(p => p.value === value);

  return (
    <div className="space-y-3 pt-2">
      <Label className="text-sm font-medium">Montant à payer maintenant</Label>
      
      <RadioGroup
        value={isCustom ? "custom" : value.toString()}
        onValueChange={(val) => {
          if (val === "custom") return;
          onChange(parseInt(val, 10));
        }}
      >
        <div className="space-y-2">
          {presets.map((preset) => (
            <label
              key={preset.value}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                value === preset.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={preset.value.toString()} />
                <span className="text-sm">{preset.label}</span>
              </div>
              <span className="text-sm font-medium">
                {Math.round(totalAmount * (preset.value / 100)).toLocaleString()} FCFA
              </span>
            </label>
          ))}

          {/* Custom option */}
          <label
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              isCustom ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="custom" />
              <span className="text-sm">Personnalisé</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={isCustom ? value : customValue}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  onFocus={() => {
                    if (!isCustom) {
                      setCustomValue(value.toString());
                    }
                  }}
                  className="w-16 h-7 text-sm"
                  placeholder="10-100"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            {isCustom && (
              <span className="text-sm font-medium">
                {Math.round(totalAmount * (value / 100)).toLocaleString()} FCFA
              </span>
            )}
          </label>
        </div>
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        Le reste sera à payer à la livraison
      </p>
    </div>
  );
}