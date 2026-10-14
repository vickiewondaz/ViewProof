import * as React from "react";
import { cn } from "@/lib/utils";

// Solid prestige surface. Hierarchy from content, not effects.
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass rounded-[22px]", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 md:p-7", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardContent };
