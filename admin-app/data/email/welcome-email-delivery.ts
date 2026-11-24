type WelcomeRecipient = { email: string; name?: string };

export function buildWelcomeEmail(
  recipient: WelcomeRecipient,
  senderEmail: string,
  siteOrigin: string,
) {
  const name = recipient.name?.trim() || 'Valued Customer';
  const htmlName = name.replace(/[&<>]/g, (char) =>
    char === '&' ? '&amp;' : char === '<' ? '&lt;' : '&gt;',
  );
  const links = [
    ['Browse e-bikes', '/shop'],
    ['Book a service appointment', '/dashboard/appointments/new'],
    ['Get help', '/help'],
  ].map(([label, path]) => ({ label, href: new URL(path, siteOrigin).href }));

  return {
    sender: { email: senderEmail, name: 'NJET' },
    to: [{ email: recipient.email }],
    subject: 'Welcome to NJET',
    textContent: [
      'Hi ' + name + ',',
      'Welcome to NJET! Here are a few ways to get started:',
      ...links.map(({ label, href }) => label + ': ' + href),
    ].join('\n\n'),
    htmlContent: [
      '<div style="max-width:520px;margin:auto;padding:20px;font:16px/1.6 Arial,sans-serif;color:#17242c">',
      '<h1 style="font-size:26px;color:#07634e">Welcome to NJET</h1>',
      '<p>Hi ' + htmlName + ',</p>',
      '<p>Thanks for creating an account. Here are a few ways to get started:</p>',
      ...links.map(({ label, href }) =>
        '<p><a style="color:#07634e;text-decoration:underline" href="' + href + '">' + label + '</a></p>',
      ),
      '</div>',
    ].join(''),
  };
}

export async function deliverWelcomeEmail({
  recipient, apiKey, senderEmail, getOrigin, claim, send = fetch,
}: {
  recipient: WelcomeRecipient;
  apiKey?: string;
  senderEmail?: string;
  getOrigin: () => string;
  claim: () => Promise<boolean>;
  send?: typeof fetch;
}) {
  if (!apiKey || !senderEmail) {
    console.warn('Welcome email skipped because Brevo configuration is missing.');
    return;
  }

  try {
    const payload = buildWelcomeEmail(recipient, senderEmail, getOrigin());
    if (!(await claim())) return;

    const response = await send('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) console.warn('Welcome email rejected by Brevo.', response.status);
  } catch {
    console.warn('Welcome email could not be sent.');
  }
}
