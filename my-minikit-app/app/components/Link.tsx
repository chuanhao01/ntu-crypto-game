import React from "react";
import { Button, ButtonProps } from "./DemoComponents";
import NextLink, { LinkProps } from "next/link";

export function Link({
  href,
  children,
  variant = "primary",
  size = "md",
  ...rest
}: LinkProps & {children: React.ReactNode, variant?: ButtonProps["variant"], size?: ButtonProps["size"]}) {
  return (
    <NextLink href={href} {...rest}>
      <Button icon={false} variant={variant} size={size}>
        {children}
      </Button>
    </NextLink>
  );
}
