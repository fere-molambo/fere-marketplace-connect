import { Clock, Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusIconProps {
  status: string;
  className?: string;
}

export function MessageStatusIcon({ status, className }: MessageStatusIconProps) {
  switch (status) {
    case "failed":
      return <AlertCircle className={cn("h-3 w-3 text-destructive", className)} />;
    case "pending":
      return <Clock className={cn("h-3 w-3 opacity-70", className)} />;
    case "sent":
      return <Check className={cn("h-3 w-3 opacity-70", className)} />;
    case "read":
      return <CheckCheck className={cn("h-3 w-3 text-blue-400", className)} />;
    default:
      return null;
  }
}
