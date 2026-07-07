"use client";

// "use client" จำเป็นเพราะหน้านี้ต้องใช้ useState (เก็บค่าที่พิมพ์ในฟอร์ม)
// และ event handler (onSubmit) ซึ่งทำงานฝั่ง browser เท่านั้น
// ต่างจาก default ของ Next.js App Router ที่ทุกหน้าเป็น Server Component

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // signIn("credentials", ...) ไปเรียก authorize() ที่เขียนไว้ใน auth.ts
    // redirect: false เพื่อจัดการเองว่าจะทำอะไรต่อ (แสดง error หรือเปลี่ยนหน้า)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    // login สำเร็จ → ไปหน้าแชท (ตามแผน Process 2)
    router.push("/chat");
    router.refresh(); // บังคับให้ server component รู้ว่า session เปลี่ยนแล้ว
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>เข้าสู่ระบบ</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 4 }}>
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 4 }}>
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        {error && (
          <p style={{ color: "red", marginBottom: 16 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10, cursor: "pointer" }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14 }}>
        มีบัญชีอยู่แล้ว? <a href="/register">สมัครสมาชิก</a>
      </p>
    </div>
  );
}
