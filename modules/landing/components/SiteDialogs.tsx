"use client";

import { useEffect, useRef } from "react";
import { usePreferences } from "@/lib/preferences/Preferences";

function DialogBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (event.target === ref.current) onClose(); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [onClose]);
  return <div ref={ref} className="dialog-backdrop">{children}</div>;
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = usePreferences(); return <DialogBackdrop onClose={onClose}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="dialog-close" aria-label={t("Cerrar ayuda")} onClick={onClose}>{t("Cerrar")}</button><p className="eyebrow">{t("Ayuda contextual")}</p><h2 id="help-title">{t("¿Qué quieres hacer?")}</h2><div className="help-options"><button><strong>{t("Buscar una experiencia")}</strong><span>{t("Usa destino, fecha y cantidad de personas.")}</span></button><button><strong>{t("Publicar un servicio")}</strong><span>{t("Ingresa y regístrate como Agencia o Transporte.")}</span></button><button><strong>{t("Ingresar a tu cuenta")}</strong><span>{t("Usa el botón Ingresar o crea una en Registrarse.")}</span></button></div><p className="help-note">{t("Consejo: presiona ")}<kbd>{t("Esc")}</kbd>{t(" para cerrar cualquier panel.")}</p></section></DialogBackdrop>; }

export function AccessDialog({ largeText, setLargeText, highContrast, setHighContrast, onClose }: { largeText: boolean; setLargeText: (value: boolean) => void; highContrast: boolean; setHighContrast: (value: boolean) => void; onClose: () => void }) {
  const { t } = usePreferences(); return <DialogBackdrop onClose={onClose}><section className="dialog access-dialog" role="dialog" aria-modal="true" aria-labelledby="access-title"><button className="dialog-close" aria-label={t("Cerrar opciones de accesibilidad")} onClick={onClose}>{t("Cerrar")}</button><p className="eyebrow">{t("Preferencias")}</p><h2 id="access-title">{t("Accesibilidad visual")}</h2><p>{t("Los cambios se aplican inmediatamente a todo el prototipo.")}</p><label className="toggle-row" aria-label={t("Texto más grande")}><span><strong>{t("Texto más grande")}</strong><small>{t("Aumenta el tamaño de lectura.")}</small></span><input type="checkbox" role="switch" checked={largeText} onChange={(event) => setLargeText(event.target.checked)} /></label><label className="toggle-row" aria-label={t("Contraste reforzado")}><span><strong>{t("Contraste reforzado")}</strong><small>{t("Oscurece textos y bordes.")}</small></span><input type="checkbox" role="switch" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /></label><div className="notice"><strong>{t("Navegación por teclado")}</strong><span>{t("Usa Tab para avanzar, Shift + Tab para volver y Enter para activar.")}</span></div></section></DialogBackdrop>; }
