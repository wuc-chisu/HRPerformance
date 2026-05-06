import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      current_database: string;
      current_user: string;
      server_addr: string | null;
      server_port: number | null;
    }>>(
      `SELECT current_database(), current_user, inet_server_addr()::text AS server_addr, inet_server_port() AS server_port`
    );

    const info = rows?.[0];
    if (!info) {
      return NextResponse.json({
        ok: false,
        error: "Unable to read database identity",
      });
    }

    return NextResponse.json({
      ok: true,
      database: info.current_database,
      user: info.current_user,
      server: info.server_addr || "unknown",
      port: info.server_port || null,
    });
  } catch (error) {
    console.error("Error reading database info:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read database info" },
      { status: 500 }
    );
  }
}
