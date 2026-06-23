import { NextResponse } from "next/server";

/**
 * Basic-user registration endpoint (server-side). The browser posts { name,
 * email, password } here; this route forwards it to the NestJS API's internal
 * POST /auth/register with the shared x-internal-secret (which never reaches the
 * client). On success the client then signs in via the user-credentials
 * provider to establish the session.
 */

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:4000";

export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_INTERNAL_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.AUTH_INTERNAL_SECRET ?? "",
      },
      body: JSON.stringify({ name, email, password }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the server. Try again." },
      { status: 502 },
    );
  }

  if (res.status === 409) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }

  // Success — the client now calls signIn("user-credentials", …) to log in.
  return NextResponse.json({ ok: true }, { status: 201 });
}
