import { formatPhp } from '@/lib/commerce';

const placeholderWords = new Set('test testing placeholder sample demo dummy lorem ipsum asdf qwerty foobar todo tbd na n a coming soon description no text copy product data here'.split(' '));

export function featuredProductDescription(value: string) {
  const text = value.trim();
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  return text.length >= 10 && words.length >= 2
    && !words.every((word) => placeholderWords.has(word) || /^(?:asdf|qwerty|jkl|abc)+$/i.test(word))
    && !/^lorem ipsum\b/i.test(text) && !/^(\p{L})\1{4,}/iu.test(text)
    ? text
    : 'Ask our team for product details.';
}

export function isSrpLabel(label: string) {
  return /^s\.?r\.?p\.?$/i.test(label.trim());
}

export function readSrpMinor(value: string) {
  const pesos = value.trim().replace(/^(?:₱|PHP|P)\s*/i, '').replaceAll(',', '');
  const minor = Math.round(Number(pesos) * 100);
  return /^\d+(?:\.\d{1,2})?$/.test(pesos) && Number.isSafeInteger(minor) ? minor : null;
}

export function featuredSpecification(label: string, value: string) {
  const srp = isSrpLabel(label) ? readSrpMinor(value) : null;
  return srp === null ? `${label} ${value}` : `SRP ${formatPhp(srp)}`;
}
