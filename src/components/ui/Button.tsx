import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
const base =
  "inline-flex items-center justify-center gap-space-xs rounded px-space-lg py-space-md transition-colors font-headline text-body-md font-bold uppercase tracking-wider";
const variants: Record<Variant, string> = {
  primary: "bg-primary-container text-text-primary hover:bg-accent-red-hover",
  secondary:
    "bg-surface-card border border-border-medium text-text-primary hover:border-text-muted font-code normal-case tracking-normal text-body-sm font-semibold",
  ghost: "text-text-muted hover:text-text-primary font-code normal-case tracking-normal text-body-sm font-semibold",
};

export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/** For tel:, mailto: and external links, which next/link should not handle. */
export function AnchorButton({
  variant = "secondary",
  className = "",
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & ComponentProps<"a">) {
  return (
    <a className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </a>
  );
}
