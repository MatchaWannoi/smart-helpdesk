import { PrismaClient } from "@prisma/client";

// ปัญหาที่ไฟล์นี้แก้: ตอน dev, Next.js ทำ hot-reload ทุกครั้งที่แก้โค้ด
// ถ้า new PrismaClient() ตรงๆทุกครั้ง จะสร้าง connection ใหม่ซ้อนไปเรื่อยๆ
// จนฐานข้อมูล error "too many connections"
//
// วิธีแก้: เก็บ instance ไว้ใน global object ตัวเดียว ใช้ซ้ำตลอดใน dev mode
// (ตอน production ไม่มีปัญหานี้ เพราะรันแค่ครั้งเดียวไม่ hot-reload)

const RETRYABLE_READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const RETRYABLE_CONNECTION_ERRORS = new Set(["P1001", "P1002", "P2024"]);

function isRetryableConnectionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    RETRYABLE_CONNECTION_ERRORS.has(error.code)
  );
}

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const canRetry = RETRYABLE_READ_OPERATIONS.has(operation);
          const attempts = canRetry ? 3 : 1;

          for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
              return await query(args);
            } catch (error) {
              if (attempt === attempts || !isRetryableConnectionError(error)) {
                throw error;
              }

              await new Promise((resolve) =>
                setTimeout(resolve, attempt === 1 ? 500 : 1_500),
              );
            }
          }

          throw new Error("Database operation failed after retry");
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
