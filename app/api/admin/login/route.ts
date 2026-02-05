import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/admin/session";
import {
  success,
  error,
  UNAUTHORIZED,
  INTERNAL_ERROR,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(error(UNAUTHORIZED, "Password is required"), {
        status: 401,
      });
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      console.error("ADMIN_PASSWORD_HASH not configured");
      return NextResponse.json(
        error(INTERNAL_ERROR, "Server configuration error"),
        { status: 500 },
      );
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);
    if (!isValid) {
      return NextResponse.json(error(UNAUTHORIZED, "Invalid credentials"), {
        status: 401,
      });
    }

    await createSession();
    return NextResponse.json(success({ message: "Login successful" }));
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(error(INTERNAL_ERROR, "An error occurred"), {
      status: 500,
    });
  }
}

