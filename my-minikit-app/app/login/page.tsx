"use client";

import { useState } from "react";
import { Card } from "@components/DemoComponents";
import { Link } from "@components/Link";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/login`,
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.detail || "Login failed");
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Store JWT token in localStorage
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("username", data.user.username);

      console.log("Login successful:", data);

      // Redirect to game
      window.location.href = "/";
    } catch (error) {
      setIsLoading(false);
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-md mx-auto p-4">
      <Card title="Login to Crypto Battler">
        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="Enter your username"
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
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[var(--app-foreground-muted)] text-sm">
            Don't have an account?{" "}
            <Link href="/signup" variant="primary">
              Sign up here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" variant="ghost">
            ← Back to Game
          </Link>
        </div>
      </Card>
    </div>
  );
}