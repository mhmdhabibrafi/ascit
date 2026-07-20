"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseStatusPill } from "@/components/system/database-status";
import { GoogleIcon } from "@/components/ui/google-icon";
import { hospitalBrand, systemBrand } from "@/lib/branding";
import { cn, humanizeRole, roleDivisionLabel } from "@/lib/utils";


type MenuSection = {
  title: string;
  hint: string;
  tone?: "monitoring";
  items: Array<{
    href?: string;
    label: string;
    icon: string;
    description: string;
    subItems?: Array<{
      href: string;
      label: string;
      icon: string;
    }>;
  }>;
};

const menuSections: MenuSection[] = [
  {
    title: "Operasional",
    hint: "Alur kerja harian",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", description: "Ringkasan operasional aset" },
      { href: "/assets", label: "Data Aset IT", icon: "inventory_2", description: "Inventaris, QR, lokasi, dan status aset" },
      { href: "/mutations", label: "Mutasi Aset", icon: "sync_alt", description: "Mutasi dan pergerakan lokasi aset" },
      { href: "/service-records", label: "Service Records", icon: "build", description: "Riwayat perawatan dan perbaikan aset" }
    ]
  },
  {
    title: "Monitoring",
    hint: "Kontrol risiko",
    tone: "monitoring",
    items: [
      { href: "/recommendations", label: "Monitoring & AI", icon: "visibility", description: "Pantau usia pakai dan rekomendasi AI" },
      { href: "/reports", label: "Laporan", icon: "description", description: "Export dan cetak laporan operasional" }
    ]
  },
  {
    title: "Administrasi",
    hint: "Konfigurasi sistem",
    items: [
      { href: "/master-data", label: "Master Data", icon: "database", description: "Kelola referensi unit, ruangan, vendor, dan teknisi" },
      { href: "/users", label: "Pengguna dan Hak Akses", icon: "groups", description: "Kelola akun dan role pengguna" },
      { href: "/audit-log", label: "Audit Log", icon: "history", description: "Lacak aktivitas penting sistem" },
      { href: "/settings", label: "Pengaturan", icon: "settings", description: "Pantau konfigurasi runtime dan database" }
    ]
  },
  {
    title: "Akun",
    hint: "Aktivitas pengguna",
    items: [
      { href: "/notifications", label: "Notifikasi", icon: "notifications", description: "Pusat notifikasi dan aktivitas sistem" },
      { href: "/profile", label: "Profil Saya", icon: "account_circle", description: "Kelola profil dan keamanan akun" }
    ]
  }
];

const flatMenu = menuSections.flatMap((section) => 
  section.items.flatMap((item) => {
    if (item.subItems) {
      return item.subItems.map(sub => ({ ...sub, description: item.description }));
    }
    return item.href ? [{ ...item, href: item.href }] : [];
  })
);

function isRouteActive(pathname: string | null, href: string | undefined) {
  if (!href) return false;
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

function isGroupActive(pathname: string | null, item: any) {
  if (item.href && isRouteActive(pathname, item.href)) return true;
  if (item.subItems && item.subItems.some((sub: any) => isRouteActive(pathname, sub.href))) return true;
  return false;
}

function getActiveMenuItem(pathname: string | null) {
  return [...flatMenu]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isRouteActive(pathname, item.href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ascit_sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function handleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("ascit_sidebar_collapsed", next.toString());
  }

  // ponytail: click-outside to close notification dropdown
  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);
  const isLogin = pathname === "/login";
  const isPublicAsset = Boolean(pathname?.startsWith("/public/assets/"));
  const activeItem = useMemo(() => getActiveMenuItem(pathname), [pathname]);
  const activeSection = useMemo(
    () => menuSections.find((section) => 
      section.items.some((item) => isGroupActive(pathname, item))
    ),
    [pathname]
  );
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuSections.forEach(sec => {
      sec.items.forEach(item => {
        if (item.subItems && isGroupActive(pathname, item)) {
          initial[item.label] = true;
        }
      });
    });
    return initial;
  });

  function toggleGroup(label: string) {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  }
  const title = pathname === "/profile" ? "Profil Pengguna" : (activeItem?.label ?? systemBrand.name);
  const userRole = session?.user?.role;
  const roleLabel = humanizeRole(userRole);
  const divisionLabel = roleDivisionLabel(userRole);
  const callbackUrl = pathname && pathname !== "/" ? pathname : "/dashboard";

  const refreshNotifications = useCallback(() => {
    if (status !== "authenticated" || isLogin) return;
    fetch("/api/notifications?limit=5&status=unread", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setNotifications(data?.data || []);
        setUnreadCount(data?.meta?.unreadCount || 0);
      })
      .catch(() => {});
  }, [isLogin, status]);

  const markNotificationRead = useCallback(async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true })
    }).catch(() => null);
    refreshNotifications();
  }, [refreshNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true })
    }).catch(() => null);
    setShowNotifications(false);
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!isLogin && !isPublicAsset && status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    
    refreshNotifications();
    window.addEventListener("ascit:notifications-changed", refreshNotifications);
    return () => window.removeEventListener("ascit:notifications-changed", refreshNotifications);
  }, [callbackUrl, isLogin, isPublicAsset, refreshNotifications, router, status]);

  if (isLogin || isPublicAsset) {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <SessionLoading />;
  }
  return (
    <div className="min-h-screen bg-slate-50 text-[#212529] font-sans flex flex-col relative z-0">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-slate-50 to-slate-50 pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[url('/images/noise.png')] opacity-[0.015] pointer-events-none mix-blend-overlay -z-10" />

      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[90] rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-panel focus:not-sr-only"
      >
        Lewati navigasi
      </a>

      {/* Top Navbar */}
      <header className={cn(
        "fixed top-0 right-0 z-30 h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-md flex items-center px-4 transition-all duration-300 left-0 shadow-sm/50",
        collapsed ? "lg:left-[76px]" : "lg:left-[264px]"
      )}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-800 transition lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-controls="app-sidebar"
              aria-expanded={open}
            >
              <GoogleIcon name="menu" className="h-[22px] w-[22px]" />
            </button>
            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-800 transition"
              onClick={handleCollapse}
              title={collapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
            >
              <GoogleIcon name="menu" className="h-[22px] w-[22px]" />
            </button>
            
            {/* Breadcrumb RENTAK style */}
            <div className="hidden sm:flex items-center gap-2 text-[13px] ml-2 select-none">
              <span className="text-slate-400 font-medium uppercase tracking-wide">ASCIT</span>
              <GoogleIcon name="chevron_right" className="h-4 w-4 text-slate-300" />
              <span className="text-emerald-600 font-semibold">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications Icon with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100/80 hover:text-emerald-600 transition-all duration-200 relative group"
                title="Notifikasi"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <GoogleIcon name="notifications" className="h-[20px] w-[20px] group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] ring-1 ring-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <span className="font-bold text-[14px] text-slate-800 tracking-wide">Notifikasi Sistem</span>
                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md">{unreadCount} Baru</span>
                  </div>
                  
                  <div className="max-h-[320px] overflow-y-auto bg-white">
                    {notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <Link 
                          key={notif.id || idx} 
                          href="/notifications"
                          onClick={() => { void markNotificationRead(notif.id); setShowNotifications(false); }}
                          className="p-3.5 flex gap-3.5 items-start hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <GoogleIcon name="info" className="h-[18px] w-[18px]" />
                          </div>
                          <div className="flex flex-col gap-1 pt-0.5 w-full">
                            <span className="text-[13px] font-bold text-slate-800 leading-none">{notif.module || "Sistem"}</span>
                            <span className="text-[12px] text-slate-500 leading-snug line-clamp-2">{notif.description}</span>
                            <span className="text-[11px] font-medium text-slate-400 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                        <GoogleIcon name="notifications_off" className="h-8 w-8 text-slate-300" />
                        <span className="text-[13px] text-slate-500">Belum ada notifikasi baru</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50 text-[12px] font-semibold">
                    <button type="button" className="p-3 text-slate-600 hover:bg-slate-100" onClick={() => void markAllNotificationsRead()} disabled={!unreadCount}>
                      Tandai semua dibaca
                    </button>
                    <Link href="/notifications" onClick={() => setShowNotifications(false)} className="border-l border-slate-200 p-3 text-center text-emerald-700 hover:bg-emerald-50">
                      Lihat semuanya
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Icon -> Profile */}
            <Link
              href="/profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100/80 hover:text-emerald-600 transition-all duration-200 group"
              title="Profil Pengguna"
            >
              <GoogleIcon name="account_circle" className="h-[22px] w-[22px] group-hover:scale-110 transition-transform" />
            </Link>

            <div className="w-px h-5 bg-slate-200 mx-1"></div>

            {/* Logout Icon */}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
              onClick={() => signOut({ redirect: false }).then(() => { window.location.href = '/login'; })}
              title="Keluar"
            >
              <GoogleIcon name="logout" className="h-[20px] w-[20px] group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Dark Sidebar in AdminLTE Style but modernized */}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-emerald-950 via-[#022c22] to-emerald-950 text-slate-300 shadow-2xl border-r border-slate-800 transition-all duration-300",
          collapsed ? "lg:w-[76px] w-[264px]" : "w-[264px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand Header */}
          <div className={cn(
            "py-6 border-b border-white/5 flex flex-col items-center justify-center shrink-0 relative",
            collapsed ? "px-2" : "px-4"
          )}>
            <button
              type="button"
              className={cn(
                "absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden shrink-0",
                collapsed && "hidden"
              )}
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              aria-controls="app-sidebar"
            >
              <GoogleIcon name="close" />
            </button>
            <Link href="/dashboard" className={cn(
              "flex flex-col items-center gap-3 min-w-0 text-center",
              collapsed ? "lg:justify-center lg:w-full" : "w-full"
            )}>
              {collapsed ? (
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-emerald-900/10">
                  <Image
                    src="/images/awal-bros-logo.png"
                    alt={`Logo ${hospitalBrand.name}`}
                    width={34}
                    height={34}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 items-center mt-2">
                  <span className="font-black text-white tracking-widest text-3xl uppercase drop-shadow-sm leading-none">
                    {systemBrand.name}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-100/70 leading-tight max-w-[220px] mx-auto text-center">
                    {systemBrand.subtitle}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Sidebar Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto py-3",
            collapsed ? "px-2 lg:px-0" : "px-2"
          )}>
            {menuSections.map((section) => (
              <div key={section.title} className={cn("mb-4 last:mb-0", collapsed && "lg:w-full lg:mb-3")}>
                {/* Menu Header Label */}
                <div className={cn("mb-2 px-3", collapsed && "lg:hidden")}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400/80 pb-2 border-b border-white/5">
                    {section.title}
                  </div>
                </div>
                {collapsed && (
                  <div className="mx-auto my-2 hidden w-8 border-t border-white/10 lg:block" />
                )}
                <div className={cn("grid gap-1", collapsed && "lg:w-full lg:place-items-center")}>
                  {section.items.map((item) => {
                    const active = isGroupActive(pathname, item);
                    const isExpanded = expandedGroups[item.label];

                    if (item.subItems) {
                      return (
                        <div key={item.label} className={cn("grid gap-0.5", collapsed && "lg:w-full lg:place-items-center")}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.label)}
                            title={item.label}
                            className={cn(
                              "group relative flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 overflow-hidden",
                              collapsed ? "lg:grid lg:h-11 lg:w-11 lg:place-items-center lg:p-0" : "",
                              active || isExpanded
                                ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-white/5"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            {/* Hover highlight effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]" />
                            <div className={cn("flex items-center relative z-10", collapsed ? "lg:grid lg:h-full lg:w-full lg:place-items-center gap-3.5" : "gap-3.5")}>
                              <GoogleIcon
                                name={item.icon}
                                className={cn(
                                  "h-[22px] w-[22px] shrink-0 text-[22px] transition-colors",
                                  active || isExpanded ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                                )}
                              />
                              <span className={cn("min-w-0 truncate", collapsed && "lg:hidden")}>{item.label}</span>
                            </div>
                            <GoogleIcon
                              name="expand_more"
                              className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isExpanded && "rotate-180", collapsed && "lg:hidden")}
                            />
                          </button>
                          
                          {/* Sub Items */}
                          {(!collapsed && isExpanded) && (
                            <div className="mt-1 flex flex-col gap-0.5 border-l border-white/10 ml-[23px] pl-3">
                              {item.subItems.map((subItem) => {
                                const subActive = isRouteActive(pathname, subItem.href);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setOpen(false)}
                                    aria-current={subActive ? "page" : undefined}
                                    className={cn(
                                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-300 relative overflow-hidden",
                                      subActive
                                        ? "bg-emerald-500/10 text-emerald-100 font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-emerald-500/20"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    <GoogleIcon
                                      name={subItem.icon}
                                      className={cn(
                                        "transition-colors",
                                        subActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                                      )}
                                    />
                                    <span>{subItem.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href!}
                        href={item.href!}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        className={cn(
                          "group relative flex items-center rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 overflow-hidden",
                          collapsed
                            ? "gap-3.5 lg:grid lg:h-11 lg:w-11 lg:place-items-center lg:p-0"
                            : "w-full gap-3.5",
                          active
                            ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-emerald-500/20 font-semibold"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {/* Shimmer effect on hover */}
                        {!active && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]" />}
                        
                        <GoogleIcon
                          name={item.icon}
                          filled={active}
                          className={cn(
                            "relative z-10 h-[22px] w-[22px] shrink-0 text-[22px] transition-colors",
                            active ? "text-white" : "text-slate-400 group-hover:text-white"
                          )}
                        />
                        <span className={cn("min-w-0 truncate relative z-10", collapsed && "lg:hidden")}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Drawer Overlay for Mobile */}
      {open ? <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} /> : null}

      {/* Main Content Area */}
      <main id="main-content" className={cn(
        "min-w-0 flex-1 flex flex-col pt-16 transition-all duration-300 bg-transparent",
        collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"
      )}>
        {/* Content Body */}
        <div key={pathname} className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-page-in">
          {children}
        </div>

        {/* AdminLTE-style Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-3.5 px-4 sm:px-5 lg:px-6 text-center sm:text-left text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 select-none shrink-0">
          <div>
            <span className="font-bold text-slate-500">Copyright &copy; {new Date().getFullYear()}</span>{" "}
            <span className="font-bold text-emerald-700">{hospitalBrand.name}</span>. All rights reserved.
          </div>
          <div className="sm:text-right font-medium text-slate-400">
            <b>{systemBrand.name}</b> v1.0.0
          </div>
        </footer>
      </main>


    </div>
  );
}

function SessionLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="grid justify-items-center gap-4 text-center">
        <div className="relative h-12 w-[240px] overflow-hidden rounded-md bg-white">
          <Image src="/images/rs-awal-bros-logo.png" alt={hospitalBrand.name} fill className="object-contain" sizes="240px" priority />
        </div>
        <div className="text-sm font-bold text-slate-600">Memeriksa sesi ASCIT...</div>
      </div>
    </main>
  );
}
