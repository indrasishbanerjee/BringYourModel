import type { Recipe } from './types';

const ARTICLE_SAMPLE = `Bring Your Model (BYOM) is a browser extension that acts as an AI wallet. Developers add the SDK to their site; users bring their own API keys and approve spending per origin. The extension handles vault encryption, consent, routing across providers, and budget enforcement.

Unlike proxy APIs, credentials never pass through your backend. The SDK talks to the extension over a secure bridge, and each request can show cost estimates before the user approves.`;

const EMAIL_THREAD_SAMPLE = `From: alex@clientco.com
Subject: Re: Q2 onboarding timeline

Hi team — we were promised access by April 15 but still cannot invite teammates. Can someone confirm whether billing was applied to the wrong workspace? We need this resolved before our board review on Friday.

Thanks,
Alex`;

const SUPPORT_TICKET_SAMPLE = `Subject: Cannot export reports after plan upgrade

I upgraded to Pro yesterday and now every CSV export fails with "permission denied". I already cleared cache and tried Chrome and Firefox. Our finance team needs March data today. Account email: jordan@northwind.io`;

const CONTACT_EMAIL_SAMPLE = `Hi — my name is Priya Sharma, email priya.sharma@lumina.dev. I lead platform engineering at Lumina Health and we're evaluating BYOM for our internal tools. Please loop in sales for a 30-minute demo next week.`;

const INVOICE_SAMPLE = `Invoice #INV-2024-0892 from CloudHost Pro
Date: March 12, 2024
Bill to: Northwind Analytics, 400 Market St, San Francisco CA 94105

Line items:
- Dedicated instance (m5.xlarge) — $312.00
- Egress 2.4 TB — $86.40
- Support Premium — $49.00

Subtotal: $447.40
Tax (8.5%): $38.03
Total due: $485.43
Payment terms: Net 30`;

const FAQ_QUERY = 'How do I reset my API key after a team member left?';
const FAQ_ENTRY =
  'To rotate API keys, open the extension popup, go to Providers, select your provider, and click Rotate key. Old keys stop working within 60 seconds.';

export const RECIPES: Recipe[] = [
  {
    id: 'extension-check',
    title: 'Extension check',
    description:
      'Verify the extension is installed, the vault is unlocked, and this origin is approved before calling models.',
    category: 'setup',
    kind: 'extension-check',
    runLabel: 'Refresh status',
    code: `import { byom } from '@byomsdk/sdk';

const available = await byom.isAvailable({ timeoutMs: 2000 });
if (!available) {
  console.warn('Install the BYOM extension');
  return;
}

const caps = await byom.getCapabilities();
if (!caps?.vaultUnlocked) {
  alert('Unlock the BYOM extension vault first.');
}
if (!caps?.siteApproved) {
  // First SDK call will open the consent flow
}`,
    defaults: {},
  },
  {
    id: 'event-listeners',
    title: 'Event listeners',
    description:
      'Subscribe to wallet and permission events so your app can react when the vault locks or budgets run low.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import { byom } from '@byomsdk/sdk';

const unsub = byom.on('budget-warning', (payload) => {
  console.warn('Budget warning:', payload.data);
});

byom.on('vault-locked', () => {
  showBanner('Unlock BYOM to continue using AI features');
});

byom.on('permission-needed', () => {
  showBanner('Approve this site in the BYOM extension');
});

// Later:
unsub();`,
    defaults: {},
  },
  {
    id: 'error-handling',
    title: 'Error handling',
    description:
      'Handle typed SDK errors for install, consent, and budget limits in production apps.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import {
  byom,
  ExtensionNotInstalledError,
  PermissionDeniedError,
  BudgetExceededError,
  ByomError,
} from '@byomsdk/sdk';

try {
  const { text, costUSD } = await byom.ask({
    task: 'summarize',
    input: document.body.innerText.slice(0, 5000),
  });
  console.log(text, \`($\${costUSD.toFixed(4)})\`);
} catch (err) {
  if (err instanceof ExtensionNotInstalledError) {
    promptInstallExtension();
  } else if (err instanceof PermissionDeniedError) {
    showConsentHint();
  } else if (err instanceof BudgetExceededError) {
    showBudgetExceeded(err.details);
  } else if (err instanceof ByomError) {
    console.error(err.code, err.message);
  }
}`,
    defaults: {},
  },
  {
    id: 'fallback-server',
    title: 'BYOM with server fallback',
    description:
      'Progressive enhancement: use BYOM when available, otherwise call your own backend.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import { createByomWithFallback } from '@byomsdk/sdk';

const ai = createByomWithFallback({
  askFallback: async (req) => {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
});

const { text } = await ai.ask({ input: 'Summarize this page.' });`,
    defaults: {},
  },
  {
    id: 'install-cta',
    title: 'Extension install CTA',
    description: 'Detect extension state and show the right next step for users.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import { createInstallPromptState, getInstallUrl } from '@byomsdk/sdk';

const state = await createInstallPromptState();
switch (state.recommendedAction) {
  case 'install-extension':
    window.location.href = getInstallUrl();
    break;
  case 'unlock-vault':
    alert('Unlock BYOM Wallet in the extension side panel.');
    break;
  case 'approve-site':
    alert('Run an AI action to open the consent dialog.');
    break;
  case 'ready':
    console.log('Ready to use BYOM');
}`,
    defaults: {},
  },
  {
    id: 'local-first',
    title: 'Local-first BYOM only',
    description:
      'Ollama/LM Studio path — no server fallback; strong install CTA when extension is missing.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import { byom, getInstallUrl } from '@byomsdk/sdk';

if (!(await byom.isAvailable())) {
  window.location.href = getInstallUrl();
  throw new Error('Install BYOM Wallet to use local models');
}

// Configure Ollama in the extension, set routing to prefer local
const { text } = await byom.ask({
  input: 'Summarize using my local model.',
});`,
    defaults: {},
  },
  {
    id: 'openai-compat',
    title: 'OpenAI-compatible client',
    description: 'Swap your OpenAI import — requests route through BYOM, not your API key.',
    category: 'setup',
    kind: 'code-only',
    codeOnly: true,
    code: `import { OpenAI } from '@byomsdk/sdk/openai';

const client = new OpenAI();

const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize this page.' }],
});

console.log(completion.choices[0].message.content);
console.log(completion.byom);`,
    defaults: {},
  },
  {
    id: 'summarize-article',
    title: 'Summarize article',
    description:
      'Condense long page text for reader mode, newsletters, or internal knowledge bases.',
    category: 'text',
    kind: 'ask-summarize',
    runLabel: 'Summarize',
    code: `import { byom } from '@byomsdk/sdk';

const { text, costUSD } = await byom.ask({
  task: 'summarize',
  input: document.body.innerText.slice(0, 5000),
});

console.log(text, \`($\${costUSD.toFixed(4)})\`);`,
    defaults: { input: ARTICLE_SAMPLE },
  },
  {
    id: 'draft-email',
    title: 'Draft email reply',
    description: 'Generate a professional reply from an email thread — common in CRM and inbox assistants.',
    category: 'text',
    kind: 'ask-draft',
    runLabel: 'Draft reply',
    code: `import { byom } from '@byomsdk/sdk';

const { text } = await byom.ask({
  task: 'draft',
  input: \`Reply to this email thread professionally:\\n\\n\${threadText}\`,
});`,
    defaults: { input: EMAIL_THREAD_SAMPLE },
  },
  {
    id: 'stream-cancel',
    title: 'Stream with cancel',
    description:
      'Stream tokens into your UI and let users cancel long generations with AbortController.',
    category: 'text',
    kind: 'stream',
    runLabel: 'Start stream',
    code: `import { byom } from '@byomsdk/sdk';

const controller = new AbortController();
const gen = byom.stream(
  { input: 'Write a short product changelog for a browser extension.' },
  controller.signal,
);

cancelButton.onclick = () => controller.abort();

let fullText = '';
for await (const chunk of gen) {
  fullText += chunk.text;
  outputEl.textContent = fullText;
}`,
    defaults: {
      input: 'Write a short product changelog for a browser extension that routes AI requests through user-owned API keys.',
    },
  },
  {
    id: 'route-ticket',
    title: 'Route support ticket',
    description: 'Classify inbound tickets into queues for billing, technical, sales, or general triage.',
    category: 'structured',
    kind: 'classify',
    runLabel: 'Classify',
    code: `import { byom } from '@byomsdk/sdk';

const result = await byom.classify(ticketBody, [
  'billing',
  'technical',
  'sales',
  'other',
]);

routeToQueue(result.category, result.confidence);`,
    defaults: {
      input: SUPPORT_TICKET_SAMPLE,
      categories: 'billing, technical, sales, other',
    },
  },
  {
    id: 'extract-contact',
    title: 'Extract contact',
    description: 'Pull structured fields from unstructured email for CRM autofill.',
    category: 'structured',
    kind: 'extract',
    runLabel: 'Extract',
    code: `import { byom } from '@byomsdk/sdk';

interface Contact {
  name: string;
  email: string;
  company: string;
}

const contact = await byom.extract<Contact>({
  input: emailBody,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      company: { type: 'string' },
    },
    required: ['name', 'email'],
  },
});`,
    defaults: {
      input: CONTACT_EMAIL_SAMPLE,
      extractSchema: JSON.stringify(
        {
          name: { type: 'string' },
          email: { type: 'string' },
          company: { type: 'string' },
        },
        null,
        2
      ),
    },
  },
  {
    id: 'extract-invoice',
    title: 'Extract invoice fields',
    description: 'Parse invoice text into line items and totals for expense tooling.',
    category: 'structured',
    kind: 'extract',
    runLabel: 'Extract',
    code: `const invoice = await byom.extract({
  input: invoiceText,
  schema: {
    type: 'object',
    properties: {
      invoiceNumber: { type: 'string' },
      vendor: { type: 'string' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      total: { type: 'number' },
    },
    required: ['invoiceNumber', 'total'],
  },
});`,
    defaults: {
      input: INVOICE_SAMPLE,
      extractSchema: JSON.stringify(
        {
          invoiceNumber: { type: 'string' },
          vendor: { type: 'string' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
              },
            },
          },
          total: { type: 'number' },
        },
        null,
        2
      ),
    },
  },
  {
    id: 'semantic-faq',
    title: 'Semantic FAQ match',
    description:
      'Embed a user question and FAQ entries, then rank by cosine similarity — lightweight RAG without a vector database.',
    category: 'structured',
    kind: 'embed-faq',
    runLabel: 'Compare embeddings',
    code: `import { byom } from '@byomsdk/sdk';

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const [q, faq] = await Promise.all([
  byom.embed({ input: userQuestion }),
  byom.embed({ input: faqText }),
]);

const score = cosineSimilarity(q.embedding, faq.embedding);
if (score > 0.75) showFaq(faqText);`,
    defaults: { input: FAQ_QUERY, inputSecondary: FAQ_ENTRY },
  },
  {
    id: 'support-bot',
    title: 'Support bot',
    description: 'Multi-turn chat with a system prompt for branded customer support.',
    category: 'conversation',
    kind: 'chat-send',
    runLabel: 'Send',
    code: `import { byom } from '@byomsdk/sdk';

const session = byom.chat({
  systemMessage: 'You are a helpful support agent for Acme SaaS.',
});

const reply = await session.send('How do I rotate an API key?');
console.log(reply.text);

console.log(session.history());
session.close();`,
    defaults: {
      input: 'How do I rotate an API key after someone leaves the team?',
      systemMessage:
        'You are a helpful customer support agent for Acme SaaS. Be concise and professional.',
    },
  },
  {
    id: 'chat-stream',
    title: 'Stream a chat turn',
    description: 'Stream assistant tokens for a single chat turn with cancellation support.',
    category: 'conversation',
    kind: 'chat-stream',
    runLabel: 'Stream reply',
    code: `const session = byom.chat({ systemMessage: 'You are a coding assistant.' });

const controller = new AbortController();
const stream = session.stream(userMessage, controller.signal);

for await (const chunk of stream) {
  assistantEl.textContent += chunk.text;
}`,
    defaults: {
      input: 'Explain how BYOM keeps API keys out of my backend in two sentences.',
      systemMessage: 'You are a concise technical assistant.',
    },
  },
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
