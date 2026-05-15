import { NextResponse } from "next/server";
import {
  consumeAgentMagicLink,
  getAgentMagicLink,
  isAgentMagicLinkUsable,
  setAgentSession
} from "@/lib/auth/session";
import { resolveAgentAccessDestination } from "@/lib/auth/destinations";
import { hasPostgresEnv } from "@/lib/db/postgres";
import { getPublicOriginFromRequest } from "@/lib/public-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || !hasPostgresEnv()) {
    return redirectToPublic(request, "/signup");
  }

  const link = await getAgentMagicLink(token);
  if (!isAgentMagicLinkUsable(link)) {
    return redirectToPublic(request, "/signup?expired=1");
  }

  const origin = getPublicOriginFromRequest(request);
  if (!origin) return publicOriginError();

  return new NextResponse(renderConfirmationPage({ token, origin }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("token");
  if (typeof token !== "string" || !token || !hasPostgresEnv()) {
    return redirectToPublic(request, "/signup?expired=1");
  }

  const link = await consumeAgentMagicLink(token);
  if (!link) return redirectToPublic(request, "/signup?expired=1");

  await setAgentSession({ userId: link.user_id, email: link.email });
  const destination = await resolveAgentAccessDestination({
    userId: link.user_id,
    returnTo: link.return_to
  });
  return redirectToPublic(request, destination);
}

function redirectToPublic(request: Request, path: string) {
  const origin = getPublicOriginFromRequest(request);
  if (!origin) return publicOriginError();
  return NextResponse.redirect(new URL(path, origin));
}

function publicOriginError() {
  return NextResponse.json(
    { error: "NEXT_PUBLIC_APP_URL is required for reachable setup links" },
    { status: 500 }
  );
}

function renderConfirmationPage(input: { token: string; origin: string }) {
  const escapedToken = escapeHtml(input.token);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Continue</title>
    <style>
      :root { color-scheme: light; }
      body {
        min-height: 100svh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #FAFAF7;
        color: #1A1A1A;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100% - 32px, 440px);
      }
      h1 {
        margin: 0;
        font-family: Georgia, serif;
        font-size: clamp(44px, 10vw, 64px);
        line-height: 0.95;
        font-weight: 500;
      }
      p {
        margin: 18px 0 0;
        color: #8B8680;
        font-size: 16px;
        line-height: 1.65;
      }
      form {
        margin-top: 28px;
      }
      button {
        min-height: 52px;
        width: 100%;
        border: 0;
        border-radius: 18px;
        background: #C97B5C;
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      a {
        color: inherit;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Continue.</h1>
      <p>This extra click protects your sign-in link from email security previews that open links before you do.</p>
      <form method="post" action="/auth/verify">
        <input type="hidden" name="token" value="${escapedToken}" />
        <button type="submit">Continue</button>
      </form>
      <p><a href="${input.origin}/signup">Request a fresh link</a></p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
