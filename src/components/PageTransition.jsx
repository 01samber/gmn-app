import { useEffect } from "react";

export default function PageTransition({ children }) {
  // Accessibility: respect reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // force repaint to avoid transition glitches on fast route changes
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div
      className={[
        "relative",
        !prefersReducedMotion
          ? "animate-page-in"
          : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
