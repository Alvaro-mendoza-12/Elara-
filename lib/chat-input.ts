import { z } from 'zod';

const turnSchema = z.object({
  id: z.string().max(200),
  role: z.enum(['user', 'assistant']),
  parts: z.array(z.union([
    z.object({ type: z.literal('text'), text: z.string().max(50_000) }),
    z.object({ type: z.literal('step-start') }),
  ])).min(1).max(16).transform((parts) => parts.filter((part) => part.type === 'text')),
});
const inputSchema = z.object({ messages: z.array(turnSchema).min(1).max(200) });

export function parseChatInput(body: unknown) {
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return null;
  const all = parsed.data.messages.filter((message) => message.role === 'user' || message.parts.some((part) => part.text.trim()));
  if (all.at(-1)?.role !== 'user' || !all.at(-1)?.parts.some((part) => part.text.trim())) return null;
  if (all.reduce((n, message) => n + message.parts.reduce((size, part) => size + part.text.length, 0), 0) > 600_000) return null;
  // Keep complete recent messages and bound tokens as well as turn count.
  let chars = 0;
  const context = [];
  for (const message of all.slice(-40).reverse()) {
    const size = message.parts.reduce((n, part) => n + part.text.length, 0);
    if (chars + size > 100_000) {
      if (!context.length) return null;
      // A large old answer must not hide earlier, much smaller user facts.
      continue;
    }
    context.unshift(message); chars += size;
  }
  // An upstream model must always see the user's request, never an orphan reply.
  while (context[0]?.role === 'assistant') context.shift();
  return context.length ? context : null;
}
