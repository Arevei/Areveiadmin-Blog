import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { attachSessionCookie, createSessionToken } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid login request");
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: parsed.data.email });

  if (!user) {
    return jsonError("No account found with that email address.", 404);
  }

  if (!user.active) {
    return jsonError("This account is inactive. Please contact an administrator.", 403);
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return jsonError("Incorrect password.", 401);
  }

  const token = await createSessionToken({
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  attachSessionCookie(response, token);
  return response;
}
