import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

type HolidayLocation = "USA" | "Taiwan";

type HolidayRecord = {
  id: string;
  name: string;
  date: Date;
  year: number;
  workLocation: HolidayLocation;
  isPaid: boolean;
  notes: string | null;
};

type HolidayModel = {
  findMany: (args: {
    where?: {
      year?: number;
      workLocation?: HolidayLocation;
    };
    orderBy: Array<{ date: "asc" }>;
  }) => Promise<HolidayRecord[]>;
  create: (args: {
    data: {
      name: string;
      date: Date;
      year: number;
      workLocation: HolidayLocation;
      isPaid: boolean;
      notes: string | null;
    };
  }) => Promise<HolidayRecord>;
};

const holidayModel = (prisma as unknown as { holiday: HolidayModel }).holiday;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const workLocationParam = searchParams.get("workLocation");
    const year = yearParam ? parseInt(yearParam, 10) : null;
    const workLocation = workLocationParam === "Taiwan" || workLocationParam === "USA" ? workLocationParam : null;

    const holidays = await holidayModel.findMany({
      where: {
        ...(year ? { year } : {}),
        ...(workLocation ? { workLocation } : {}),
      },
      orderBy: [{ date: "asc" }],
    });

    return NextResponse.json(
      holidays.map((holiday) => ({
        id: holiday.id,
        name: holiday.name,
        date: holiday.date.toISOString().split("T")[0],
        year: holiday.year,
        workLocation: holiday.workLocation || "USA",
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
    const { name, date, isPaid, notes, workLocation } = body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedNotes = typeof notes === "string" ? notes.trim() : "";

    if (!normalizedName || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const normalizedWorkLocation = workLocation === "Taiwan" ? "Taiwan" : "USA";

    const dateObj = parseDateForDatabase(date);

    const created = await holidayModel.create({
      data: {
        name: normalizedName,
        date: dateObj,
        year: dateObj.getUTCFullYear(),
        workLocation: normalizedWorkLocation,
        isPaid: Boolean(isPaid),
        notes: normalizedNotes || null,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        date: created.date.toISOString().split("T")[0],
        year: created.year,
        workLocation: created.workLocation || "USA",
        isPaid: created.isPaid,
        notes: created.notes || "",
      },
      { status: 201 }
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Holiday already exists for the selected date and location" },
        { status: 409 }
      );
    }

    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: "Failed to create holiday", details: String(error) },
      { status: 500 }
    );
  }
}
