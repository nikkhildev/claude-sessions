import type { Session, SessionMessage } from './types.js';

// ─── Fake sessions with realistic content ───

const DEMO_SESSIONS: Array<{
  id: string;
  title: string;
  branch: string;
  messages: number;
  daysAgo: number;
  hoursAgo?: number;
  tags?: string[];
  conversation: SessionMessage[];
}> = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    title: 'Add dashboard analytics widget',
    branch: 'feature/dashboard-analytics',
    messages: 24,
    daysAgo: 0,
    hoursAgo: 2,
    tags: ['frontend', 'urgent'],
    conversation: [
      { type: 'user', content: "I want to add a new analytics widget to the dashboard that shows total user signups for the last 30 days", timestamp: '' },
      { type: 'assistant', content: "I'll add an analytics widget for 30-day user signups. Let me first check the existing dashboard structure and then create the component with a chart visualization.", timestamp: '' },
      { type: 'user', content: "great, use recharts for the visualization", timestamp: '' },
      { type: 'assistant', content: "Perfect. I'll use recharts LineChart with time-series data. Let me create the component at components/analytics/SignupsWidget.tsx and wire it into the dashboard grid.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0002-0002-0002-000000000002',
    title: 'Refactor authentication middleware',
    branch: 'refactor/auth-middleware',
    messages: 58,
    daysAgo: 1,
    tags: ['api', 'refactor'],
    conversation: [
      { type: 'user', content: "The auth middleware is getting unwieldy. Can we refactor it to use a cleaner chain of responsibility pattern?", timestamp: '' },
      { type: 'assistant', content: "Good idea. Let me look at the current middleware and propose a refactor. I'll split it into separate concerns: token validation, rate limiting, and session verification.", timestamp: '' },
      { type: 'user', content: "yes, and add proper TypeScript types throughout", timestamp: '' },
      { type: 'assistant', content: "I'll define an AuthContext type and ensure each middleware step is fully typed. The chain will compose cleanly with better error messages.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0003-0003-0003-000000000003',
    title: 'Fix login redirect loop on Safari',
    branch: 'fix/safari-login-loop',
    messages: 12,
    daysAgo: 1,
    hoursAgo: 6,
    tags: ['bug', 'critical'],
    conversation: [
      { type: 'user', content: "Users on Safari are getting stuck in a login redirect loop. Can you investigate?", timestamp: '' },
      { type: 'assistant', content: "Let me check the auth flow. This is likely a Safari cookie issue with SameSite policy. I'll reproduce and fix.", timestamp: '' },
      { type: 'user', content: "yes safari is strict about third-party cookies", timestamp: '' },
      { type: 'assistant', content: "Found it. The session cookie was being set with SameSite=None but not Secure=true, which Safari rejects. Adding Secure flag when HTTPS is detected.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0004-0004-0004-000000000004',
    title: 'Redis rate limiting for login endpoint',
    branch: 'feature/redis-rate-limit',
    messages: 42,
    daysAgo: 2,
    tags: ['api', 'security'],
    conversation: [
      { type: 'user', content: "We need to add rate limiting to the login endpoint to prevent brute force attacks", timestamp: '' },
      { type: 'assistant', content: "I'll implement Redis-backed rate limiting. Starting with 5 attempts per 15 minutes per IP, progressive backoff after limit is reached.", timestamp: '' },
      { type: 'user', content: "also track per-user, not just per-IP", timestamp: '' },
      { type: 'assistant', content: "Good call. I'll key the limiter on both ip+email combination. Let me add express-rate-limit with a custom Redis store.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0005-0005-0005-000000000005',
    title: 'Experiment with React Server Components',
    branch: 'experiment/rsc',
    messages: 31,
    daysAgo: 3,
    tags: ['experiment'],
    conversation: [
      { type: 'user', content: "I want to experiment with React Server Components for the product listing page to reduce JS bundle size", timestamp: '' },
      { type: 'assistant', content: "Let me set up a proof of concept. RSC will let us keep data fetching server-side and only send HTML for the list items. Client components only for interactive parts.", timestamp: '' },
      { type: 'user', content: "what are the tradeoffs?", timestamp: '' },
      { type: 'assistant', content: "Main tradeoffs: (1) no useState/useEffect in server components, (2) requires Next.js App Router or similar, (3) streaming SSR complexity. But bundle savings can be 40-60% on list-heavy pages.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0006-0006-0006-000000000006',
    title: 'CI pipeline optimization',
    branch: 'chore/ci-speedup',
    messages: 18,
    daysAgo: 4,
    tags: ['ci', 'done'],
    conversation: [
      { type: 'user', content: "Our CI takes 12 minutes. Can you help speed it up?", timestamp: '' },
      { type: 'assistant', content: "Let me analyze the pipeline. I'll look for parallelization opportunities, caching gaps, and redundant steps.", timestamp: '' },
      { type: 'user', content: "yes and add test sharding if it helps", timestamp: '' },
      { type: 'assistant', content: "Found 3 wins: (1) cache node_modules between jobs, (2) run lint and tests in parallel instead of serial, (3) shard tests across 3 runners. Target: under 5 minutes.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0007-0007-0007-000000000007',
    title: 'User profile page redesign',
    branch: 'feature/profile-redesign',
    messages: 37,
    daysAgo: 4,
    hoursAgo: 3,
    tags: ['frontend', 'ui'],
    conversation: [
      { type: 'user', content: "Can you implement the new profile page design? Figma link: figma.com/file/...", timestamp: '' },
      { type: 'assistant', content: "I'll start by setting up the new layout with the avatar, bio, and activity feed sections. Using the design tokens from our theme.", timestamp: '' },
      { type: 'user', content: "make the avatar upload work with drag and drop", timestamp: '' },
      { type: 'assistant', content: "Adding react-dropzone for the avatar upload with preview and validation (max 5MB, image types only).", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0008-0008-0008-000000000008',
    title: 'Database migration for user preferences',
    branch: 'feature/user-preferences',
    messages: 22,
    daysAgo: 5,
    tags: ['api', 'done'],
    conversation: [
      { type: 'user', content: "I need a new table for user preferences - theme, timezone, notification settings", timestamp: '' },
      { type: 'assistant', content: "I'll create a UserPreferences model with a one-to-one relation to User. Let me generate the Prisma migration.", timestamp: '' },
      { type: 'user', content: "also need the GraphQL resolvers", timestamp: '' },
      { type: 'assistant', content: "Adding preferences query and updatePreferences mutation with Zod validation for the input types.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0009-0009-0009-000000000009',
    title: 'Fix flaky E2E test for checkout flow',
    branch: 'fix/flaky-checkout-test',
    messages: 15,
    daysAgo: 6,
    tags: ['bug', 'test'],
    conversation: [
      { type: 'user', content: "The checkout E2E test is flaky, fails about 1 in 5 runs", timestamp: '' },
      { type: 'assistant', content: "Let me look at the test. Usually flakiness means timing issues or insufficient waits. I'll check for race conditions.", timestamp: '' },
      { type: 'user', content: "it always fails at the payment step", timestamp: '' },
      { type: 'assistant', content: "Found it — the test clicks Submit before the Stripe iframe fully loads. Adding waitFor the iframe ready state before interaction.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0010-0010-0010-000000000010',
    title: 'Try out Tailwind v4 migration',
    branch: 'experiment/tailwind-v4',
    messages: 26,
    daysAgo: 7,
    tags: ['experiment', 'frontend'],
    conversation: [
      { type: 'user', content: "Tailwind v4 just dropped. Can you test what a migration would look like in a branch?", timestamp: '' },
      { type: 'assistant', content: "Let me run the v4 migration tool. The big changes: config-less setup, new @config directive, updated color palette.", timestamp: '' },
      { type: 'user', content: "what breaks?", timestamp: '' },
      { type: 'assistant', content: "Main breakages: (1) tailwind.config.js becomes optional, (2) JIT is the only mode, (3) some opacity modifiers changed syntax. Overall ~15 files need manual tweaks.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0011-0011-0011-000000000011',
    title: 'Add API documentation with Swagger',
    branch: 'docs/api-swagger',
    messages: 19,
    daysAgo: 8,
    tags: ['api', 'docs'],
    conversation: [
      { type: 'user', content: "We need proper API docs. Let's use Swagger/OpenAPI", timestamp: '' },
      { type: 'assistant', content: "I'll set up swagger-ui-express and generate the spec from our route handlers using tsoa or similar decorator-based approach.", timestamp: '' },
      { type: 'user', content: "yes, tsoa is fine", timestamp: '' },
      { type: 'assistant', content: "Installing tsoa, configuring tsoa.json, and annotating existing controllers. I'll auto-generate the spec at build time.", timestamp: '' },
    ],
  },
  {
    id: 'a1b2c3d4-0012-0012-0012-000000000012',
    title: 'Memory leak investigation in websocket handler',
    branch: 'fix/ws-memory-leak',
    messages: 33,
    daysAgo: 10,
    tags: ['bug', 'critical'],
    conversation: [
      { type: 'user', content: "Server memory climbs to 2GB over a few hours. Suspect the websocket handler.", timestamp: '' },
      { type: 'assistant', content: "I'll profile with clinic.js to find the leak. Common suspects: event listeners not cleaned up, closures holding references, unclosed sockets.", timestamp: '' },
      { type: 'user', content: "found anything?", timestamp: '' },
      { type: 'assistant', content: "Yes — the `message` listener isn't removed when clients disconnect. Each reconnect adds a new listener. Fix: use once() or explicit removeListener in the close handler.", timestamp: '' },
    ],
  },
];

// ─── Project definitions ───

const DEMO_PROJECTS: Record<string, { description: string; sessionIndices: number[] }> = {
  Frontend: {
    description: 'UI components and client work',
    sessionIndices: [0, 6, 9], // dashboard, profile, tailwind
  },
  'Backend API': {
    description: 'API endpoints and business logic',
    sessionIndices: [1, 3, 7, 10], // auth middleware, redis, db migration, swagger
  },
  'Bug Fixes': {
    description: 'Production bug fixes',
    sessionIndices: [2, 8, 11], // safari, flaky test, memory leak
  },
  Learning: {
    description: 'Experiments and prototypes',
    sessionIndices: [4, 9], // RSC, Tailwind v4
  },
};

// ─── Builders ───

export function buildDemoSessions(): Session[] {
  const now = Date.now();
  return DEMO_SESSIONS.map((s) => {
    const ms =
      (s.daysAgo * 24 + (s.hoursAgo || 0)) * 60 * 60 * 1000;
    const date = new Date(now - ms);
    return {
      id: s.id,
      summary: s.title,
      firstPrompt: s.conversation[0]?.content || '',
      branch: s.branch,
      projectPath: '/home/you/project',
      projectDir: '/tmp/demo',
      messageCount: s.messages,
      created: date,
      modified: date,
      isSidechain: false,
      jsonlPath: `/tmp/demo/${s.id}.jsonl`,
      tags: s.tags || [],
      name: null,
      archived: false,
    };
  });
}

export function buildDemoMessages(sessionId: string): SessionMessage[] {
  const session = DEMO_SESSIONS.find((s) => s.id === sessionId);
  return session?.conversation || [];
}

export function buildDemoProjectIds(): Record<string, string[]> {
  const sessions = buildDemoSessions();
  const result: Record<string, string[]> = {};
  for (const [name, { sessionIndices }] of Object.entries(DEMO_PROJECTS)) {
    result[name] = sessionIndices.map((i) => sessions[i].id);
  }
  return result;
}

export function buildDemoProjectList(): Array<{
  name: string;
  description: string;
  sessions: string[];
  created: string;
}> {
  const sessions = buildDemoSessions();
  const now = new Date().toISOString();
  return Object.entries(DEMO_PROJECTS).map(([name, { description, sessionIndices }]) => ({
    name,
    description,
    sessions: sessionIndices.map((i) => sessions[i].id),
    created: now,
  }));
}
