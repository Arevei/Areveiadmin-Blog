import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { canManageUsers } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/user";
import { createUserSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canManageUsers(session.role)) {
    return jsonError("Only admins can manage users.", 403);
  }

  await connectToDatabase();

  const users = await UserModel.find().sort({ createdAt: 1 });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canManageUsers(session.role)) {
    return jsonError("Only admins can manage users.", 403);
  }

  const payload = await request.json();
  const parsed = createUserSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid user request");
  }

  await connectToDatabase();

  const existing = await UserModel.findOne({ email: parsed.data.email });

  if (existing) {
    return jsonError("A user with that email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    active: true,
  });

  return NextResponse.json(
    {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
