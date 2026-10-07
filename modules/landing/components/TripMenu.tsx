"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TRIP_MENU, type TripMenuId } from "@/modules/landing/lib/travelerRoutes";

type Props = {
  active: TripMenuId | null;
  onSelect: (id: TripMenuId) => void;
};

export function TripMenu({ active, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="trip-menu" ref={rootRef}>
      <button
        type="button"
        className={active ? "nav-active" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        Mi viaje
      </button>
      {open ? (
        <div className="trip-menu-panel" id={panelId} role="menu" aria-label="Mi viaje">
          {TRIP_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={active === item.id ? "nav-active" : undefined}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => {
                setOpen(false);
                onSelect(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
