import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, Star, FileText, Award, CalendarCheck, UserPlus, Medal, DollarSign, ShieldCheck, Folders, BadgeCheck, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { teacherMeta } from '@/lib/teachers';
import { getPanelRole, panelPathAllowed } from '@/lib/panel-permissions';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocation } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: "exclude-subtree" },
  head: () => teacherMeta('Admin Control Panel', 'Manage the Gators Learning teaching platform.'),
  ssr: false,
  beforeLoad: async () => {
    try { const panelRole = await getPanelRole(supabase); return { adminAllowed: !!panelRole, panelRole, adminError: '' }; }
    catch (error) { return { adminAllowed: false, panelRole: null, adminError: error instanceof Error ? error.message : 'অ্যাডমিনের অনুমতি যাচাই করা যাচ্ছে না।' }; }
  },
  component: AdminGuard,
});

function AdminGuard() {
  const { adminAllowed, adminError, panelRole } = Route.useRouteContext();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (!adminAllowed) {
    return <><AdminLogin onSuccess={() => { queryClient.clear(); void router.invalidate(); }} />
      {adminError && <p role="alert" className="fixed bottom-4 inset-x-4 text-center text-destructive">{adminError}</p>}</>;
  }

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    localStorage.removeItem('gators-admin-session');
    await router.invalidate();
    await navigate({ to: '/admin', replace: true });
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Categories", href: "/admin/categories", icon: Folders },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Teachers", href: "/admin/teachers", icon: Users },
    { name: "Course Content", href: "/admin/content", icon: FileText },
    { name: "Exam Mark Sheet", href: "/admin/results", icon: Medal },
    { name: "Active Students", href: "/admin/students", icon: Users },
    { name: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
    { name: "Enrollments", href: "/admin/enrollments", icon: UserPlus },
    { name: "Send Certificates", href: "/admin/certificates", icon: Award },
    { name: "Course Earnings", href: "/admin/earnings", icon: DollarSign },
    { name: "Course Verification", href: "/admin/course-verification", icon: BadgeCheck },
    { name: "Notice", href: "/admin/notices", icon: Megaphone },
    { name: "Reviews & Ads", href: "/admin/reviews", icon: Star },
    { name: "Bulk Message", href: "/admin/messages", icon: Megaphone },
    { name: "Moderator", href: "/admin/moderators", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {menuOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`w-64 bg-white border-r border-slate-200 p-6 flex flex-col h-screen shrink-0 fixed inset-y-0 left-0 z-50 transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setMenuOpen(false)} className="lg:hidden absolute top-4 right-4 p-2 text-slate-500" aria-label="Close menu"><X size={20} /></button>
        <div className="h-16 flex items-center px-2 mb-8 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-xl text-slate-800 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Award className="text-white text-lg" />
            </div>
            EduAdmin<span className="text-indigo-600">.</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          {navItems.filter(item => panelPathAllowed(panelRole,item.href)).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMenuOpen(false)}
              activeOptions={{ exact: item.href === "/admin" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition border-l-4 border-transparent"
              activeProps={{ className: "bg-indigo-50 text-indigo-600 border-indigo-600 hover:text-indigo-600 font-semibold shadow-none" }}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition mt-4 shrink-0">
           <LogOut size={20} /> Log Out
        </button>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-700" aria-label="Open menu"><Menu size={22} /></button>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Control Panel</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {panelPathAllowed(panelRole, location.pathname) ? <Outlet /> : <section className="space-y-4"><h1 className="text-xl font-bold">এই পৃষ্ঠার অনুমতি নেই</h1><Button asChild><Link to="/admin/courses">কোর্সে ফিরে যান</Link></Button></section>}
          </div>
        </div>
      </main>
    </div>
  );
}
