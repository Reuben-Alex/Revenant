// Iron-plate button: board btn(on) (Main.dc.html L852), rivets as two radial gradients.
import type { CSSProperties, ReactNode } from 'react';

export function ironStyle(on: boolean): CSSProperties {
  const rivets = 'radial-gradient(circle at 6px 50%, #5A6461 1.2px, rgba(0,0,0,0) 1.8px), radial-gradient(circle at calc(100% - 6px) 50%, #5A6461 1.2px, rgba(0,0,0,0) 1.8px), ';
  return {
    display: 'flex', alignItems: 'center', gap: 7, minHeight: 40, padding: '0 16px', borderRadius: 3,
    border: `1px solid ${on ? '#8A5A45' : '#2E3734'}`,
    background: rivets + (on ? 'linear-gradient(180deg, #2A221C, #15110E)' : 'linear-gradient(180deg, #1A201E, #0D1110)'),
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 0 #000' + (on ? ', 0 0 14px rgba(255,107,44,0.22)' : ''),
    color: on ? '#F4E6C8' : '#BFC6C2', font: "400 14px 'IM Fell English SC', Georgia, serif", letterSpacing: 1, cursor: 'pointer',
  };
}

interface Props {
  on?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
  style?: CSSProperties;
  children: ReactNode;
}

export function IronButton({ on = false, pressed, disabled = false, label, onClick, style, children }: Props) {
  return (
    <button type="button" className="rv-btn" aria-pressed={pressed} aria-label={label} disabled={disabled} onClick={onClick}
      style={{ ...ironStyle(on), ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : null), ...style }}>
      {children}
    </button>
  );
}
