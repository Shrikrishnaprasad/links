import { Monitor, Moon, Sun } from 'lucide-react';
import { nextTheme, useTheme, type Theme } from '../services/theme';

const META: Record<Theme, { label: string; Icon: typeof Sun }> = {
  system: { label: 'System theme', Icon: Monitor },
  light: { label: 'Light theme', Icon: Sun },
  dark: { label: 'Dark theme', Icon: Moon },
};

/** Cycles System -> Light -> Dark. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const { label, Icon } = META[theme];
  const next = META[nextTheme(theme)].label;
  return (
    <button
      className="icon-btn"
      onClick={() => setTheme(nextTheme(theme))}
      title={`${label} (click for ${next.toLowerCase()})`}
      aria-label={`${label}. Switch to ${next.toLowerCase()}`}
    >
      <Icon size={18} />
    </button>
  );
}
