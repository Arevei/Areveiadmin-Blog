import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { attachSessionCookie, createSessionToken } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { getUserCount } from "@/lib/services/users";
import { bootstrapOwnerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const count = await getUserCount();

  if (count > 0) {
    return jsonError("An owner account already exists. Please sign in instead.", 409);
  }

  const payload = await request.json();
  const parsed = bootstrapOwnerSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid setup request");
  }

  await connectToDatabase();

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: "ADMIN",
    active: true,
  });

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
