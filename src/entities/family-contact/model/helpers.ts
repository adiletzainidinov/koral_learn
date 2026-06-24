import {
  FAMILY_RELATION_LABELS,
  type FamilyContact,
  type FamilyRelationType,
} from './types';

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeUsername(value: string): string {
  return value.replace(/^@/, '').toLowerCase().trim();
}

export function normalizePersonName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function formatContactRelation(link: {
  relation: FamilyRelationType;
  customRelation?: string;
}): string {
  if (link.relation === 'other' && link.customRelation) return link.customRelation;
  return FAMILY_RELATION_LABELS[link.relation];
}

export function formatWhatsappLink(whatsapp: string): string {
  const digits = normalizePhone(whatsapp);
  return `https://wa.me/${digits}`;
}

export function formatTelegramLink(telegram: string): string {
  const handle = telegram.replace(/^@/, '');
  return `https://t.me/${handle}`;
}

export function formatInstagramLink(instagram: string): string {
  const handle = instagram.replace(/^@/, '');
  return `https://instagram.com/${handle}`;
}

/** Build a wa.me link for a contact. */
export function formatContactsForWhatsApp(contact: FamilyContact): string {
  return formatWhatsappLink(contact.whatsapp);
}

export function getContactInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
