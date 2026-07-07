import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Middleware ทำงาน "ก่อน" ทุก request ที่ตรงกับ matcher ด้านล่าง
// เหมาะกับการเช็คสิทธิ์ตรงนี้ที่เดียว ดีกว่าไปเช็คซ้ำๆในทุกหน้า

// ----- กำหนดว่าแต่ละ path เข้าได้ต้องมี role อะไร -----
// ใส่ path แบบ "ขึ้นต้นด้วย" (prefix) เพราะ startsWith ใช้เช็ค
const ADMIN_ONLY_PATHS = ["/admin"];
const STAFF_ONLY_PATHS = ["/staff"];
// path ที่แค่ login แล้วเข้าได้ (ไม่จำกัด role เฉพาะ)
const AUTHENTICATED_PATHS = ["/chat", "/tickets"];
// path ที่ห้ามคนที่ login แล้วเข้า (กันไม่ให้กลับไปหน้า login/register ซ้ำ)
const GUEST_ONLY_PATHS = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth; // ข้อมูล session ปัจจุบัน (ถ้า login อยู่)
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const path = nextUrl.pathname;

  const isAdminPath = ADMIN_ONLY_PATHS.some((p) => path.startsWith(p));
  const isStaffPath = STAFF_ONLY_PATHS.some((p) => path.startsWith(p));
  const isAuthPath = AUTHENTICATED_PATHS.some((p) => path.startsWith(p));
  const isGuestPath = GUEST_ONLY_PATHS.some((p) => path.startsWith(p));

  // ----- กรณี 1: หน้า login/register แต่ login อยู่แล้ว -----
  // เช่น login แล้วยังพยายามเข้า /login ซ้ำ → เด้งไป /chat แทน
  if (isGuestPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", nextUrl));
  }

  // ----- กรณี 2: หน้าที่ต้อง login แต่ยังไม่ login -----
  if ((isAdminPath || isStaffPath || isAuthPath) && !isLoggedIn) {
    // ส่ง path เดิมติดไปด้วย เพื่อให้ login เสร็จแล้วเด้งกลับมาหน้าที่ตั้งใจเข้าได้
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // ----- กรณี 3: เข้าหน้า admin แต่ role ไม่ใช่ ADMIN -----
  if (isAdminPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/chat", nextUrl));
  }

  // ----- กรณี 4: เข้าหน้า staff แต่ role ไม่ใช่ STAFF (ADMIN เข้าได้ด้วยก็ได้ ถ้าต้องการ) -----
  if (isStaffPath && role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/chat", nextUrl));
  }

  // ----- ผ่านทุกเงื่อนไข → ให้เข้าได้ตามปกติ -----
  return NextResponse.next();
});

// matcher บอกว่า middleware นี้ควรทำงานกับ path ไหนบ้าง
// ยกเว้น static file, _next (Next.js internal), api/auth (ต้องให้ Auth.js เรียกได้อิสระ)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
