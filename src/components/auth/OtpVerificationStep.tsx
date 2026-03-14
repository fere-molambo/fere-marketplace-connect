import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OtpVerificationStepProps {
  phone: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isVerifying: boolean;
  devOtp?: string | null;
  smsSent?: boolean;
}

const OtpVerificationStep = ({
  phone,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  devOtp,
  smsSent = true,
}: OtpVerificationStepProps) => {
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (otp.length === 6) {
      await onVerify(otp);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setTimer(300);
      setCanResend(false);
      setOtp("");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Vérification OTP</h3>
        <p className="text-sm text-muted-foreground">
          Un code de vérification a été envoyé au <strong>{phone}</strong>
        </p>
      </div>

      {!smsSent && devOtp && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Mode Test</span> — SMS non délivré. Votre code OTP :
            <span className="ml-2 font-mono text-lg font-bold tracking-widest">{devOtp}</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {timer > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Code valide pendant <strong>{formatTime(timer)}</strong>
        </p>
      )}

      <Button
        onClick={handleVerify}
        className="w-full"
        disabled={otp.length !== 6 || isVerifying}
      >
        {isVerifying ? "Vérification..." : "Vérifier le code"}
      </Button>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={!canResend || isResending}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isResending ? "animate-spin" : ""}`} />
          {canResend ? "Renvoyer le code" : `Renvoyer dans ${formatTime(timer)}`}
        </Button>
      </div>
    </div>
  );
};

export default OtpVerificationStep;
