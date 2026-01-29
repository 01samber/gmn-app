import { useEffect, useState } from "react";

export default function PageTransition({ children }) {
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={[
      "transition-all duration-400 ease-out",
      !prefersReducedMotion && !visible ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0",
    ].join(" ")}>
      {children}
    </div>
  );
}
