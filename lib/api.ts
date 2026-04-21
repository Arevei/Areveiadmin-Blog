import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAllowedOrigin() {
  return process.env.PUBLIC_BLOG_ALLOWED_ORIGIN || "*";
}

function getAllowedOrigins() {
  return getAllowedOrigin()
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(request?: Request) {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes("*")) {
    return "*";
  }

  const requestOrigin = request?.headers.get("origin");

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || "*";
}

export function withPublicCors(response: NextResponse, request?: Request) {
  const origin = resolveAllowedOrigin(request);

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  if (origin !== "*") {
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export function publicJson(data: unknown, init?: ResponseInit, request?: Request) {
  return withPublicCors(NextResponse.json(data, init), request);
}

export function publicOptions(request?: Request) {
  return withPublicCors(new NextResponse(null, { status: 204 }), request);
}
