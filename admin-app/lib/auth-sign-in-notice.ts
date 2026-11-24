const signInNotice = 'signedIn';

export function addSignInNotice(url: URL) {
  url.searchParams.set(signInNotice, '1');
  return url;
}

export function consumeSignInNotice(url: URL) {
  const showNotice = url.searchParams.get(signInNotice) === '1';
  if (showNotice) url.searchParams.delete(signInNotice);
  return showNotice;
}
