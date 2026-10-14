import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Prestige Button: solid pine primary, cream secondary, brass focus. 48px minimum always.
const buttonVariants = cva(
  "inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-[16px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass-500 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-pine-900 text-white shadow-card hover:-translate-y-[1px] hover:bg-pine-950 hover:shadow-raised",
        secondary:
          "border border-line bg-white text-ink-900 shadow-card hover:-translate-y-[1px] hover:shadow-raised",
        destructive: "bg-coral-500 text-white shadow-card hover:-translate-y-[1px]",
        ghost: "text-pine-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "py-3",
        lg: "py-4 text-[18px]",
        sm: "min-h-[44px] py-2 text-[14px]",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
