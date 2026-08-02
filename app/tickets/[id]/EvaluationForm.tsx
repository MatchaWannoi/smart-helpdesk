"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvaluationForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(resolved: boolean) {
    setBusy(true); setError("");
    const response = await fetch(`/api/tickets/${ticketId}/evaluation`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved, rating, comment }),
    });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error ?? "บันทึกไม่สำเร็จ");
    router.refresh();
  }
  return <section className="evaluation-card">
    <span className="eyebrow">RESOLUTION REVIEW</span><h2>ปัญหาได้รับการแก้ไขแล้วหรือไม่?</h2>
    <p>ตรวจสอบวิธีแก้ไขจากเจ้าหน้าที่ หากสำเร็จกรุณาให้คะแนนการบริการ</p>
    <div className="rating-row">{[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} className={value <= rating ? "active" : ""}>★</button>)}</div>
    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)" />
    {error && <p className="form-error">{error}</p>}
    <div className="evaluation-actions"><button disabled={busy} onClick={() => void submit(false)}>ยังแก้ไม่สำเร็จ</button><button disabled={busy} onClick={() => void submit(true)}>ยืนยันและปิดคำร้อง</button></div>
  </section>;
}
