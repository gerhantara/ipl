"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  X,
  Users,
  Wallet,
  Building2,
  UserCircle,
  BadgePercent,
  House,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

interface SidebarItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
}

// Sub menu grup Pembayaran (khusus admin)
const paymentItems: SidebarItem[] = [
  { title: "Bayar IPL", href: "/dashboard/bayar", icon: <CreditCard className="h-4 w-4" /> },
  { title: "Riwayat Pembayaran", href: "/dashboard/riwayat", icon: <FileText className="h-4 w-4" /> },
  { title: "Verifikasi Pembayaran", href: "/dashboard/verifikasi", icon: <Users className="h-4 w-4" /> },
];

// Sub menu grup Referensi (khusus admin)
const referenceItems: SidebarItem[] = [
  { title: "Jenis Iuran", href: "/dashboard/jenis-iuran", icon: <CreditCard className="h-4 w-4" /> },
  { title: "Keringanan IPL", href: "/dashboard/keringanan", icon: <BadgePercent className="h-4 w-4" /> },
  { title: "Rekening", href: "/dashboard/rekening", icon: <Building2 className="h-4 w-4" /> },
  { title: "Referensi Rumah", href: "/dashboard/rumah", icon: <House className="h-4 w-4" /> },
  { title: "Manajemen User", href: "/dashboard/users", icon: <Users className="h-4 w-4" /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.full_name);
        }
      }
    };

    getUser();

    const handleProfileUpdated = () => {
      getUser();
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Menu utama berdasarkan role:
  // - Admin: grup Pembayaran (Bayar IPL, Riwayat, Verifikasi) + grup Referensi
  // - Warga: Bayar IPL & Riwayat tetap sebagai menu utama di sidebar
  const sidebarItems: SidebarItem[] =
    userRole === "admin"
      ? [
          { title: "Dashboard", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
          { title: "Pembayaran", icon: <CreditCard className="h-5 w-5" />, children: paymentItems },
          { title: "Pengeluaran", href: "/dashboard/pengeluaran", icon: <Wallet className="h-5 w-5" /> },
          { title: "Referensi", icon: <FolderOpen className="h-5 w-5" />, children: referenceItems },
          { title: "Profil", href: "/dashboard/profile", icon: <UserCircle className="h-5 w-5" /> },
        ]
      : [
          { title: "Dashboard", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
          { title: "Bayar IPL", href: "/dashboard/bayar", icon: <CreditCard className="h-5 w-5" /> },
          { title: "Riwayat Pembayaran", href: "/dashboard/riwayat", icon: <FileText className="h-5 w-5" /> },
          { title: "Profil", href: "/dashboard/profile", icon: <UserCircle className="h-5 w-5" /> },
        ];

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // Buka otomatis grup yang berisi halaman aktif
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      sidebarItems.forEach((item) => {
        if (item.children?.some((c) => pathname === c.href)) {
          next.add(item.title);
        }
      });
      return Array.from(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userRole]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Sistem IPL</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              if (item.children) {
                const isExpanded = expandedGroups.includes(item.title);
                const groupActive = item.children.some((c) => pathname === c.href);
                return (
                  <div key={item.title} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.title)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                        groupActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {item.icon}
                      <span className="flex-1 text-left">{item.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 pl-3 border-l border-border/60 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href!}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              pathname === child.href
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {child.icon}
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole || "warga"}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-background border-b lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Sistem IPL</h1>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}