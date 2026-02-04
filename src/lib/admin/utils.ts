export type PasteStatus = 'active' | 'expired' | 'destroyed';

export function getPasteStatus(paste: { 
  expiresAt: Date | null; 
  burnCount: number | null 
}): PasteStatus {
  const now = new Date();
  if (paste.expiresAt && paste.expiresAt < now) return 'expired';
  if (paste.burnCount !== null && paste.burnCount <= 0) return 'destroyed';
  return 'active';
}
