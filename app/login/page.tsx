"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";

function LoginIcon({ name }: { name: "enter" | "mail" | "lock" | "arrow" }) {
  const paths = {
    enter: <><path d="M13 5h6v14h-6" /><path d="m10 8 4 4-4 4M4 12h10" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };

  return <svg className="login-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

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

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      // Keep the overlay visible while the authenticated page is rendering.
      router.push("/");
      router.refresh();
    } catch {
      setError("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      {loading && (
        <PageTransitionPopup
          title="กำลังเข้าสู่ระบบ..."
          description="กำลังตรวจสอบบัญชีและเตรียมหน้าสำหรับคุณ"
        />
      )}
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
          <div className="login-heading"><span className="login-icon"><LoginIcon name="enter" /></span><div><h2>ยินดีต้อนรับ</h2><p>เข้าสู่ระบบเพื่อใช้งาน Smart Helpdesk</p></div></div>
          <form onSubmit={handleSubmit} className="form-stack">
            <label htmlFor="email">อีเมล</label>
            <div className="input-wrap"><span><LoginIcon name="mail" /></span><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required disabled={loading} /></div>
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="input-wrap"><span><LoginIcon name="lock" /></span><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่านของคุณ" required disabled={loading} /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}<span><LoginIcon name="arrow" /></span></button>
          </form>
          <p className="login-note">ยังไม่มีบัญชี? กรุณาติดต่อผู้ดูแลระบบขององค์กร</p>
        </div>
      </section>
    </main>
  );
}
