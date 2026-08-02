"use client";

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
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-brand-line"><span className="mini-bot">✦</span><span><b>SMART HELPDESK</b><small>with AI</small></span></div>
        <div>
          <span className="eyebrow">YOUR SMART IT ASSISTANT</span>
          <h1>มีปัญหาไอที<br/><em>ให้เราช่วยดูแล</em></h1>
          <p>ระบบแจ้งปัญหาและติดตามคำร้อง พร้อม AI ช่วยตอบคำถามและวิเคราะห์ปัญหาเบื้องต้นตลอดเวลา</p>
        </div>
        <div className="login-art" aria-hidden="true"><span>● ●</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-heading"><span className="login-icon">↗</span><div><h2>ยินดีต้อนรับ</h2><p>เข้าสู่ระบบเพื่อใช้งาน Smart Helpdesk</p></div></div>
          <form onSubmit={handleSubmit} className="form-stack">
            <label htmlFor="email">อีเมล</label>
            <div className="input-wrap"><span>✉</span><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required /></div>
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="input-wrap"><span>⌑</span><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่านของคุณ" required /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}<span>→</span></button>
          </form>
          <p className="login-note">ยังไม่มีบัญชี? กรุณาติดต่อผู้ดูแลระบบขององค์กร</p>
        </div>
      </section>
    </main>
  );
}
