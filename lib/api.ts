import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAllowedOrigin() {
  return process.env.PUBLIC_BLOG_ALLOWED_ORIGIN || "*";
}

export function withPublicCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", getAllowedOrigin());
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function publicJson(data: unknown, init?: ResponseInit) {
  return withPublicCors(NextResponse.json(data, init));
}

export function publicOptions() {
  return withPublicCors(new NextResponse(null, { status: 204 }));
}
