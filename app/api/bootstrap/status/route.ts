import { NextResponse } from "next/server";

import { getUserCount } from "@/lib/services/users";

export async function GET() {
  const count = await getUserCount();
  return NextResponse.json({ needsSetup: count === 0 });
}
