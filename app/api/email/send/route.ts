import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const to = String(formData.get("to") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const cc = String(formData.get("cc") || "").trim();
    const bcc = String(formData.get("bcc") || "").trim();
    const fromAddress =
      String(formData.get("from") || "").trim() ||
      process.env.HR_EMAIL_FROM ||
      "Human Resource <hr@wuc.edu>";

    if (!to || !subject || !body || !fromAddress) {
      return NextResponse.json(
        { error: "Missing required fields: to, from, subject, and body" },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === "true";

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          error:
            "Email is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in environment variables.",
        },
        { status: 500 }
      );
    }

    // Support both plural and singular attachment keys used by different UIs.
    const files = [
      ...formData.getAll("attachments"),
      ...formData.getAll("attachment"),
    ];
    const attachments = await Promise.all(
      files
        .filter((item): item is File => item instanceof File && item.size > 0)
        .map(async (file) => {
          const bytes = await file.arrayBuffer();
          return {
            filename: file.name,
            content: Buffer.from(bytes),
            contentType: file.type || undefined,
          };
        })
    );

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: body,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
