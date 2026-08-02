"use client";

import { Category } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FAQItem = { id: string; question: string; answer: string; category: Category | null; keywords: string[] };
const LABEL: Record<Category, string> = { NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้" };
const empty = { question: "", answer: "", category: "", keywords: "" };

export function FAQManagement({ faqs }: { faqs: FAQItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function edit(faq: FAQItem) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category ?? "", keywords: faq.keywords.join(", ") });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs", {
      method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, keywords: form.keywords.split(",") }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error ?? "บันทึกไม่สำเร็จ");
    setForm(empty); setEditingId(null); router.refresh();
  }
  async function remove(id: string) {
    if (!window.confirm("ยืนยันการลบ FAQ นี้?")) return;
    setBusy(true); await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" }); setBusy(false); router.refresh();
  }
  return <div className="faq-layout">
    <form className="faq-form" onSubmit={save}>
      <span className="eyebrow">{editingId ? "EDIT FAQ" : "NEW FAQ"}</span><h2>{editingId ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
      <label>คำถาม<input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required /></label>
      <label>คำตอบ<textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required /></label>
      <label>หมวดหมู่<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">ไม่ระบุ</option>{Object.values(Category).map((c) => <option key={c} value={c}>{LABEL[c]}</option>)}</select></label>
      <label>Keywords (คั่นด้วยจุลภาค)<input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></label>
      {error && <p className="form-error">{error}</p>}
      <div className="faq-form-actions"><button disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก FAQ"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(empty); }}>ยกเลิก</button>}</div>
    </form>
    <div className="faq-list">
      {faqs.length === 0 && <div className="faq-empty"><span>?</span><strong>ยังไม่มี FAQ</strong><p>เริ่มสร้างคำถามแรกจากแบบฟอร์มด้านซ้าย</p></div>}
      {faqs.map((faq) => <article key={faq.id}><div><span>{faq.category ? LABEL[faq.category] : "ทั่วไป"}</span><h3>{faq.question}</h3><p>{faq.answer}</p><small>{faq.keywords.join(" · ") || "ไม่มี keyword"}</small></div><div><button onClick={() => edit(faq)}>แก้ไข</button><button onClick={() => void remove(faq.id)} disabled={busy}>ลบ</button></div></article>)}
    </div>
  </div>;
}
