/**
 * Rehearsal stand-in model.
 *
 * This is NOT an LLM. It is a deterministic, dependency-free responder that produces
 * persona-shaped findings by pattern-matching the concept text. It exists so the
 * courtroom can be demonstrated end-to-end in a browser with no API key and no spend —
 * for judges, for offline development, and for the test suite.
 *
 * It is honest about what it is: every response is tagged `model: 'rehearsal'`, and the
 * demo UI labels the mode. The judge model is deliberately NOT answered here, so the
 * real deterministic-verdict fallback (AC-7.4) is the code path a rehearsal exercises.
 */
import type { MonsterId } from '@shared/types';
import { PERSONAS } from './personas';

export const REHEARSAL_MODEL = 'rehearsal/heuristic-stand-in';

interface Check {
  /** shown when the check is satisfied (the concept does address this) */
  prompt: string;
  /** shown when the concept is silent on it */
  miss: string;
  category: string;
  /** severity when the check is NOT satisfied */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** does the concept address this concern? */
  test: (t: string) => boolean;
}

const has = (t: string, re: RegExp) => re.test(t);
const stated = (t: string, re: RegExp) => has(t, re);

/** Per-persona interrogation, in the persona's own terms. */
const CHECKS: Record<MonsterId, Check[]> = {
  cashula: [
    {
      prompt: 'The submission names a revenue model.',
      miss: 'No revenue model is stated anywhere in the submission. You cannot invest in a business that has not decided how it collects money.',
      category: 'unit_economics',
      severity: 'critical',
      test: (t) => stated(t, /per seat|subscription|licen[cs]|subscription|transaction fee|rev(?:enue)? model|pricing|price|per month|per user|freemium|commission/i),
    },
    {
      prompt: 'Unit economics are described.',
      miss: 'There is no customer acquisition cost, lifetime value or payback period. Growth without unit economics is a bonfire, not a business.',
      category: 'cac_ltv',
      severity: 'high',
      test: (t) => stated(t, /\bCAC\b|lifetime value|\bLTV\b|payback|gross margin|churn/i),
    },
    {
      prompt: 'A funding need is quantified.',
      miss: 'The submission never says how much money this needs or what it buys. An ask without a number cannot be funded.',
      category: 'funding',
      severity: 'medium',
      test: (t) => stated(t, /fund(?:ing|raise|ed)|seed round|pre-seed|budget of|\$[\d,]+|\d+K\b/i),
    },
    {
      prompt: 'A realistic price point is implied.',
      miss: 'Nothing in the submission suggests anyone has ever paid for this or something like it. Price discovery has not started.',
      category: 'pricing',
      severity: 'high',
      test: (t) => stated(t, /paid|paying|customers pay|charging|willing to pay|revenue in/i),
    },
  ],
  zed: [
    {
      prompt: 'The target market is named.',
      miss: 'The submission never says who this is for. Uuuugh. If you cannot say who hurts, nobody hurts.',
      category: 'target_market',
      severity: 'critical',
      test: (t) => {
        const m = t.match(/target market\s*[:\-]?\s*(.{2,120})/i);
        return m ? !/not stated|n\/a|unknown|everyone|anyone/i.test(m[1]) : false;
      },
    },
    {
      prompt: 'The pain point is described in the customer\u2019s words.',
      miss: 'The problem is described from the builder\u2019s point of view. I am a customer and I still do not know what hurts me today.',
      category: 'pain_validity',
      severity: 'high',
      test: (t) => stated(t, /problem\s*[:\-]?\s*(.{15,})/i) && stated(t, /today|currently|now|existing|manual|hours|wastes|struggle/i),
    },
    {
      prompt: 'The cost of today\u2019s workaround is quantified.',
      miss: 'No time, money or error rate is attached to the old way of doing this. Without a number for the pain, nobody switches.',
      category: 'pain_validity',
      severity: 'medium',
      test: (t) => stated(t, /\d+\s*(?:hours|hrs|minutes|days|%|percent|weeks)/i),
    },
    {
      prompt: 'The first-run experience is considered.',
      miss: 'Nothing describes what happens in the first five minutes for a new user. That is where products in this space are abandoned.',
      category: 'usability',
      severity: 'medium',
      test: (t) => stated(t, /onboard|first run|sign[\s-]?up|setup|install|import|tutorial/i),
    },
  ],
  frankenbyte: [
    {
      prompt: 'The technical approach is concrete.',
      miss: 'The submission describes an outcome, not a mechanism. There is no stack, no data flow and no architecture. It is alive, but only barely.',
      category: 'feasibility',
      severity: 'critical',
      test: (t) => stated(t, /\bAPI\b|database|architecture|stack|framework|model|server|client|pipeline|Postgres|Redis|React|Python|Node/i),
    },
    {
      prompt: 'Scaling characteristics are considered.',
      miss: 'Nothing addresses what happens at ten times the load. Every system is trivially scalable at zero users.',
      category: 'scalability',
      severity: 'medium',
      test: (t) => stated(t, /scal|caching|queue|rate limit|concurren|throughput|latenc/i),
    },
    {
      prompt: 'Security and data handling are addressed.',
      miss: 'There is no mention of authentication, authorisation, or what data is stored about users. EXPERIMENT ON YOUR OWN ORGANISATION FIRST.',
      category: 'security',
      severity: 'high',
      test: (t) => stated(t, /secur|auth|encrypt|privacy|GDPR|PDPA|permission|access control|token/i),
    },
    {
      prompt: 'A delivery timeline exists.',
      miss: 'No timeline or milestone is given, so there is no basis for claiming this is buildable in the time available.',
      category: 'feasibility',
      severity: 'medium',
      test: (t) => stated(t, /\bphase\b|milestone|week \d|sprint|roadmap|\d+\s*weeks|\d+\s*months|MVP/i),
    },
  ],
  ghost: [
    {
      prompt: 'Competitors are acknowledged.',
      miss: 'The submission names no competitor. Every problem worth solving already has an incumbent, and the ones that failed are the most instructive.',
      category: 'competition',
      severity: 'high',
      test: (t) => stated(t, /competitor|alternative|incumbent|existing (?:product|tool|solution)|versus|vs\.?|instead of/i),
    },
    {
      prompt: 'Regulatory exposure is considered.',
      miss: 'Nothing mentions regulation or compliance. In a regulated domain this is the reason projects die after launch rather than before it.',
      category: 'regulatory',
      severity: 'medium',
      test: (t) => stated(t, /regulat|complian|license|certif|audit|GDPR|PDPA|HIPAA|policy/i),
    },
    {
      prompt: 'Ethical and human impact is addressed.',
      miss: 'The submission does not discuss who could be harmed or what happens when the system is wrong. That silence is the loudest thing in the record.',
      category: 'ethics',
      severity: 'high',
      test: (t) => stated(t, /ethic|harm|bias|fair|safety|human|consent|oversight|mistake|wrong/i),
    },
    {
      prompt: 'A specific failure mode is named.',
      miss: 'No failure mode is named. Every dead project had a founder who could not imagine this exact paragraph.',
      category: 'hidden_risk',
      severity: 'medium',
      test: (t) => stated(t, /risk|fail|drawback|limitation|downside|what could go wrong|dependency/i),
    },
  ],
};

function extractConcept(user: string): string {
  const m = user.match(/<CONCEPT>([\s\S]*?)<\/CONCEPT>/);
  return m ? m[1] : user;
}

/**
 * Identify the speaker from the `persona_id` marker that `personaPrompt` writes into
 * the system message. Matching on display names is not safe -- the judge's own prompt
 * names the other personas, which would misroute it to a monster.
 */
function classify(system: string): MonsterId | 'judge' {
  const m = system.match(/persona_id=([a-z]+)/);
  const id = m?.[1];
  if (id && id in CHECKS) return id as MonsterId;
  return 'judge';
}

const ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/** Build a persona-shaped report from the concept text alone. */
export function rehearsalReport(monsterId: MonsterId, conceptText: string) {
  const checks = CHECKS[monsterId];
  const missed = checks.filter((c) => !c.test(conceptText));
  const met = checks.filter((c) => c.test(conceptText));

  const findings = [
    ...missed.map((c, i) => ({
      id: `${monsterId}-r${i + 1}`,
      claim: c.miss,
      evidence: `The submission does not contain language addressing ${c.category.replace(/_/g, ' ')}.`,
      severity: c.severity,
      category: c.category,
      requiresVerification: true,
    })),
    ...met.map((c, i) => ({
      id: `${monsterId}-r${missed.length + i + 1}`,
      claim: c.prompt,
      evidence: `The submission contains a statement addressing ${c.category.replace(/_/g, ' ')}.`,
      severity: 'low' as const,
      category: c.category,
      requiresVerification: false,
    })),
  ];

  const worst = missed.reduce<keyof typeof ORDER>(
    (acc, c) => (ORDER[c.severity] < ORDER[acc] ? c.severity : acc),
    'low',
  );

  return {
    perspective: PERSONAS[monsterId].perspective,
    findings: findings.slice(0, 6),
    overallSeverity: worst,
    confidence: Math.round((missed.length / checks.length) * 100),
    model: REHEARSAL_MODEL,
  };
}

/**
 * A `fetch` implementation that answers monster prompts locally and refuses the judge
 * prompt, so the deterministic verdict path runs.
 */
export function createRehearsalFetch(): typeof fetch {
  return (async (_input: any, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const system: string = body?.messages?.[0]?.content ?? '';
    const user: string = body?.messages?.[1]?.content ?? '';
    const who = classify(system);

    if (who === 'judge') {
      // Deliberate: the judge is not rehearsed. This is what makes the demo exercise
      // the real deterministic fallback instead of pretending to be an LLM.
      return new Response('{"error":"rehearsal refuses the judge role"}', { status: 503 });
    }

    const payload = rehearsalReport(who, extractConcept(user));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
        model: REHEARSAL_MODEL,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
}
