import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/current-employee";
import { isHrAdmin } from "@/lib/rbac";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isHrAdmin(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "Only HR Admin can delete holidays." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Holiday ID is required" }, { status: 400 });
    }

    await (prisma as any).holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Failed to delete holiday", details: String(error) },
      { status: 500 }
    );
  }
}
