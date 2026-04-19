import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, type UserRole } from "@/lib/constants";

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
};

function getSessionSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-in-production");
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    return {
      userId: String(payload.userId),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as UserRole,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

const cookieConfig = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    ...cookieConfig,
    value: token,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    ...cookieConfig,
    value: "",
    maxAge: 0,
  });
}
