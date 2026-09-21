"use client";

import { Category } from "@prisma/client";
import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useRenderedOperation } from "@/hooks/useRenderedOperation";

type FAQItem = { id: string; question: string; answer: string; category: Category | null; keywords: string[] };
const LABEL: Record<Category, string> = { NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้" };
const empty = { question: "", answer: "", category: "", keywords: "" };

export function FAQManagement({ faqs }: { faqs: FAQItem[] }) {
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const confirmAction = useConfirmDialog();
  const { operation, isWorking: busy, begin, cancel, finishWithRefresh } = useRenderedOperation();

  function edit(faq: FAQItem) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category ?? "", keywords: faq.keywords.join(", ") });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!(await confirmAction({
      title: editingId ? "ยืนยันการแก้ไข FAQ" : "ยืนยันการสร้าง FAQ",
      description: editingId ? "ข้อมูลคำถามและคำตอบเดิมจะถูกแทนที่ด้วยข้อมูลใหม่" : "FAQ ใหม่นี้จะถูกเพิ่มเข้าไปในฐานความรู้ของ AI",
      confirmLabel: editingId ? "บันทึกการแก้ไข" : "สร้าง FAQ",
    }))) return;
    setError("");
    begin({
      title: editingId ? "กำลังแก้ไข FAQ..." : "กำลังสร้าง FAQ...",
      description: "กรุณารอสักครู่ ระบบกำลังบันทึกและแสดงข้อมูลล่าสุด",
    });
    try {
      const response = await fetch(editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
        body: JSON.stringify({ ...form, keywords: form.keywords.split(",") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setForm(empty); setEditingId(null); finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
      cancel();
    }
  }
  async function remove(id: string) {
    if (!(await confirmAction({
      title: "ลบ FAQ นี้หรือไม่?",
      description: "FAQ จะถูกนำออกจากฐานความรู้ของ AI และไม่สามารถเรียกคืนได้",
      confirmLabel: "ลบ FAQ",
      variant: "danger",
    }))) return;
    setError("");
    begin({ title: "กำลังลบ FAQ...", description: "กรุณารอสักครู่ ระบบกำลังลบและแสดงรายการล่าสุด" });
    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: { "X-Skip-Global-Activity": "true" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ลบ FAQ ไม่สำเร็จ");
      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ลบ FAQ ไม่สำเร็จ");
      cancel();
    }
  }
  return <>
    {operation && <PageTransitionPopup {...operation} portalToBody />}
    <div className="faq-layout">
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
    </div>
  </>;
}
