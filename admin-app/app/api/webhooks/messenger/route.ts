import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { receiveMessengerMessage } from '@/data/support-chat/messenger';

const envelopeSchema = z.object({
  object: z.literal('page'),
  entry: z.array(z.object({
    id: z.string(),
    messaging: z.array(z.unknown()).optional(),
  })),
});

const textEventSchema = z.object({
  sender: z.object({ id: z.string().regex(/^\d{1,32}$/) }),
  message: z.object({
    mid: z.string().min(1).max(512),
    text: z.string().trim().min(1).max(4000).refine((text) => !text.includes('\0')),
    is_echo: z.boolean().optional(),
  }),
});

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = process.env.META_VERIFY_TOKEN;
  const challenge = params.get('hub.challenge');
  if (!token || params.get('hub.mode') !== 'subscribe'
    || params.get('hub.verify_token') !== token || !challenge) {
    return new Response(null, { status: 403 });
  }
  return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 503 });
  }

  let payload: unknown;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    if (secret) {
      const signature = request.headers.get('x-hub-signature-256');
      const expected = createHmac('sha256', secret).update(raw).digest();
      if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)
        || !timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) {
        return new Response(null, { status: 403 });
      }
    }
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return new Response(null, { status: 400 });
  }

  const envelope = envelopeSchema.safeParse(payload);
  if (!envelope.success) return new Response(null, { status: 400 });

  try {
    const pageId = process.env.META_PAGE_ID;
    for (const entry of envelope.data.entry) {
      if (pageId && entry.id !== pageId) continue;
      for (const event of entry.messaging ?? []) {
        const parsed = textEventSchema.safeParse(event);
        if (!parsed.success || parsed.data.message.is_echo) continue;
        const { sender, message } = parsed.data;
        await receiveMessengerMessage(sender.id, message.mid, message.text);
      }
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 500 });
  }
}
