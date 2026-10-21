import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HeadingProps = { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; id?: string; focusable?: boolean };

export function PageHeading({ title, description, actions, className, id, focusable, eyebrow }: HeadingProps & { eyebrow?: ReactNode }) {
  return <div className={cn("lr-page-heading", className)}>
    <div className="lr-page-heading-copy">{eyebrow}<h1 id={id} tabIndex={focusable ? -1 : undefined} className="lr-page-title">{title}</h1>{description ? <p className="lr-page-description">{description}</p> : null}</div>
    {actions ? <div className="lr-page-actions">{actions}</div> : null}
  </div>;
}

export function SectionHeading({ title, description, actions, className, id, focusable }: HeadingProps) {
  return <div className={cn("lr-section-heading", className)}>
    <div><h2 id={id} tabIndex={focusable ? -1 : undefined} className="lr-section-title">{title}</h2>{description ? <p className="lr-section-description">{description}</p> : null}</div>
    {actions ? <div className="lr-page-actions">{actions}</div> : null}
  </div>;
}
