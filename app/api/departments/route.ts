import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/current-employee";
import { isHrAdmin } from "@/lib/rbac";

// GET all departments
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST - Create a new department
export async function POST(request: Request) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isHrAdmin(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "Only HR Admin can create departments." },
        { status: 403 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    // Check if department already exists
    const existing = await prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Department already exists" },
        { status: 409 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
