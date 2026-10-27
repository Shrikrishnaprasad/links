import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';

/** Material 3 dialog: scrim, 28px radius, focus trap-lite, Esc to close, restores focus. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => {
      window.removeEventListener('keydown', h);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${width} rounded-3xl bg-g-bg text-g-text shadow-g3 max-h-[90vh] flex flex-col animate-scaleIn`}
      >
        <div className="flex items-center justify-between pl-5 pr-2 pt-3 pb-1">
          <h2 id={titleId} className="text-[20px] leading-7 font-normal">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pt-1 pb-3 overflow-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 pb-4 pt-1">{footer}</div>}
      </div>
    </div>
  );
}

/** Material 3 snackbar with an optional action (e.g. Undo). */
export function Toast({
  msg,
  action,
  onDismiss,
}: {
  msg: string | null;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  if (!msg) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-6 z-[60] min-w-[240px] max-w-[min(90vw,480px)] rounded-lg bg-[#303030] text-[#f2f2f2] pl-4 pr-2 h-10 flex items-center gap-2 text-[13px] shadow-g3 animate-slideUp"
    >
      <span className="flex-1">{msg}</span>
      {action && (
        <button
          className="h-8 px-3 rounded-full text-[13px] font-medium text-[#a8c7fa] hover:bg-white/10"
          onClick={() => {
            action.onClick();
            onDismiss?.();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function Favicon({ src, size = 20 }: { src?: string; size?: number }) {
  return src ? (
    <img src={src} width={size} height={size} className="rounded-sm shrink-0" alt="" loading="lazy" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded-sm bg-g-hover shrink-0" />
  );
}

/** Material 3 outlined text field with floating label. */
export function Field({
  label,
  value,
  onChange,
  error,
  helper,
  autoFocus,
  onEnter,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  type?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          autoFocus={autoFocus}
          placeholder=" "
          value={value}
          aria-invalid={!!error}
          aria-describedby={error || helper ? `${id}-d` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className={`peer w-full h-11 rounded-md border bg-transparent px-3 text-[13px] text-g-text placeholder-transparent transition-colors focus:outline-none focus:ring-1 ${
            error
              ? 'border-g-red ring-g-red focus:border-g-red focus:ring-g-red'
              : 'border-g-border hover:border-g-text/70 focus:border-g-blue focus:ring-g-blue'
          }`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 px-1 bg-g-bg text-[13px] text-g-sub transition-all duration-150 ease-emphasized
            peer-focus:top-0 peer-focus:text-[11px] ${error ? 'peer-focus:text-g-red' : 'peer-focus:text-g-blue'}
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] ${error ? 'text-g-red' : ''}`}
        >
          {label}
        </label>
      </div>
      {(error || helper) && (
        <p id={`${id}-d`} className={`text-xs mt-1 px-3 ${error ? 'text-g-red' : 'text-g-sub'}`}>
          {error || helper}
        </p>
      )}
    </div>
  );
}

/** Material 3 outlined select (label is always floated). */
export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 appearance-none [&>option]:bg-g-bg [&>option]:text-g-text [&>option]:bg-g-bg [&>option]:text-g-text rounded-md border border-g-border bg-transparent px-3 pr-9 text-[13px] text-g-text hover:border-g-text/70 focus:outline-none focus:border-g-blue focus:ring-1 focus:ring-g-blue transition-colors"
      >
        {children}
      </select>
      <label htmlFor={id} className="pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 px-1 bg-g-bg text-[11px] text-g-sub">
        {label}
      </label>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-g-sub" />
    </div>
  );
}

/** Empty state with a simple Google-style illustration. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <svg width="120" height="90" viewBox="0 0 160 120" fill="none" aria-hidden="true" className="mb-6">
        <rect x="22" y="18" width="116" height="84" rx="14" className="fill-g-surface" />
        <rect x="38" y="36" width="52" height="8" rx="4" className="fill-g-border/60" />
        <rect x="38" y="52" width="84" height="8" rx="4" className="fill-g-border/40" />
        <rect x="38" y="68" width="68" height="8" rx="4" className="fill-g-border/40" />
        <circle cx="122" cy="88" r="20" className="fill-g-blue" />
        <path d="M122 80v16M114 88h16" stroke="rgb(var(--g-on-blue))" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h3 className="text-[18px] font-normal text-g-text">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-g-sub">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 h-12 border-b border-g-border/40">
          <div className="skeleton w-4 h-4" />
          <div className="skeleton w-5 h-5" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-2.5 w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
