import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Evidence badges: icon + label + words live in the parent;
// the badge carries tone only. Never a bare "Verified".
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[14px] font-bold [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        confirmed: "border-transparent bg-proof-100 text-ink-900",
        score: "border-transparent bg-sun-100 text-ink-900",
        warn: "border-transparent bg-coral-100 text-ink-900",
        neutral: "border-slate-200 bg-white/70 text-ink-900",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
