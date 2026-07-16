"use client";

import { signIn } from "next-auth/react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

interface SignInButtonProps extends Omit<ButtonProps, "onClick"> {
  callbackUrl?: string;
  children: ReactNode;
}

export function SignInButton({
  callbackUrl = "/register",
  children,
  ...props
}: SignInButtonProps) {
  return (
    <Button
      type="button"
      {...props}
      onClick={() => signIn("github", { callbackUrl })}
    >
      {children}
    </Button>
  );
}
