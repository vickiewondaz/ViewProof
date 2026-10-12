import * as React from "react";
import { cn } from "@/lib/utils";

// Frosted reading surface. Hierarchy comes from fill + content, not new colors.
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass rounded-2xl", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 md:p-6", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardContent };
