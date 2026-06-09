import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token";

type UpstoxTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing Upstox authorization code." }, { status: 400 });
  }

  const clientId = process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = getRedirectUri(request);

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing UPSTOX_CLIENT_ID or UPSTOX_CLIENT_SECRET." },
      { status: 500 },
    );
  }

  const response = await fetch(UPSTOX_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as UpstoxTokenResponse;

  if (!response.ok || !payload.access_token) {
    return NextResponse.json(
      {
        error: "Upstox token exchange failed.",
        status: response.status,
        details: payload.error_description ?? payload.error,
        redirectUri,
      },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production") {
    await saveVercelEnvToken(payload.access_token);
  } else {
    await saveLocalAccessToken(payload.access_token);
  }

  return NextResponse.json({
    status: "ok",
    message:
      process.env.NODE_ENV === "production"
        ? "Upstox token refreshed and saved to Vercel. Live in ~30s after next request."
        : "Upstox access token saved to .env.local. Restart the dev server to apply.",
    tokenType: payload.token_type ?? "Bearer",
    expiresIn: payload.expires_in ?? null,
  });
}

function getRedirectUri(request: Request) {
  return process.env.UPSTOX_REDIRECT_URI ?? new URL("/api/upstox/callback", request.url).toString();
}

async function saveVercelEnvToken(accessToken: string) {
  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !projectId) {
    return;
  }

  const baseUrl = `https://api.vercel.com/v10/projects/${projectId}/env`;
  const params = teamId ? `?teamId=${teamId}` : "";

  const listRes = await fetch(`${baseUrl}${params}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });

  if (!listRes.ok) return;

  type VercelEnvVar = { id: string; key: string };
  const { envs } = (await listRes.json()) as { envs: VercelEnvVar[] };
  const existing = envs.find((e) => e.key === "UPSTOX_ACCESS_TOKEN");

  if (existing) {
    await fetch(`${baseUrl}/${existing.id}${params}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: accessToken }),
    });
  } else {
    await fetch(`${baseUrl}${params}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "UPSTOX_ACCESS_TOKEN",
        value: accessToken,
        type: "encrypted",
        target: ["production"],
      }),
    });
  }
}

async function saveLocalAccessToken(accessToken: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  const line = `UPSTOX_ACCESS_TOKEN=${accessToken}`;

  try {
    const current = await readFile(envPath, "utf8");
    const updated = current.match(/^UPSTOX_ACCESS_TOKEN=/m)
      ? current.replace(/^UPSTOX_ACCESS_TOKEN=.*$/m, line)
      : `${current.trimEnd()}\n${line}\n`;
    await writeFile(envPath, updated);
  } catch {
    await appendFile(envPath, `${line}\n`);
  }
}
