import { handlers } from "@/auth";

// ไฟล์นี้สั้นมาก เพราะ logic ทั้งหมดถูกเขียนไว้ใน auth.ts แล้ว
// ไฟล์นี้แค่ "export" handler ออกมาให้ Next.js รู้ว่าต้องเรียกอะไรตอนมี
// request เข้ามาที่ path /api/auth/* (เช่น /api/auth/signin, /api/auth/signout, /api/auth/session)
//
// [...nextauth] คือ "catch-all route" ของ Next.js
// หมายถึง path ย่อยอะไรก็ตามที่ตามหลัง /api/auth/ จะถูกจับมาที่ไฟล์นี้ไฟล์เดียว

export const { GET, POST } = handlers;
