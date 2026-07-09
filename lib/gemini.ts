import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, Urgency, type FAQ } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

type AiAnalysisResult = {
  category: Category;
  urgency: Urgency;
  confident: boolean;
  suggestedFaqId: string | null;
  aiReplyMessage: string;
};

const fallbackResult: AiAnalysisResult = {
  category: Category.SOFTWARE,
  urgency: Urgency.MEDIUM,
  confident: false,
  suggestedFaqId: null,
  aiReplyMessage:
    "ขออภัยค่ะ ระบบ AI ไม่สามารถวิเคราะห์ข้อความได้ในขณะนี้ กำลังส่งเรื่องต่อให้เจ้าหน้าที่ดูแลค่ะ",
};

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && Object.values(Category).includes(value as Category);
}

function isUrgency(value: unknown): value is Urgency {
  return typeof value === "string" && Object.values(Urgency).includes(value as Urgency);
}

async function getRelevantFaqs(userMessage: string) {
  const allFaqs = await prisma.fAQ.findMany();
  const lowerMsg = userMessage.toLowerCase();

  const matched = allFaqs.filter((faq) =>
    faq.keywords.some((keyword) => lowerMsg.includes(keyword.toLowerCase())),
  );

  return matched.length > 0 ? matched : allFaqs;
}

function buildPrompt(userMessage: string, faqs: FAQ[]) {
  const faqList = faqs
    .map(
      (faq) =>
        `- [id: ${faq.id}] (${faq.category ?? "ไม่ระบุหมวด"}) Q: ${faq.question} | A: ${faq.answer}`,
    )
    .join("\n");

  return `คุณคือ AI ผู้ช่วยของระบบ Helpdesk บริษัทหนึ่ง หน้าที่ของคุณคือวิเคราะห์ข้อความแจ้งปัญหาของผู้ใช้ แล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON

หมวดหมู่ที่มีให้เลือก: NETWORK (เครือข่าย), HARDWARE (ฮาร์ดแวร์), SOFTWARE (ซอฟต์แวร์), ACCOUNT (บัญชีผู้ใช้)
ระดับความเร่งด่วนที่มีให้เลือก: LOW, MEDIUM, HIGH

รายการ FAQ ที่มีอยู่ในระบบ:
${faqList}

ข้อความจากผู้ใช้: "${userMessage}"

ให้วิเคราะห์แล้วตอบกลับเป็น JSON ตาม schema นี้เท่านั้น (ไม่ต้องมี markdown code block ครอบ):
{
  "category": "NETWORK | HARDWARE | SOFTWARE | ACCOUNT",
  "urgency": "LOW | MEDIUM | HIGH",
  "confident": true หรือ false (true ถ้ามั่นใจว่า FAQ ข้อใดข้อหนึ่งตอบปัญหานี้ได้ตรงๆ),
  "suggestedFaqId": "id ของ FAQ ที่ใกล้เคียงที่สุด หรือ null ถ้าไม่มีข้อไหนตรงเลย",
  "aiReplyMessage": "ข้อความสุภาพที่จะตอบกลับผู้ใช้โดยตรง ถ้า confident เป็น true ให้สรุปคำตอบจาก FAQ นั้นเป็นภาษาที่เข้าใจง่าย ถ้า confident เป็น false ให้บอกผู้ใช้ว่ากำลังจะสร้าง ticket ส่งต่อเจ้าหน้าที่"
}`;
}

function parseAiResponse(rawText: string): AiAnalysisResult {
  const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  if (!isCategory(parsed.category) || !isUrgency(parsed.urgency)) {
    throw new Error("Gemini returned an invalid category or urgency");
  }

  return {
    category: parsed.category,
    urgency: parsed.urgency,
    confident: Boolean(parsed.confident),
    suggestedFaqId:
      typeof parsed.suggestedFaqId === "string" ? parsed.suggestedFaqId : null,
    aiReplyMessage:
      typeof parsed.aiReplyMessage === "string" && parsed.aiReplyMessage.trim()
        ? parsed.aiReplyMessage
        : fallbackResult.aiReplyMessage,
  };
}

export async function analyzeMessage(userMessage: string): Promise<AiAnalysisResult> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const faqs = await getRelevantFaqs(userMessage);
    const prompt = buildPrompt(userMessage, faqs);
    const result = await model.generateContent(prompt);

    return parseAiResponse(result.response.text());
  } catch (err) {
    console.error("Gemini analyze error:", err);
    return fallbackResult;
  }
}
