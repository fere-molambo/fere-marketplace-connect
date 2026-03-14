import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = [
  { code: "+225", country: "CI", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { code: "+223", country: "ML", flag: "🇲🇱", label: "Mali" },
  { code: "+221", country: "SN", flag: "🇸🇳", label: "Sénégal" },
  { code: "+226", country: "BF", flag: "🇧🇫", label: "Burkina Faso" },
  { code: "+220", country: "GM", flag: "🇬🇲", label: "Gambie" },
  { code: "+224", country: "GN", flag: "🇬🇳", label: "Guinée" },
  { code: "+228", country: "TG", flag: "🇹🇬", label: "Togo" },
  { code: "+229", country: "BJ", flag: "🇧🇯", label: "Bénin" },
  { code: "+227", country: "NE", flag: "🇳🇪", label: "Niger" },
  { code: "+222", country: "MR", flag: "🇲🇷", label: "Mauritanie" },
] as const;

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullPhone: string) => void;
  disabled?: boolean;
  className?: string;
}

const PhoneInputWithCountry = React.forwardRef<HTMLInputElement, PhoneInputWithCountryProps>(
  ({ value, onChange, disabled, className }, ref) => {
    // Parse the current value to extract country code and local number
    const parsed = React.useMemo(() => {
      for (const c of COUNTRY_CODES) {
        if (value.startsWith(c.code)) {
          return { countryCode: c.code, localNumber: value.slice(c.code.length) };
        }
      }
      return { countryCode: "+225", localNumber: value.replace(/^\+\d{2,3}/, "") };
    }, [value]);

    const handleCountryChange = (newCode: string) => {
      onChange(newCode + parsed.localNumber);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const local = e.target.value.replace(/[^\d]/g, "");
      onChange(parsed.countryCode + local);
    };

    const selectedCountry = COUNTRY_CODES.find(c => c.code === parsed.countryCode) || COUNTRY_CODES[0];

    return (
      <div className={cn("flex gap-2", className)}>
        <Select
          value={parsed.countryCode}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span>{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.code}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span className="text-sm font-medium">{c.code}</span>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          placeholder="0700000000"
          value={parsed.localNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    );
  }
);

PhoneInputWithCountry.displayName = "PhoneInputWithCountry";

export { PhoneInputWithCountry, COUNTRY_CODES };
