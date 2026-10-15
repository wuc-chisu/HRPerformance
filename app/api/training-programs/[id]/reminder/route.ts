import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { getActiveEmployees } from "@/lib/auth-employee";
import { getAuthenticatedEmployee } from "@/lib/current-employee";
import prisma from "@/lib/prisma";
import { isHrAdmin } from "@/lib/rbac";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function requireAdmin(request: Request) {
  const employee = await getAuthenticatedEmployee();
  if (!employee) {
    return { response: NextResponse.json({ error: "You must be signed in." }, { status: 401 }) };
  }
  if (request.headers.get("x-view-mode") === "employee" || !isHrAdmin(employee.systemRole)) {
    return {
      response: NextResponse.json(
        { error: "Training reminders are restricted to HR Admin." },
        { status: 403 }
      ),
    };
  }
  return { employee };
}

async function getReminderProgram(id: string) {
  const [program, activeEmployees] = await Promise.all([
    prisma.trainingProgram.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        appliesTo: true,
        trainingName: true,
        dueDate: true,
        examRequired: true,
        passingScore: true,
        assignments: {
          where: {
            status: "ASSIGNED",
            trainingCycle: { is: { status: "CURRENT" } },
          },
          select: {
            id: true,
            dueDate: true,
            employee: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    }),
    getActiveEmployees(),
  ]);

  if (!program) return null;
  const activeEmployeeIds = new Set(activeEmployees.map(({ id: employeeId }) => employeeId));
  const assignments = program.assignments.filter(({ employee }) => activeEmployeeIds.has(employee.id));
  const assignedEmployeesWithEmail = assignments.filter(({ employee }) => employee.email.trim());
  const appliesToAllEmployees = program.appliesTo.includes("ALL_EMPLOYEES");
  const useAllActiveEmployees = appliesToAllEmployees || assignedEmployeesWithEmail.length === 0;

  return {
    ...program,
    assignments,
    activeEmployees,
    recipientEmployees: useAllActiveEmployees
      ? activeEmployees
          .filter(({ email }) => email.trim())
          .map((employee) => ({
            name: employee.name,
            email: employee.email,
            reminderEmailSentAt: null,
          }))
      : assignedEmployeesWithEmail.map(({ employee }) => ({
          name: employee.name,
          email: employee.email,
          reminderEmailSentAt: null,
        })),
    usingAllEmployeeFallback: useAllActiveEmployees,
    appliesToAllEmployees,
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const program = await getReminderProgram(id);
    if (!program) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }
    if (program.status !== "ACTIVE") {
      return NextResponse.json({ error: "Reminders are only available for active training programs." }, { status: 400 });
    }

    return NextResponse.json({
      courseTitle: program.trainingName,
      dueDate: new Date(program.assignments[0]?.dueDate || program.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
      score: program.examRequired
        ? `${program.passingScore ?? 80}% or higher`
        : "80% or higher",
      employees: program.recipientEmployees,
      usingAllEmployeeFallback: program.usingAllEmployeeFallback,
      appliesToAllEmployees: program.appliesToAllEmployees,
    });
  } catch (error) {
    console.error("Error loading training reminder recipients:", error);
    const message = error instanceof Error ? error.message : "Failed to load training reminder recipients.";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "Failed to load training reminder recipients."
          : message,
      },
      { status: 500 }
    );
  }
}

function parseAddressList(value: unknown) {
  if (typeof value !== "string") return null;
  const addresses = value
    .split(/[;,\n]+/)
    .map((address) => address.trim())
    .filter(Boolean);
  const uniqueAddresses = [...new Set(addresses.map((address) => address.toLowerCase()))];
  const validAddress = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
  return uniqueAddresses.length > 0 && uniqueAddresses.every((address) => validAddress.test(address))
    ? uniqueAddresses
    : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let lastSentAt: Date | null = null;
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const [program, payload] = await Promise.all([
      getReminderProgram(id),
      request.json().catch(() => null),
    ]);
    if (!program) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }
    if (program.status !== "ACTIVE") {
      return NextResponse.json({ error: "Reminders can only be sent for active training programs." }, { status: 400 });
    }

    const to = parseAddressList(payload?.to);
    const cc = payload?.cc === "" ? [] : parseAddressList(payload?.cc);
    const subject = typeof payload?.subject === "string" ? payload.subject.trim() : "";
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!to || (payload?.cc !== "" && !cc) || !subject || !body || /[\r\n]/.test(subject)) {
      return NextResponse.json(
        { error: "Enter valid email addresses, a subject, and an email body." },
        { status: 400 }
      );
    }

    const assignmentsByEmail = new Map<string, (typeof program.assignments)[number][]>();
    for (const assignment of program.assignments) {
      const email = assignment.employee.email.trim().toLowerCase();
      if (!email) continue;
      assignmentsByEmail.set(email, [...(assignmentsByEmail.get(email) || []), assignment]);
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "Email is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });

    const failedRecipients: string[] = [];
    let sentCount = 0;

    for (const email of to) {
      const assignments = assignmentsByEmail.get(email) || [];
      const name =
        assignments[0]?.employee.name ||
        program.activeEmployees.find(
          (employee) => employee.email.trim().toLowerCase() === email
        )?.name ||
        "there";
      const dueDate = new Date(assignments[0]?.dueDate || program.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      const score = program.examRequired
        ? `${program.passingScore ?? 80}% or higher`
        : "80% or higher";
      const replaceTemplateValues = (value: string) =>
        value
          .replace(/\{\{\s*Employee Name\s*\}\}/gi, name)
          .replace(/\{\{\s*course title\s*\}\}/gi, program.trainingName)
          .replace(/\{\{\s*due date\s*\}\}/gi, dueDate)
          .replace(/\{\{\s*score\s*\}\}/gi, score);
      const personalizedBody = replaceTemplateValues(body);
      const personalizedSubject = replaceTemplateValues(subject);
      const trainingSystemUrl =
        "https://accounts.wuc-hr-system-hr-gnhan7-e41e68-3-20-225-73.sslip.io/";
      const html = `<div style="white-space:pre-wrap">${escapeHtml(personalizedBody)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(
          trainingSystemUrl,
          `<a href="${trainingSystemUrl}">${trainingSystemUrl}</a>`
        )}</div>`;

      try {
        await transporter.sendMail({
          from: "hr@wuc.edu",
          to: email,
          cc: cc || undefined,
          subject: personalizedSubject,
          text: personalizedBody.replace(/\*\*([^*]+)\*\*/g, "$1"),
          html,
        });
      } catch (error) {
        console.error(`Error sending training reminder to ${email}:`, error);
        failedRecipients.push(email);
        continue;
      }

      lastSentAt = new Date();
      sentCount += 1;
      await prisma.trainingProgram.update({
        where: { id },
        data: { reminderEmailSentAt: lastSentAt },
      });
      for (const assignment of assignments) {
        await prisma.employeeTrainingAssignment.update({
          where: { id: assignment.id },
          data: { reminderEmailSentAt: lastSentAt },
        });
      }
    }

    if (failedRecipients.length > 0) {
      return NextResponse.json(
        {
          error: `Sent to ${sentCount} recipient(s), but failed for ${failedRecipients.length}: ${failedRecipients.join(", ")}. You can retry for the failed recipients.`,
          reminderEmailSentAt: lastSentAt,
          failedRecipients,
          sentCount,
        },
        { status: 502 }
      );
    }

    const sentAt = lastSentAt || new Date();
    await prisma.trainingProgram.update({
      where: { id },
      data: { reminderEmailSentAt: sentAt },
    });

    return NextResponse.json({ success: true, reminderEmailSentAt: sentAt });
  } catch (error) {
    console.error("Error sending training reminder:", error);
    const message = error instanceof Error ? error.message : "Failed to send training reminder.";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "Failed to send training reminder."
          : message,
        ...(lastSentAt ? { reminderEmailSentAt: lastSentAt } : {}),
      },
      { status: 500 }
    );
  }
}
