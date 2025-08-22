"use client";

import { useState, useEffect } from "react";
import { Card } from "@components/DemoComponents";
import { Link } from "@components/Link";
import { pay } from "@base-org/account";
import { getAuthToken } from "../lib/misc";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

export default function Login() {
  useEffect(() => {
    const authenticated = getAuthToken() !== null;

    if (authenticated) {
      localStorage.removeItem("username");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_id");
    }
    window.location.href = "/";
  }, []);

  return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-[var(--app-foreground-muted)]">Loading...</p>
      </div>
  );
}
