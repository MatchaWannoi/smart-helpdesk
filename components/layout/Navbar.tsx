import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";

function Icon({ name }: { name: "chat" | "ticket" | "users" | "logout" | "key" | "faq" | "report" }) {
  const paths = {
    chat: <path d="M4 5.5h16v10H9l-5 4v-14Z" />,
    ticket: <><path d="M5 4h14v16H5z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-4 2-6 5.5-6s5 2 5.5 6M15 6.5a3 3 0 0 1 0 5.5M16 14c2.7.3 4 2 4.5 5" /></>,
    logout: <><path d="M10 5H4v14h6M14 8l4 4-4 4M8 12h10" /></>,
    key: <><circle cx="8" cy="12" r="3" /><path d="M11 12h9M17 12v3M20 12v2" /></>,
    faq: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.1.9-1.1 1.8M12 17h.01" /></>,
    report: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function DashboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
}

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Smart Helpdesk">
      <span className="brand-mark">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="5" y="8" width="22" height="17" rx="7" stroke="currentColor" strokeWidth="2.2"/>
          <path d="M16 4v4M3 15H1M31 15h-2M11 25v3h10v-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="2" fill="currentColor"/><circle cx="20" cy="16" r="2" fill="currentColor"/>
        </svg>
      </span>
      <span><strong>SMART HELPDESK</strong><small>with AI</small></span>
    </Link>
  );
}

export async function Navbar() {
  const session = await auth();
  const role = session?.user?.id ? await getCurrentUserRole(session.user.id) : null;

  if (!session?.user) {
    return <header className="public-header"><div className="header-inner"><Brand /><Link href="/login" className="header-login">เข้าสู่ระบบ</Link></div></header>;
  }

  const initial = (session.user.name || session.user.email || "U").charAt(0).toUpperCase();
  const account = (
    <div className="user-summary">
      <div className="user-copy"><strong>{session.user.name || "ผู้ใช้งาน"}</strong><span>{session.user.email}</span></div>
      <span className="avatar">{initial}</span>
    </div>
  );

  if (role !== "ADMIN") {
    return (
      <header className="user-header">
        <Brand />
        <nav className="user-nav" aria-label="เมนูหลัก">
          <Link href="/chat"><Icon name="chat" /><span>แชทกับ AI</span></Link>
          {role === "STAFF"
            ? <Link href="/staff/tickets"><Icon name="ticket" /><span>งานของฉัน</span></Link>
            : <Link href="/tickets"><Icon name="ticket" /><span>คำร้องของฉัน</span></Link>}
          <Link href="/change-password"><Icon name="key" /><span>เปลี่ยนรหัสผ่าน</span></Link>
        </nav>
        <div className="user-header-end">
          {account}
          <form action={async () => { "use server"; await signOut(); }}>
            <button className="top-logout" type="submit" aria-label="ออกจากระบบ"><Icon name="logout" /></button>
          </form>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="admin-page-label">
          <span>ADMIN CONSOLE</span>
          <strong>SMART HELPDESK AI</strong>
        </div>
      </header>
      <aside className="app-sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="เมนูหลัก">
          <Link href="/"><DashboardIcon />หน้าหลัก</Link>
          <Link href="/chat"><Icon name="chat" />แชทกับ AI</Link>
          <Link href="/admin/tickets"><Icon name="ticket" />จัดการคำร้อง</Link>
          <Link href="/admin/users"><Icon name="users" />จัดการผู้ใช้</Link>
          <Link href="/admin/faqs"><Icon name="faq" />จัดการ FAQ</Link>
          <Link href="/admin/reports"><Icon name="report" />รายงาน</Link>
          <Link href="/change-password"><Icon name="key" />เปลี่ยนรหัสผ่าน</Link>
        </nav>
        <div className="sidebar-account">
          <span className="sidebar-avatar">{initial}</span>
          <span className="sidebar-user-copy">
            <strong>{session.user.name || "ผู้ดูแลระบบ"}</strong>
            <small>ผู้ดูแลระบบ</small>
            <span>{session.user.email}</span>
          </span>
          <form action={async () => { "use server"; await signOut(); }}>
            <button className="sidebar-signout-icon" type="submit" title="ออกจากระบบ" aria-label="ออกจากระบบ">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
