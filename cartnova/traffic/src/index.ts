// CartNova Traffic Scheduler -- Cron Worker
//
// Triggers the GitHub Actions traffic generator workflow every 5 minutes.
// The actual traffic generation runs on GitHub's infrastructure (outside
// Cloudflare's network) so requests pass through the full security
// proxy pipeline and appear in API Shield / Security Analytics.
//
// Why not generate traffic directly from this Worker?
//   Worker-to-same-zone subrequests bypass the security pipeline.
//   Traffic from inside Cloudflare's network (Workers, WARP) is routed
//   internally and never reaches Security Analytics or API Shield.

import { TRAFFIC_ENABLED } from "./config";

interface Env {
  GITHUB_TOKEN: string;
}

const GITHUB_REPO = "petras-leonardas/API-Shield-Demo-Companies";
const WORKFLOW_FILE = "traffic.yml";

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!TRAFFIC_ENABLED) {
      console.log("[scheduler] Traffic paused via kill switch (TRAFFIC_ENABLED = false in config.ts)");
      return;
    }
    ctx.waitUntil(triggerGitHubWorkflow(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // POST /trigger -- manually trigger the GitHub workflow
    if (url.pathname === "/trigger" && request.method === "POST") {
      const result = await triggerGitHubWorkflow(env);
      return Response.json(result);
    }

    // GET /status -- check recent workflow runs
    if (url.pathname === "/status") {
      const result = await getWorkflowStatus(env);
      return Response.json(result);
    }

    return Response.json({
      name: "CartNova Traffic Scheduler",
      description: "Triggers GitHub Actions workflow for external traffic generation",
      repo: GITHUB_REPO,
      workflow: WORKFLOW_FILE,
      cron: "*/5 * * * *",
      endpoints: {
        "POST /trigger": "Manually trigger the traffic workflow",
        "GET /status": "Check recent workflow runs",
        "GET /": "This status page",
      },
    });
  },
};

async function triggerGitHubWorkflow(env: Env): Promise<{ ok: boolean; message: string }> {
  if (!env.GITHUB_TOKEN) {
    console.error("[trigger] GITHUB_TOKEN secret not set");
    return { ok: false, message: "GITHUB_TOKEN secret not configured" };
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "cartnova-traffic-scheduler",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (resp.status === 204) {
      console.log("[trigger] GitHub workflow dispatched successfully");
      return { ok: true, message: "Workflow dispatched" };
    }

    const body = await resp.text();
    console.error(`[trigger] GitHub API returned ${resp.status}: ${body}`);
    return { ok: false, message: `GitHub API ${resp.status}: ${body}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[trigger] Failed: ${msg}`);
    return { ok: false, message: msg };
  }
}

async function getWorkflowStatus(env: Env): Promise<unknown> {
  if (!env.GITHUB_TOKEN) {
    return { error: "GITHUB_TOKEN secret not configured" };
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "cartnova-traffic-scheduler",
        },
      }
    );

    const data = await resp.json() as any;
    return {
      recent_runs: (data.workflow_runs || []).map((run: any) => ({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        started: run.created_at,
        url: run.html_url,
      })),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
