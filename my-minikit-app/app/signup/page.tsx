"use client";

import { useState } from "react";
import { Card } from "@components/DemoComponents";
import { Link } from "@components/Link";
import { redirect, RedirectType } from "next/navigation";

export default function Signup() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    setIsLoading(true);

    // console.log(values);
    // console.log(`${process.env.NEXT_PUBLIC_BACKEND_URL}/account`);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/account`, {
      method: "POST",
      body: JSON.stringify({ username: username, password: password }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(async (res) => {
      setIsLoading(false);
      if (!res.ok){
        console.log("Create account failed");
        alert("Account creation failed. Please try again.");
        return;
      }
      console.log("Account created successfully");
      // Use window.location for redirect instead of Next.js redirect in client component
      window.location.href = "/";
    }).catch((e) => {
      setIsLoading(false);
      console.log("Create account failed with error");
      console.error(e);
      alert("Network error. Please try again.");
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-md mx-auto p-4">
      <Card title="Join Crypto Battler">
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--app-foreground)] mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-background)] text-[var(--app-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--app-foreground)] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-background)] text-[var(--app-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--app-foreground)] mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-background)] text-[var(--app-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[var(--app-foreground-muted)] text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              variant="primary"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            variant="ghost"
          >
            ← Back to Game
          </Link>
        </div>
      </Card>
    </div>
  );
}