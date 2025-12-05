import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const PriceRangeFilter = ({ 
  minPrice = 0, 
  maxPrice = 1000000, 
  value, 
  onChange 
}: PriceRangeFilterProps) => {
  const [localMin, setLocalMin] = useState(value[0].toString());
  const [localMax, setLocalMax] = useState(value[1].toString());

  useEffect(() => {
    setLocalMin(value[0].toString());
    setLocalMax(value[1].toString());
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    onChange([newValue[0], newValue[1]]);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalMin(val);
    const numVal = parseInt(val) || 0;
    if (numVal >= minPrice && numVal <= value[1]) {
      onChange([numVal, value[1]]);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalMax(val);
    const numVal = parseInt(val) || maxPrice;
    if (numVal >= value[0] && numVal <= maxPrice) {
      onChange([value[0], numVal]);
    }
  };

  const handleMinBlur = () => {
    const numVal = parseInt(localMin) || minPrice;
    const clampedVal = Math.max(minPrice, Math.min(numVal, value[1]));
    setLocalMin(clampedVal.toString());
    onChange([clampedVal, value[1]]);
  };

  const handleMaxBlur = () => {
    const numVal = parseInt(localMax) || maxPrice;
    const clampedVal = Math.max(value[0], Math.min(numVal, maxPrice));
    setLocalMax(clampedVal.toString());
    onChange([value[0], clampedVal]);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR");
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <Slider
          value={value}
          onValueChange={handleSliderChange}
          min={minPrice}
          max={maxPrice}
          step={1000}
          className="w-full"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            value={localMin}
            onChange={handleMinInputChange}
            onBlur={handleMinBlur}
            className="h-9 text-sm"
            min={minPrice}
            max={value[1]}
          />
        </div>
        <span className="text-muted-foreground mt-5">-</span>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            value={localMax}
            onChange={handleMaxInputChange}
            onBlur={handleMaxBlur}
            className="h-9 text-sm"
            min={value[0]}
            max={maxPrice}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {formatPrice(value[0])} FCFA - {formatPrice(value[1])} FCFA
      </p>
    </div>
  );
};
