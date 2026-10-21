"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = usePreferences();
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="site-dialog">
    <p className="eyebrow">{t("Ayuda contextual")}</p><DialogTitle>{t("¿Qué quieres hacer?")}</DialogTitle>
    <div className="help-options">
      <button><strong>{t("Buscar una experiencia")}</strong><span>{t("Usa destino, fecha y cantidad de personas.")}</span></button>
      <button><strong>{t("Publicar un servicio")}</strong><span>{t("Ingresa y regístrate como Agencia o Transporte.")}</span></button>
      <button><strong>{t("Ingresar a tu cuenta")}</strong><span>{t("Usa el botón Ingresar o crea una en Registrarse.")}</span></button>
    </div>
    <DialogDescription className="help-note">{t("Consejo: presiona ")}<kbd>{t("Esc")}</kbd>{t(" para cerrar cualquier panel.")}</DialogDescription>
  </DialogContent></Dialog>;
}

export function AccessDialog({ largeText, setLargeText, highContrast, setHighContrast, onClose }: {
  largeText: boolean; setLargeText: (value: boolean) => void;
  highContrast: boolean; setHighContrast: (value: boolean) => void; onClose: () => void;
}) {
  const { t } = usePreferences();
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="site-dialog">
    <p className="eyebrow">{t("Preferencias")}</p><DialogTitle>{t("Accesibilidad visual")}</DialogTitle>
    <DialogDescription>{t("Los cambios se aplican inmediatamente a todo el prototipo.")}</DialogDescription>
    <label className="toggle-row" aria-label={t("Texto más grande")}><span><strong>{t("Texto más grande")}</strong><small>{t("Aumenta el tamaño de lectura.")}</small></span><input type="checkbox" role="switch" checked={largeText} onChange={event => setLargeText(event.target.checked)} /></label>
    <label className="toggle-row" aria-label={t("Contraste reforzado")}><span><strong>{t("Contraste reforzado")}</strong><small>{t("Oscurece textos y bordes.")}</small></span><input type="checkbox" role="switch" checked={highContrast} onChange={event => setHighContrast(event.target.checked)} /></label>
    <div className="notice"><strong>{t("Navegación por teclado")}</strong><span>{t("Usa Tab para avanzar, Shift + Tab para volver y Enter para activar.")}</span></div>
  </DialogContent></Dialog>;
}
