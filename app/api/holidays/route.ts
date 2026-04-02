import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const holidays = await (prisma as any).holiday.findMany({
      where: year ? { year } : undefined,
      orderBy: [{ date: "asc" }],
    });

    return NextResponse.json(
      holidays.map((holiday: any) => ({
        id: holiday.id,
        name: holiday.name,
        date: holiday.date.toISOString().split("T")[0],
        year: holiday.year,
        isPaid: holiday.isPaid,
        notes: holiday.notes || "",
      }))
    );
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, date, isPaid, notes } = body;

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const dateObj = parseDateForDatabase(date);

    const created = await (prisma as any).holiday.create({
      data: {
        name,
        date: dateObj,
        year: dateObj.getUTCFullYear(),
        isPaid: Boolean(isPaid),
        notes: notes || null,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        date: created.date.toISOString().split("T")[0],
        year: created.year,
        isPaid: created.isPaid,
        notes: created.notes || "",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: "Failed to create holiday", details: String(error) },
      { status: 500 }
    );
  }
}
