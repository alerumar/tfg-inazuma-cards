/**
 * Parsea un string de fecha enviado por el backend (Java LocalDateTime).
 * Java serializa sin zona horaria: "2026-06-11T10:00:00"
 * JavaScript sin la 'Z' lo interpreta como hora local → error de +2h en España.
 * Esta función añade 'Z' si falta para forzar lectura en UTC.
 */
export function parseServerDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const isUtc = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr);
  return new Date(isUtc ? dateStr : dateStr + 'Z');
}

/**
 * Devuelve texto relativo en español: "Ahora mismo", "Hace 5 min", "Hace 2h", etc.
 */
export function timeAgo(dateStr: string): string {
  const date    = parseServerDate(dateStr);
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `Hace ${diffD}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
