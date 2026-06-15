export function formatWhatsappLink(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, '');
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
