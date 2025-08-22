"use client";

import { useEffect, useState } from "react";
import { Card } from "./components/DemoComponents";
import { Link } from "./components/Link";
import { Game } from "./components/Game";
import { GameManager } from "./game/GameManager";
// import { getUserBalance } from "./lib/misc";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  // const [userBalance, setUserBalance] = useState(null);

  useEffect(() => {
    const gameManager = GameManager.getInstance();
    const authenticated = gameManager.isAuthenticated();
    setIsAuthenticated(authenticated);

    if (authenticated) {
      const storedUsername = localStorage.getItem("username");
      setUsername(storedUsername || "Player");

      // console.log("we got username ", storedUsername);
      // getUserBalance(storedUsername).then((balance) => {
      //   setUserBalance(balance);
      // });
      // Game loading is now handled by the Game component
    }
  }, []);

  const handleLogout = () => {
    GameManager.getInstance().logout();
  };

  return (
    <div className="space-y-40 animate-fade-in">
      <div className="space-y-6 animate-fade-in max-w-md mx-auto p-4">
        <Card title="Crypto Battler">
          {isAuthenticated ? (
            <div className="space-y-2">
              <p className="text-[var(--app-foreground)] text-sm">
                Welcome back, {username}!
              </p>
              {/* {userBalance &&
              <p>User Balance: {userBalance}</p>
              } */}

              <div className="grid grid-cols-2 gap-x-2">
                <Link href="/payment" variant="primary">
                  Deposit Money
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-500 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2">
              <Link href="/login" variant="primary">
                Login
              </Link>
              <Link href="/signup" variant="secondary">
                Sign Up
              </Link>
            </div>
          )}
        </Card>
        <Card className="min-h-[600px] p-2">
          <Game />
        </Card>
      </div>
    </div>
  );
}
