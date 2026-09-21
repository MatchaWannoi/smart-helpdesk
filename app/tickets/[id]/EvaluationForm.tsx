"use client";

import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useRenderedOperation } from "@/hooks/useRenderedOperation";

export function EvaluationForm({ ticketId }: { ticketId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const confirmAction = useConfirmDialog();
  const { operation, isWorking: busy, begin, cancel, finishWithRefresh } = useRenderedOperation();
  async function submit(resolved: boolean) {
    if (!(await confirmAction({
      title: resolved ? "ยืนยันและปิดคำร้องหรือไม่?" : "ส่งกลับให้เจ้าหน้าที่หรือไม่?",
      description: resolved ? "ระบบจะบันทึกคะแนน หยุดเวลา และปิดคำร้องนี้" : "คำร้องจะถูกส่งกลับเพื่อให้เจ้าหน้าที่ดำเนินการแก้ไขต่อ",
      confirmLabel: resolved ? "ยืนยันและปิดคำร้อง" : "ส่งกลับเจ้าหน้าที่",
      variant: resolved ? "default" : "danger",
    }))) return;
    setError("");
    begin({
      title: resolved ? "กำลังยืนยันและปิดคำร้อง..." : "กำลังส่งคำร้องกลับให้เจ้าหน้าที่...",
      description: "กรุณารอสักครู่ ระบบกำลังบันทึกและแสดงสถานะล่าสุด",
    });
    try {
      const response = await fetch(`/api/tickets/${ticketId}/evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
        body: JSON.stringify({ resolved, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
      cancel();
    }
  }
  return <section className="evaluation-card">
    {operation && <PageTransitionPopup {...operation} portalToBody />}
    <span className="eyebrow">RESOLUTION REVIEW</span><h2>ปัญหาได้รับการแก้ไขแล้วหรือไม่?</h2>
    <p>ตรวจสอบวิธีแก้ไขจากเจ้าหน้าที่ หากสำเร็จกรุณาให้คะแนนการบริการ</p>
    <div className="rating-row">{[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} className={value <= rating ? "active" : ""}>★</button>)}</div>
    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)" />
    {error && <p className="form-error">{error}</p>}
    <div className="evaluation-actions"><button disabled={busy} onClick={() => void submit(false)}>{busy ? "กำลังบันทึก..." : "ยังแก้ไม่สำเร็จ"}</button><button disabled={busy} onClick={() => void submit(true)}>{busy ? "กำลังยืนยันและปิดงาน..." : "ยืนยันและปิดคำร้อง"}</button></div>
  </section>;
}
