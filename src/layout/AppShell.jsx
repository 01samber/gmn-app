import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useEffect, useRef, useState } from "react";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Prevent double theme ownership:
  // AppShell applies the stored theme ONCE (initial mount).
  // Topbar owns toggling + cross-tab sync.
  const didInitTheme = useRef(false);
  useEffect(() => {
    if (didInitTheme.current) return;
    didInitTheme.current = true;

    const saved = localStorage.getItem("gmn_theme");
    const isDark = saved === "dark";

    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // ✅ Security/UX: close sidebar on route change (prevents weird overlay states)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ✅ UX: lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    // lock
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ✅ Accessibility: ESC closes sidebar
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    if (sidebarOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <div className="lg:pl-72">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Main content container */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
