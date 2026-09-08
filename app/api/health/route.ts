import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database check, handy when demoing or deploying. */
export async function GET() {
  try {
    const [users, services] = await Promise.all([prisma.user.count(), prisma.service.count()]);
    return NextResponse.json({ status: "ok", database: "connected", users, services });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
