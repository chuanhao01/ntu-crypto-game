export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export async function getUserBalance(username: string): Promise<number> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/balance`,
    {
      method: "GET",
      body: JSON.stringify({
        username: username,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw Error(error);
  }
  const data = await response.json();
  return data.balance as number;
}
