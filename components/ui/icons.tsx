/**
 * Icônes SVG partagées — extraites des définitions strictement identiques
 * (même tracé) qui étaient dupliquées telles quelles dans une vingtaine de
 * fichiers. Chaque icône garde les mêmes défauts (taille, couleur, épaisseur
 * de trait) que sa version la plus courante ; les call sites qui utilisaient
 * une variante (taille différente) passent la prop correspondante.
 *
 * Volontairement laissées en dehors : les icônes qui se ressemblent mais ont
 * un tracé réellement différent (ex. deux styles de crayon/corbeille) —
 * les fusionner aurait changé leur rendu, ce qui n'est pas l'objectif ici.
 */

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function IconX({ size = 17, color = "currentColor", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}

export function IconClock({ size = 13, color = "currentColor", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" />
    </svg>
  );
}

export function IconSearch({ size = 16, color = "#A6A498", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" /><line x1="13.5" y1="13.5" x2="18" y2="18" />
    </svg>
  );
}

export function IconChevronDown({ size = 15, color = "#A6A498", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

export function IconStop({ size = 11, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}><rect x="4.5" y="4.5" width="11" height="11" rx="2" /></svg>
  );
}

/** Triangle à angles vifs — chrono de la sidebar / barre mobile. */
export function IconPlay({ size = 12, color = "currentColor" }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill={color}><path d="M6 4.5v11l9-5.5z" /></svg>;
}

/** Triangle à angles arrondis — listes de tâches. */
export function IconPlayRounded({ size = 11, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <path d="M6 4.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" />
    </svg>
  );
}

export function IconPause({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <rect x="5.5" y="4.5" width="3.2" height="11" rx="1" /><rect x="11.3" y="4.5" width="3.2" height="11" rx="1" />
    </svg>
  );
}

export function IconFolder({ size = 16, color = "currentColor", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6.5C3 5.7 3.6 5 4.4 5H8l1.6 1.8h6C16.4 6.8 17 7.4 17 8.2V14.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 16 3 15.4 3 14.6Z" />
    </svg>
  );
}

export function IconDownload({ size = 16, color = "currentColor", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v9" /><path d="M6.5 9l3.5 3.5L13.5 9" /><path d="M4 15.5h12" />
    </svg>
  );
}

export function IconUpload({ size = 18, color = "currentColor", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14V5" /><path d="M6.5 8l3.5-3.5L13.5 8" /><path d="M4 15.5h12" />
    </svg>
  );
}
