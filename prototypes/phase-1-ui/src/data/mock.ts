export type Role = 'SELLER' | 'OWNER + SELLER' | 'PRODUCTION';
export type Employee = { id: string; name: string; role: 'OWNER + SELLER' | 'SELLER' | 'PRODUCTION'; place: string; status: 'Активен' | 'Отключён'; mfa?: boolean };
export const identities: Record<Role, { name: string; initials: string; place: string }> = {
  'SELLER': { name: 'Seller A', initials: 'SA', place: 'SALON_A' },
  'OWNER + SELLER': { name: 'Owner Demo', initials: 'OD', place: 'Компания' },
  'PRODUCTION': { name: 'Production A', initials: 'PA', place: 'WORKSHOP_MAIN' },
};
export const initialEmployees: Employee[] = [
  { id: 'owner-demo', name: 'Owner Demo', role: 'OWNER + SELLER', place: 'SALON_A · SALON_B', status: 'Активен', mfa: true },
  { id: 'seller-a', name: 'Seller A', role: 'SELLER', place: 'SALON_A', status: 'Активен' },
  { id: 'seller-b', name: 'Seller B', role: 'SELLER', place: 'SALON_B', status: 'Активен' },
  { id: 'production-a', name: 'Production A', role: 'PRODUCTION', place: 'WORKSHOP_MAIN', status: 'Активен' },
];
