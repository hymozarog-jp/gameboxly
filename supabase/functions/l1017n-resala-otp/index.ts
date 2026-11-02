/**
 * L1017N Resala SMS verification.
 * Requires RESALA_API_KEY in Supabase Edge Function secrets. Never expose it in HTML.
 * Logged-in customer only; phone is always read from their existing wallet account.
 */
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const SITE = "https://hymozarog-jp.github.io";
const allowedOrigins = new Set([SITE, "https://l1017n.ct.ws", "http://localhost:5173", "http://127.0.0.1:5500"]);
const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(allowedOrigins.has(origin) ? {
        "access-control-allow-origin": origin,
        "vary": "Origin",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, apikey, x-client-info, content-type",
      } : {}),
    },
  });

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return typeof keys.default === "string" ? keys.default : "";
  } catch { return ""; }
}

async function pinHmac(secret: string, userId: string, phone: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const output = await crypto.subtle.sign("HMAC", key, encoder.encode(userId + ":" + phone + ":" + pin));
  return Array.from(new Uint8Array(output), x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") {
    return allowedOrigins.has(origin)
      ? new Response(null, { status: 204, headers: {
          "access-control-allow-origin": origin, "vary": "Origin",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "authorization, apikey, x-client-info, content-type",
          "access-control-max-age": "600"
        }})
      : new Response(null, { status: 403 });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return json({ error: "request_too_large" }, 413, origin);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const role = serviceKey();
  if (!url || !role) return json({ error: "backend_unavailable" }, 503, origin);
  const db = createClient(url, role, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!bearer) return json({ error: "unauthorized" }, 401, origin);
  const { data: authData, error: authError } = await db.auth.getUser(bearer);
  const user = authData?.user;
  if (authError || !user?.id || user.is_anonymous)
    return json({ error: "unauthorized" }, 401, origin);

  let payload: { action?: string; code?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "request_too_large" }, 413, origin);
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }
  const action = payload?.action;
  if (action !== "status" && action !== "send" && action !== "verify")
    return json({ error: "invalid_action" }, 400, origin);

  const { data: wallet, error: walletError } = await db.from("wallet_accounts")
    .select("libyana_phone").eq("user_id", user.id).maybeSingle();
  if (walletError) return json({ error: "database_unavailable" }, 503, origin);
  const phone = String(wallet?.libyana_phone || "");
  const phoneReady = /^9[1-4][0-9]{7}$/.test(phone);
  if (!phoneReady && action !== "status")
    return json({ error: "phone_required" }, 400, origin);

  const apiKey = (Deno.env.get("RESALA_API_KEY") || "").trim();
  if (action === "status") {
    if (!apiKey) return json({ configured: false, verified: false }, 200, origin);
    if (!phoneReady)
      return json({ configured: true, verified: false, phone: null,
        retry_after_seconds: 0, code_pending: false, expires_in_seconds: 0 }, 200, origin);
    const { data, error } = await db.from("resala_otp_sessions")
      .select("phone,verified_phone,verified_at,last_sent_at,expires_at,pin_hash")
      .eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "database_unavailable" }, 503, origin);
    const now = Date.now();
    const samePhone = data?.phone === phone;
    const elapsed = data?.last_sent_at ? now - Date.parse(data.last_sent_at) : Infinity;
    const retrySeconds = samePhone && Number.isFinite(elapsed)
      ? Math.max(0, Math.ceil((240000 - elapsed) / 1000)) : 0;
    const expires = samePhone && data?.expires_at
      ? Math.max(0, Math.ceil((Date.parse(data.expires_at) - now) / 1000)) : 0;
    return json({ configured: true, verified: data?.verified_phone === phone && !!data?.verified_at,
      phone: "0" + phone, retry_after_seconds: retrySeconds,
      expires_in_seconds: expires,
      code_pending: !!(samePhone && data?.pin_hash && expires > 0) }, 200, origin);
  }
  if (!apiKey) return json({ error: "not_configured" }, 503, origin);

  if (action === "send") {
    const token = crypto.randomUUID();
    const { data: reserved, error: reserveError } = await db.rpc("resala_otp_reserve",
      { p_user: user.id, p_phone: phone, p_token: token });
    if (reserveError) return json({ error: "database_unavailable" }, 503, origin);
    if (reserved === "verified") return json({ verified: true }, 200, origin);
    if (reserved !== "reserved") {
      let retrySeconds = 0;
      if (reserved === "cooldown") {
        const { data: state } = await db.from("resala_otp_sessions")
          .select("last_sent_at,phone").eq("user_id", user.id).maybeSingle();
        if (state?.phone === phone && state?.last_sent_at) {
          retrySeconds = Math.max(0, Math.ceil(
            (240000 - (Date.now() - Date.parse(state.last_sent_at))) / 1000));
        }
      }
      return json({ error: reserved || "send_unavailable", retry_after_seconds: retrySeconds },
        ["cooldown", "hour_limit", "day_limit"].includes(reserved) ? 429 : 400, origin);
    }

    let result: Response;
    try {
      result = await fetch("https://dev.resala.ly/api/v1/pins?service_name=L1017N&len=6", {
        method: "POST",
        headers: { "authorization": "Bearer " + apiKey, "content-type": "application/json" },
        body: JSON.stringify({ phone: "218" + phone }),
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      return json({ error: "sms_gateway_unavailable" }, 502, origin);
    }
    if (result.status !== 201) {
      console.error("Resala PIN request failed with status", result.status);
      return json({ error: "sms_gateway_unavailable" }, 502, origin);
    }

    let code: string;
    try {
      const body = await result.json();
      code = String(body.pin);
      if (!/^\d{6}$/.test(code)) throw new Error("malformed PIN");
    } catch {
      return json({ error: "sms_gateway_unavailable" }, 502, origin);
    }
    const hash = await pinHmac(apiKey, user.id, phone, code);
    const { data: saved, error: saveError } = await db.from("resala_otp_sessions")
      .update({ pin_hash: hash, expires_at: new Date(Date.now() + 5 * 60000).toISOString() })
      .eq("user_id", user.id).eq("request_token", token).eq("phone", phone)
      .select("user_id").maybeSingle();
    if (saveError || !saved) {
      console.error("Resala OTP state persistence failed");
      return json({ error: "database_unavailable" }, 503, origin);
    }
    return json({ sent: true, expires_in_seconds: 300, retry_after_seconds: 240 }, 200, origin);
  }

  const code = String(payload.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return json({ error: "invalid_format" }, 400, origin);
  const hash = await pinHmac(apiKey, user.id, phone, code);
  const { data: verdict, error: verifyError } = await db.rpc("resala_otp_check",
    { p_user: user.id, p_phone: phone, p_hash: hash });
  if (verifyError) return json({ error: "database_unavailable" }, 503, origin);
  if (verdict === "verified") return json({ verified: true }, 200, origin);
  return json({ error: verdict || "verification_failed" },
    verdict === "locked" ? 429 : 400, origin);
});
