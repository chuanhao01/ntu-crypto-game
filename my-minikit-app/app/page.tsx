"use client";

import { Card } from "./components/DemoComponents";
import { Link } from "./components/Link";
import { Game } from "./components/Game";

export default function App() {
  return (
    <div className="space-y-40 animate-fade-in">
      <div className="space-y-6 animate-fade-in max-w-md mx-auto p-4">
        <Card title="Crypto Battler">
          <div className="grid grid-cols-4 gap-x-2">
            <Link href={`/login`}>Login</Link>
            <Link href={`/signup`}>Sign Up</Link>
          </div>
        </Card>
        <Card className="min-h-[600px] p-2">
          <Game />
        </Card>
      </div>
    </div>
  );
}
