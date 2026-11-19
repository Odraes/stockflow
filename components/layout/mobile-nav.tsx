"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { AppRole } from "@/lib/permissions";

/**
 * Hamburger button + slide-in menu for small screens (hidden from md up).
 *
 * The menu is rendered into <body> with a portal. Our top bar uses
 * backdrop-blur, and any element with a CSS filter becomes the containing
 * block for `position: fixed` children — without the portal the "full-screen"
 * menu would be clipped to the 64px header.
 */
export function MobileNav({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);

  // Close with the Escape key while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col gap-6 border-r bg-card p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Brand />
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarNav role={role} onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
