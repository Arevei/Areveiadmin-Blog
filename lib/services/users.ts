import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/user";

export async function getUserCount() {
  await connectToDatabase();
  return UserModel.countDocuments();
}

export async function getUsers() {
  await connectToDatabase();
  return UserModel.find().sort({ createdAt: 1 });
}
