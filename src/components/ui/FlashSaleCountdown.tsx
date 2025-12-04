import { useState, useEffect } from "react";
import { Flame } from "lucide-react";

interface FlashSaleCountdownProps {
  endsAt: string;
  flashPrice: number;
  originalPrice: number;
}

export const FlashSaleCountdown = ({ endsAt, flashPrice, originalPrice }: FlashSaleCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endsAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (isExpired) return null;

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs font-medium mb-1">
        <Flame className="h-3 w-3 animate-pulse" />
        <span>VENTE FLASH</span>
        <Flame className="h-3 w-3 animate-pulse" />
      </div>
      <div className="flex items-center justify-center gap-1 text-sm font-bold">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white/20 rounded px-1">{formatNumber(timeLeft.days)}j</span>
            <span>:</span>
          </>
        )}
        <span className="bg-white/20 rounded px-1">{formatNumber(timeLeft.hours)}h</span>
        <span>:</span>
        <span className="bg-white/20 rounded px-1">{formatNumber(timeLeft.minutes)}m</span>
        <span>:</span>
        <span className="bg-white/20 rounded px-1">{formatNumber(timeLeft.seconds)}s</span>
      </div>
      <div className="mt-1 text-xs">
        <span className="font-bold">{flashPrice.toLocaleString()} FCFA</span>
        <span className="line-through ml-2 opacity-75">{originalPrice.toLocaleString()} FCFA</span>
      </div>
    </div>
  );
};

// Compact version for cards
export const FlashSaleBadge = ({ endsAt }: { endsAt: string }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endsAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      setTimeLeft({
        hours: days * 24 + Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (isExpired) return null;

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
      <Flame className="h-3 w-3" />
      <span>{formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}</span>
    </div>
  );
};
