import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";

export async function Navbar() {
  const session = await auth();
  const role = session?.user?.id
    ? await getCurrentUserRole(session.user.id)
    : null;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Smart Helpdesk
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link
                href="/chat"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                แจ้งปัญหา
              </Link>
              <Link
                href="/tickets"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Ticket ของฉัน
              </Link>
              {role === "ADMIN" && (
                <>
                  <Link
                    href="/admin/tickets"
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    มอบหมายเจ้าหน้าที่
                  </Link>
                  <Link
                    href="/admin/users"
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    จัดการบัญชี
                  </Link>
                </>
              )}
              {role === "STAFF" && (
                <Link
                  href="/staff/tickets"
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Ticket ที่ฉันดูแล
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
