import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PROPERTIES } from "@/data/properties";
import { processServerReservationIntent } from "@/lib/bookingSession";
import type { ServerReservationIntent } from "@/types";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dữ liệu yêu cầu đặt phòng không hợp lệ." },
      { status: 400 }
    );
  }

  const bookingId = `LX-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const result = processServerReservationIntent(
    payload as ServerReservationIntent,
    PROPERTIES,
    {
      bookingId,
      createdAt: new Date().toISOString(),
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(
    { ok: true, booking: result.booking },
    { status: 201 }
  );
}
