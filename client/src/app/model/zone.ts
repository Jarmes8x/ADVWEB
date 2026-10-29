export const ZONES = ['ขามเรียง', 'ท่าขอนยาง', 'หน้าป้าย'] as const;
export type Zone = (typeof ZONES)[number];
