import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "ระบบปิดการสมัครสมาชิก กรุณาติดต่อผู้ดูแลระบบเพื่อขอบัญชี" },
    { status: 403 },
  );
}
