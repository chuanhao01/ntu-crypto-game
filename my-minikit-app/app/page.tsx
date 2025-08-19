"use client";

import { Card } from "./components/DemoComponents";
import { Link } from "./components/Link";

export default function App() {

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="My First Mini App">
        <div className="grid grid-cols-4 gap-x-2">
          <Link href={`/login`}>Login</Link>
          <Link href={`/signup`}>Sign Up</Link>
        </div>
      </Card>
    </div>
  );
}
