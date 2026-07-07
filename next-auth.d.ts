import { DefaultSession } from "next-auth";

// ไฟล์นี้ทำหน้าที่ "ขยาย" type เดิมของ next-auth
// เพราะ next-auth ไม่รู้จัก field "role" ที่เราเพิ่มเองใน session/user
// ถ้าไม่มีไฟล์นี้ TypeScript จะฟ้อง error ตอนเรียก session.user.role

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
