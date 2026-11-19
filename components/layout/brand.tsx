import { Coffee } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The StockPilot wordmark. Links to the dashboard by default. */
export function Brand({ className, href = "/dashboard" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Coffee className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-lg tracking-tight">StockPilot</span>
    </Link>
  );
}
