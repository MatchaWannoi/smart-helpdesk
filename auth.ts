import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // ----- Session strategy -----
  // "jwt" หมายถึง เก็บข้อมูล session ไว้ใน token ที่ฝั่ง client (ไม่ต้อง query DB ทุกครั้งที่เช็ค session)
  session: {
    strategy: "jwt",
  },

  // ----- Providers: วิธี login ที่รองรับ -----
  providers: [
    Credentials({
      // ฟิลด์ที่จะให้ผู้ใช้กรอกตอน login (ใช้ตอนสร้างฟอร์มด้วย)
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      // ฟังก์ชันนี้ถูกเรียกทุกครั้งที่มีคนพยายาม login
      // ต้อง return object user ถ้าถูกต้อง หรือ return null ถ้าผิด
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. หา user จาก email ในฐานข้อมูล
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null; // ไม่เจอ email นี้ในระบบ
        }

        // 2. เทียบ password ที่กรอกมา กับ password ที่ hash เก็บไว้
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null; // password ผิด
        }

        // 3. ถูกต้องทุกอย่าง → return ข้อมูล user (ห้าม return password ออกไปด้วย!)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  // ----- Callbacks: ปรับแต่งข้อมูลที่เก็บใน token/session -----
  callbacks: {
    // เก็บ role ลงใน JWT token ตอน login สำเร็จ
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }

      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },

    // ดึงค่าจาก token มาใส่ใน session ที่ฝั่ง frontend เรียกใช้ได้ (ผ่าน useSession() หรือ auth())
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },

  // ----- หน้า login แบบ custom (ไม่ใช้หน้า default ของ Auth.js) -----
  pages: {
    signIn: "/login",
  },
});
