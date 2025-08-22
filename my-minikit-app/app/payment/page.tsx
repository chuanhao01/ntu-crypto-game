"use client";

import { useState, useEffect } from "react";
import { Card } from "@components/DemoComponents";
import { Link } from "@components/Link";
import { pay } from "@base-org/account";
import { getAuthToken } from "../lib/misc";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

export default function Login() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [depositAmount, setDepositAmount] = useState(0.01);

  useEffect(() => {
    const authenticated = getAuthToken() !== null;
    setIsAuthenticated(authenticated);

    if (authenticated) {
      const storedUsername = localStorage.getItem("username");
      setUsername(storedUsername || "Player");
      // Game loading is now handled by the Game component
    } else {
      window.location.href = "/";
    }
  }, []);

  async function depositMoney() {
    // console.log(`${depositAmount}`);
    try {
      const payment = await pay({
        amount: `${depositAmount}`,
        to: "0x2bcce5577abF5506Ee865D21031de5221295c816", // Server Wallet
        testnet: true,
      });
      if (payment.id) {
        // If it reaches here, payment is sent
        console.log(`Payment sent! Transaction ID: ${payment.id}`);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/user_deposit`,
          {
            method: "POST",
            body: JSON.stringify({
              username: username,
              amount: depositAmount * 10000000,
              transaction_id: payment.id,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const error = await response.json();
          alert(error.detail || "Login failed");
          return;
        }
        toast("Payment has been made");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    } catch (error) {
      console.error(`Payment failed: ${error.message}`);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-md mx-auto p-4">
      <Card title="Deposit Funds">
        <div className="mt-6 text-center">
          <div className="m-4">
            <p>Amount to deposit: {depositAmount}</p>
            <Slider
              onValueChange={(v) => {
                setDepositAmount(v[0]);
              }}
              max={0.1}
              step={0.01}
            />
          </div>
          <button
            onClick={() => {
              depositMoney().then(() => {});
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Deposit Money
          </button>
        </div>
      </Card>
    </div>
  );
}
