const page = process.env.NEXT_PUBLIC_META_PAGE_USERNAME?.trim()
  || process.env.NEXT_PUBLIC_META_PAGE_ID?.trim();

export const messengerUrl = page ? `https://m.me/${encodeURIComponent(page)}` : null;
