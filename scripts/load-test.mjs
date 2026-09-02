#!/usr/bin/env node
/**
 * Load-tests a running dev/prod server: creates a session and simulates
 * TEAM_COUNT teams polling for state (like real phones) while a host
 * driver advances the quiz to completion, so submissions and polls
 * overlap the way they would on a real night.
 *
 * Usage: node scripts/load-test.mjs [--base=http://localhost:3000] [--teams=20]
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  })
);

const BASE = args.base ?? "http://localhost:3000";
const TEAM_COUNT = Number(args.teams ?? 20);
const POLL_INTERVAL_MS = 3000;
const THINK_TIME_MS = 1500;
const REVEAL_PAUSE_MS = 800;

const metrics = {
  poll: [],
  answer: [],
  join: [],
  advance: [],
  errors: [],
};

async function timed(bucket, label, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    metrics[bucket].push(performance.now() - start);
    return result;
  } catch (err) {
    metrics.errors.push(`${label}: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

async function api(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options?.method ?? "GET"} ${path} -> ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function stats(values) {
  if (values.length === 0) return "n=0";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return `n=${values.length} avg=${avg.toFixed(1)}ms p95=${percentile(values, 95).toFixed(1)}ms max=${Math.max(...values).toFixed(1)}ms`;
}

async function runTeam(code, name, stopSignal) {
  const { token } = await timed("join", "join", () =>
    api(`/api/sessions/${code}/join`, { method: "POST", body: JSON.stringify({ name }) })
  );

  let lastQuestionId = null;
  let answeredThisQuestion = false;

  while (!stopSignal.stopped) {
    let state;
    try {
      state = await timed("poll", "poll", () => api(`/api/sessions/${code}?token=${token}`));
    } catch {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (state.status === "ENDED") break;

    if (state.question?.id !== lastQuestionId) {
      lastQuestionId = state.question?.id ?? null;
      answeredThisQuestion = false;
    }

    if (state.status === "QUESTION_ACTIVE" && !answeredThisQuestion) {
      answeredThisQuestion = true;
      await sleep(Math.random() * THINK_TIME_MS);
      await timed("answer", "answer", () =>
        api(`/api/sessions/${code}/answers`, {
          method: "POST",
          body: JSON.stringify({ token, text: `answer from ${name}` }),
        })
      ).catch(() => {});
    }

    await sleep(POLL_INTERVAL_MS + Math.random() * 500);
  }
}

async function runHost(code, hostToken, stopSignal) {
  while (!stopSignal.stopped) {
    const state = await timed("advance", "host-poll", () =>
      api(`/api/sessions/${code}?as=host&hostToken=${encodeURIComponent(hostToken)}`)
    );

    if (state.status === "ENDED") {
      stopSignal.stopped = true;
      break;
    }
    if (state.status === "LOBBY") {
      await sleep(1500); // give teams a moment to join
      await timed("advance", "advance-start", () =>
        api(`/api/sessions/${code}/advance`, {
          method: "POST",
          body: JSON.stringify({ action: "start", hostToken }),
        })
      );
    } else if (state.status === "QUESTION_ACTIVE") {
      await sleep(THINK_TIME_MS + 500);
      await timed("advance", "advance-reveal", () =>
        api(`/api/sessions/${code}/advance`, {
          method: "POST",
          body: JSON.stringify({ action: "reveal", hostToken }),
        })
      );
    } else if (state.status === "REVEAL") {
      await sleep(REVEAL_PAUSE_MS);
      await timed("advance", "advance-next", () =>
        api(`/api/sessions/${code}/advance`, {
          method: "POST",
          body: JSON.stringify({ action: "next", hostToken }),
        })
      );
    }
    await sleep(300);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Load test: ${TEAM_COUNT} teams against ${BASE}`);

  const { pack } = await api("/api/packs/seed", { method: "POST" });
  const { session, hostToken } = await api("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ packId: pack.id }),
  });
  console.log(`Session ${session.code} created from pack "${pack.title}"`);

  const stopSignal = { stopped: false };
  const start = performance.now();

  const teamPromises = Array.from({ length: TEAM_COUNT }, (_, i) =>
    runTeam(session.code, `Load Team ${i + 1}`, stopSignal).catch((err) =>
      metrics.errors.push(`team ${i + 1}: ${err.message}`)
    )
  );

  await Promise.all([runHost(session.code, hostToken, stopSignal), ...teamPromises]);

  const durationS = ((performance.now() - start) / 1000).toFixed(1);

  console.log(`\nDone in ${durationS}s\n`);
  console.log(`Polls (GET session state):  ${stats(metrics.poll)}`);
  console.log(`Answers (POST answers):     ${stats(metrics.answer)}`);
  console.log(`Joins (POST join):          ${stats(metrics.join)}`);
  console.log(`Host advance calls:         ${stats(metrics.advance)}`);
  console.log(`Errors: ${metrics.errors.length}`);
  if (metrics.errors.length > 0) {
    console.log(metrics.errors.slice(0, 10).join("\n"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
