/* ============================================================
   Glass System — React components
   Import tokens.css + glass.css once in your app entry.
   Drop-in, no external deps.
   ============================================================ */
import React from "react";

/** Vibrant backdrop so the blur reads. Put your own image/gradient behind it. */
export function GlassCanvas({ dark = false, children, style }) {
  return (
    <div
      className={`glass-canvas${dark ? " glass-theme-dark" : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Core surface. variant: "sm" | "md" | "lg"; strong boosts fill opacity. */
export function GlassSurface({
  as: Tag = "div",
  variant = "md",
  strong = false,
  className = "",
  ...rest
}) {
  const cls = [
    "glass-surface",
    variant !== "md" && `glass-surface--${variant}`,
    strong && "glass-surface--strong",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={cls} {...rest} />;
}

export function GlassCard({ title, children, ...rest }) {
  return (
    <GlassSurface className="glass-card" {...rest}>
      {title && <h3>{title}</h3>}
      <p>{children}</p>
    </GlassSurface>
  );
}

export function GlassButton({ variant = "default", children, ...rest }) {
  return (
    <button
      className={`glass-btn${variant === "primary" ? " glass-btn--primary" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GlassInput({ ...rest }) {
  return <input className="glass-input" {...rest} />;
}

export function GlassBadge({ children, dotColor }) {
  return (
    <span className="glass-badge">
      {dotColor && (
        <span className="dot" style={{ background: dotColor }} />
      )}
      {children}
    </span>
  );
}

export function GlassToggle({ checked, onChange, ...rest }) {
  return (
    <button
      role="switch"
      aria-checked={!!checked}
      className="glass-toggle"
      onClick={() => onChange?.(!checked)}
      {...rest}
    />
  );
}

export function GlassNavbar({ brand = "Glass", links = [], actions }) {
  return (
    <GlassSurface as="header" variant="sm" className="glass-navbar">
      <span className="brand">{brand}</span>
      <nav>
        {links.map((l) => (
          <a key={l} href={`#${l.toLowerCase()}`}>
            {l}
          </a>
        ))}
      </nav>
      <div>{actions}</div>
    </GlassSurface>
  );
}
