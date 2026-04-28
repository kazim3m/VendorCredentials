import { NextResponse } from "next/server";
import { runExpiryCheck } from "@/lib/expiry";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runExpiryCheck();
  return NextResponse.json(result);
}
