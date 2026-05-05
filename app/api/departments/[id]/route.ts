import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT - Update a department
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { name } = await request.json();
    const { id } = await context.params;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    // Check if another department has this name
    const existing = await prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "Department name already in use" },
        { status: 409 }
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a department
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if any employees have this department
    const employeeCount = await prisma.employee.count({
      where: { department: (await prisma.department.findUnique({ where: { id } }))?.name || "" },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete department with assigned employees" },
        { status: 409 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
