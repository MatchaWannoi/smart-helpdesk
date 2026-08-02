import Link from "next/link";
import { auth } from "@/auth";
import AdminDashboardPage from "@/app/admin/page";

export default async function Home() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    return <AdminDashboardPage />;
  }
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI-POWERED SUPPORT</span>
          <h1>แจ้งปัญหาไอที<br/><span>ง่ายขึ้นกว่าเดิม</span></h1>
          <p>ผู้ช่วยอัจฉริยะพร้อมรับเรื่อง วิเคราะห์ปัญหาเบื้องต้น และส่งต่อให้เจ้าหน้าที่ที่เหมาะสม</p>
          <div className="hero-actions">
            <Link className="button-primary" href={session?.user ? "/chat" : "/login"}>{session?.user ? "เริ่มแชทกับ AI" : "เข้าสู่ระบบ"}</Link>
            {session?.user && <Link className="button-secondary" href="/tickets">ดูคำร้องของฉัน</Link>}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orb orb-one"/><div className="orb orb-two"/>
          <div className="bot-card">
            <svg viewBox="0 0 180 160" fill="none">
              <path d="M44 42h92a25 25 0 0 1 25 25v43a25 25 0 0 1-25 25H44a25 25 0 0 1-25-25V67a25 25 0 0 1 25-25Z" fill="white"/>
              <path d="M55 61h70a22 22 0 0 1 22 22v15a22 22 0 0 1-22 22H55a22 22 0 0 1-22-22V83a22 22 0 0 1 22-22Z" fill="#0d3b80"/>
              <circle cx="70" cy="90" r="8" fill="white"/><circle cx="110" cy="90" r="8" fill="white"/>
              <path d="M90 26v16M19 76H8v28h11M161 76h11v28h-11" stroke="#1761dc" strokeWidth="9" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </section>
      <section className="feature-strip">
        <div><b>01</b><span><strong>แจ้งปัญหาได้ทันที</strong><small>พิมพ์คุยกับ AI ได้อย่างเป็นธรรมชาติ</small></span></div>
        <div><b>02</b><span><strong>วิเคราะห์อัตโนมัติ</strong><small>ช่วยตอบและจัดหมวดหมู่ปัญหา</small></span></div>
        <div><b>03</b><span><strong>ติดตามสถานะง่าย</strong><small>ทุกคำร้องอยู่ในที่เดียว</small></span></div>
      </section>
    </main>
  );
}
