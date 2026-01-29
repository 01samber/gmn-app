import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useEffect, useRef, useState } from "react";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const didInitTheme = useRef(false);

  useEffect(() => {
    if (didInitTheme.current) return;
    didInitTheme.current = true;
    const isDark = localStorage.getItem("gmn_theme") === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(e) { if (e.key === "Escape") setSidebarOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 dark:text-slate-100 transition-all duration-500">
      {/* Animated ambient background - live wallpaper effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/20 to-cyan-200/20 dark:from-brand-800/10 dark:to-cyan-800/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-200/20 to-purple-200/20 dark:from-violet-800/10 dark:to-purple-800/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-float-slow" style={{ animationDelay: '-10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-emerald-200/10 to-teal-200/10 dark:from-emerald-800/5 dark:to-teal-800/5 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(14,165,233,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-brand-500/20 dark:bg-brand-400/20 rounded-full animate-float-particle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${20 + Math.random() * 15}s`,
            }}
          />
        ))}
      </div>
      
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative lg:pl-72 transition-all duration-300">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="relative px-4 py-6 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
        <footer className="relative border-t border-slate-200/60 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 status-pulse" />
              <span>System Online</span>
            </div>
            <div>GMN Field Service Manager v2.0</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
