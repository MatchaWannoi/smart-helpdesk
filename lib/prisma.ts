import { PrismaClient } from "@prisma/client";

// ปัญหาที่ไฟล์นี้แก้: ตอน dev, Next.js ทำ hot-reload ทุกครั้งที่แก้โค้ด
// ถ้า new PrismaClient() ตรงๆทุกครั้ง จะสร้าง connection ใหม่ซ้อนไปเรื่อยๆ
// จนฐานข้อมูล error "too many connections"
//
// วิธีแก้: เก็บ instance ไว้ใน global object ตัวเดียว ใช้ซ้ำตลอดใน dev mode
// (ตอน production ไม่มีปัญหานี้ เพราะรันแค่ครั้งเดียวไม่ hot-reload)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
