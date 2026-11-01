/**
 * L1017n Telegram administration bot.
 * Webhook security: Telegram secret header + exact private admin chat ID.
 * Secrets never belong in the public GitHub Pages site.
 *
 * Commands operate on existing public.products and protected telegram_code_stock.
 * This function does NOT fulfill customer purchases, touch wallets, or send codes.
 */
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import { handleArabicAdmin } from "./arabic-chat.ts";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } });

function serviceRoleKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return keys.default ?? "";
  } catch { return ""; }
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function telegramMessage(token: string, chatId: number, message: string): Promise<void> {
  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message.slice(0, 3900) }),
  });
  if (!response.ok) throw new Error("Telegram response " + response.status);
}

const HELP = [
  "👋 هلا بيك في مساعد إدارة متجر L1017n",
  "تقدر تكلمني بالعربي عادي؛ مش لازم تحفظ أوامر.",
  "",
  "🔐 «نبي نضيف كود» — نحدد الباقة ونحفظ الكود.",
  "📊 «كم كود عندي في ببجي؟» — نعرض المخزون.",
  "📦 «وريني الباقات» — نعرض المنتجات والأسعار.",
  "➕ «ضيف باقة جديدة» — نسألك اللعبة والاسم والكمية والسعر.",
  "💵 «غير سعر باقة ببجي» — نحدد الباقة والسعر ونطلب موافقتك.",
  "👁️ «اخفي باقة ...» أو «فعّل باقة ...».",
  "",
  "في أي وقت قول «إلغاء» أو «مساعدة».",
  "الأوامر المختصرة القديمة ما زالت تشتغل: /list /games /add /code /stock /price /rename /on /off /id.",
  "⚠️ تسليم الأكواد الفوري للباقات الرقمية فقط. روبلوكس حاليًا تنفيذ يدوي.",
  "📋 /orders — حالات طلبات الشراء اليدوية، بدون الأكواد الرقمية.",
  "📨 /sms لرسائل ليبيانا، مع أزرار قبول/رفض للتحويلات المطابقة. /smsok رقم و /smsno رقم بدائل يدوية.",
  "🤖 /smsauto status لمعرفة حالة الشحن الآلي، /smsauto off للإيقاف، /smsauto on للتفعيل.",
].join("\n");

const textPart = (text: string): string[] =>
  text.split("|").map(v => v.trim());

function validKey(value: string): boolean {
  return /^[a-zA-Z0-9_-]{3,100}$/.test(value);
}

function reportError(error: unknown): never {
  if (error && typeof error === "object" && "message" in error)
    throw new Error("تعذر تنفيذ العملية: " + String((error as { message: unknown }).message).slice(0, 110));
  throw new Error("تعذر تنفيذ العملية");
}

type Product = {
  id: string; product_key: string; name: string; game: string;
  amount: number; price: number; active: boolean;
};

Deno.serve(async (request: Request) => {
  if (request.method === "GET") return json({ status: "deployed", configured: Boolean(Deno.env.get("TG_BOT_TOKEN") && Deno.env.get("TG_WEBHOOK_SECRET")), documentation: "See repository setup guide" });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = Deno.env.get("TG_BOT_TOKEN") ?? "";
  const webhookSecret = Deno.env.get("TG_WEBHOOK_SECRET") ?? "";
  const adminId = Deno.env.get("TG_ADMIN_ID") ?? "";
  if (!token || !webhookSecret) return json({ error: "bot_not_configured" }, 503);

  const supplied = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!supplied || !sameSecret(supplied, webhookSecret))
    return json({ error: "unauthorized" }, 401);

  // Telegram update bodies are small; reject unexpected oversized payloads.
  if (Number(request.headers.get("content-length") || "0") > 10000)
    return json({ error: "payload_too_large" }, 413);

  let update: { action?: string; callback_query?: { id: string; data?: string; from?: { id?: number }; message?: { message_id?: number; text?: string; chat?: { id?: number; type?: string } } }; message?: { message_id?: number; text?: string; chat?: { id?: number; type?: string }; from?: { id?: number } } };
  try { update = await request.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  // Secure initial activation through the Supabase Dashboard "Test" tool.
  // Use the same webhook secret in the request header; the bot token stays on the server.
  if (update.action === "register_webhook") {
    const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!projectUrl.startsWith("https://")) return json({ error: "project_url_missing" }, 503);
    const url = (projectUrl.endsWith("/") ? projectUrl.slice(0, -1) : projectUrl) + "/functions/v1/l1017n-telegram-admin";
    const result = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      }),
    });
    const data = await result.json().catch(() => ({ ok: false }));
    return json({ ok: result.ok && data.ok === true, description: data.description ?? "Webhook setup response" }, result.ok && data.ok === true ? 200 : 502);
  }
  // Inline approvals operate only on authenticated Telegram webhook updates
  // from the exact authorized private admin account.
  if (update?.callback_query) {
    const cb = update.callback_query;
    const adminChat = cb.message?.chat?.id;
    const actor = cb.from?.id;
    if (!adminId || String(adminChat) !== adminId || String(actor) !== adminId ||
        cb.message?.chat?.type !== "private") return json({ ok:true });
    // Manual purchase fulfillment (Robux, MM2 and Brainrot).
    // Customer payment is already complete; only the store owner can mark
    // a manually delivered order as fulfilled. Never mark code orders here.
    const manualChoice = /^po:(done|check):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(cb.data ?? "");
    if (manualChoice) {
      const notify = async (method: string, params: unknown) => {
        const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(params)
        });
        return response.ok;
      };
      const databaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const key = serviceRoleKey();
      if (!databaseUrl || !key) {
        await notify("answerCallbackQuery",{callback_query_id:cb.id,text:"خدمة الطلبات غير جاهزة، جرّب لاحقًا",show_alert:true});
        return json({ok:true});
      }
      const db = createClient(databaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const orderId = manualChoice[2];
      let {data:order,error:readError} = await db.from("purchase_orders")
        .select("id,roblox_username,status").eq("id",orderId).maybeSingle();
      if (readError || !order || order.roblox_username === "DIGITAL_CODE") {
        await notify("answerCallbackQuery",{callback_query_id:cb.id,text:"الطلب غير موجود أو تم تسليم الكود آليًا",show_alert:true});
        return json({ok:true});
      }
      if (manualChoice[1] === "done" && order.status === "paid_pending_fulfillment") {
        // Atomic, status-guarded change: no wallet credits, refunds, codes,
        // or inventory operations. Repeated clicks cannot complete twice.
        const {data:updated,error:updateError} = await db.from("purchase_orders")
          .update({
            status:"completed",
            reviewed_at:new Date().toISOString(),
            admin_note:"تم تأكيد تنفيذ وتسليم الطلب بواسطة إدارة المتجر عبر تيليجرام"
          })
          .eq("id",orderId)
          .eq("status","paid_pending_fulfillment")
          .neq("roblox_username","DIGITAL_CODE")
          .select("id,status").maybeSingle();
        if (updateError) {
          await notify("answerCallbackQuery",{callback_query_id:cb.id,text:"تعذر تأكيد تنفيذ الطلب، حاول لاحقًا",show_alert:true});
          return json({ok:true});
        }
        if (updated) order={...order,status:"completed"};
        else {
          // Another administrator may have reviewed this same order in the website.
          const latest=await db.from("purchase_orders").select("id,status,roblox_username").eq("id",orderId).maybeSingle();
          if(latest.error||!latest.data) {
            await notify("answerCallbackQuery",{callback_query_id:cb.id,text:"تعذر قراءة حالة الطلب",show_alert:true});
            return json({ok:true});
          }
          order=latest.data;
        }
      }
      const statusLabel=order.status==="completed"?"✅ تم التنفيذ"
        :order.status==="rejected"?"❌ مرفوض وأُرجع الرصيد"
        :order.status==="refunded"?"↩️ تم إرجاع الرصيد"
        :"⏳ لم يتم التنفيذ بعد";
      if(order.status!=="paid_pending_fulfillment"&&cb.message?.message_id){
        const baseText=cb.message.text||"🛍️ طلب شراء — L1017n\\n🆔 رقم الطلب: "+orderId;
        const updatedText=/📋 الحالة:[^\n]*/.test(baseText)
          ? baseText.replace(/📋 الحالة:[^\n]*/, "📋 الحالة: "+statusLabel)
          : baseText+"\n\n📋 الحالة: "+statusLabel;
        await notify("editMessageText",{
          chat_id:adminChat,message_id:cb.message.message_id,
          text:updatedText.slice(0,3900),
          reply_markup:{inline_keyboard:[]}
        });
      }
      await notify("answerCallbackQuery",{
        callback_query_id:cb.id,
        text: statusLabel,
        show_alert:false
      });
      return json({ok:true});
    }
    // SMS receipt review buttons. A receipt is not itself proof of payment.
    // Only Telegram's authenticated private admin can authorize this path.
    const smsChoice=/^sr:([ar]):([1-9][0-9]{0,14})$/.exec(cb.data??"");
    if(smsChoice){
      const respondTelegram=async(method:string,body:unknown)=>{
        try{
          const reply=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
            method:"POST",headers:{"content-type":"application/json"},
            body:JSON.stringify(body)
          });
          if(!reply.ok)console.error("sms_receipt_telegram_error",method,reply.status);
        }catch{console.error("sms_receipt_telegram_unavailable",method)}
      };
      const receiptNo=Number(smsChoice[2]);
      if(!Number.isSafeInteger(receiptNo))return json({ok:true});
      const databaseUrl=Deno.env.get("SUPABASE_URL")||"";
      const serviceKey=serviceRoleKey();
      if(!databaseUrl||!serviceKey){
        await respondTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:"الخدمة غير جاهزة، حاول لاحقًا",show_alert:true});
        return json({ok:true});
      }
      const db=createClient(databaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:receipt,error:lookupError}=await db.from("sms_topup_receipts")
        .select("review_number,status,request_id,amount").eq("review_number",receiptNo).maybeSingle();
      if(lookupError||!receipt){
        await respondTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:"رسالة التحويل غير موجودة",show_alert:true});
        return json({ok:true});
      }
      if(receipt.status==="approved"||receipt.status==="rejected"){
        await respondTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:"تمت مراجعة هذا التحويل سابقًا؛ لا يمكن تكراره",show_alert:true});
        return json({ok:true});
      }
      const approving=smsChoice[1]==="a";
      if(approving&&(receipt.status!=="matched"||!receipt.request_id)){
        await respondTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:"لا يمكن القبول: رسالة التحويل غير مطابقة لطلب شحن",show_alert:true});
        return json({ok:true});
      }
      // The existing SQL RPC locks and validates the request, credits once,
      // and also rejects unmatched receipts without issuing any credit.
      const {error:reviewError}=await db.rpc("sms_review_topup",{
        p_review_number:receiptNo,p_decision:approving?"approved":"rejected"
      });
      if(reviewError){
        const already=/receipt_already_reviewed|topup_changed_or_mismatched/i.test(String(reviewError.message||""));
        await respondTelegram("answerCallbackQuery",{
          callback_query_id:cb.id,
          text:already?"التحويل تمت مراجعته أو تغيرت حالة الطلب":"تعذر الاعتماد؛ راجع وصول التحويل وحالة الطلب",
          show_alert:true
        });
        return json({ok:true});
      }
      const state=approving?"✅ تم التأكد من التحويل وإضافة الرصيد":"❌ تم رفض التحويل دون إضافة رصيد";
      const oldText=String(cb.message?.text||"📩 إشعار تحويل ليبيانا #"+receiptNo).slice(0,3400);
      const amended=/📋 الحالة:[^\n]*/.test(oldText)
        ?oldText.replace(/📋 الحالة:[^\n]*/,"📋 الحالة: "+state)
        :oldText+"\n\n📋 الحالة: "+state;
      await respondTelegram("editMessageText",{
        chat_id:adminChat,message_id:cb.message?.message_id,
        text:amended,reply_markup:{inline_keyboard:[]}
      });
      await respondTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:state,show_alert:false});
      return json({ok:true});
    }
    const choice = /^wt:([ar]):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(cb.data ?? "");
    if (!choice) return json({ ok:true });
    const callTelegram=async(method:string,body:unknown)=>{
      const response=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)
      });
      return response.ok;
    };
    const databaseUrl=Deno.env.get("SUPABASE_URL")||"";
    const serviceKey=serviceRoleKey();
    if(!databaseUrl||!serviceKey) return json({error:"database_not_configured"},503);
    const db=createClient(databaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const approve=choice[1]==="a";
    const {data,error}=await db.rpc("telegram_review_topup_request",{p_request_id:choice[2],p_approve:approve});
    if(error){
      const already=String(error.message||"").includes("request_already_reviewed");
      await callTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:already?"هذا الطلب تمت مراجعته سابقًا.":"تعذر تنفيذ القرار، جرّب لاحقًا.",show_alert:!already});
      return json({ok:true});
    }
    const label=approve?"✅ تمت الموافقة وإضافة الرصيد":"❌ تم رفض الطلب";
    await callTelegram("editMessageText",{chat_id:adminChat,message_id:cb.message?.message_id,text:(cb.message?.text||"طلب شحن المحفظة").slice(0,3500)+"\n\n"+label,reply_markup:{inline_keyboard:[]}});
    await callTelegram("answerCallbackQuery",{callback_query_id:cb.id,text:approve?"تم قبول الطلب":"تم رفض الطلب"});
    return json({ok:true});
  }
  const message = update?.message;
  const chatId = message?.chat?.id;
  const senderId = message?.from?.id;
  const text = message?.text?.trim() ?? "";
  if (message?.chat?.type !== "private" || !Number.isSafeInteger(chatId) ||
      !Number.isSafeInteger(senderId) || !text) return json({ ok: true });

  const command = (text.match(/^\/([a-z_]+)(?:@[a-zA-Z0-9_]+)?(?:\s|$)/i)?.[1] ?? "").toLowerCase();
  const payload = text.replace(/^\/[a-z_]+(?:@[a-zA-Z0-9_]+)?\s*/i, "").trim();
  if (command === "id") {
    await telegramMessage(token, chatId!, "رقم حسابك في تيليجرام: " + senderId);
    return json({ ok: true });
  }

  // Fail closed until the owner ID has been explicitly configured.
  if (!adminId || String(chatId) !== adminId || String(senderId) !== adminId)
    return json({ ok: true });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = serviceRoleKey();
  if (!url || !serviceKey) return json({ error: "database_not_configured" }, 503);
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    let reply = "";
    let deleteSensitiveMessage = false;
    if (command === "orders") {
      const {data:orders,error:listError}=await db.from("purchase_orders")
        .select("id,product_name,total_amount,roblox_username,status")
        .neq("roblox_username","DIGITAL_CODE")
        .order("created_at",{ascending:false}).limit(15);
      if(listError)reportError(listError);
      reply=!orders?.length?"📋 لا توجد طلبات تنفيذ يدوي حاليًا."
        :"📋 آخر الطلبات اليدوية (بدون الأكواد):\n\n"
        +orders.map(o=>
          "📦 "+String(o.product_name||"طلب").slice(0,90)
          +" — "+Number(o.total_amount).toFixed(2)+" د.ل"
          +"\n🎮 @"+String(o.roblox_username||"—").slice(0,40)
          +"\n"+(o.status==="completed"?"✅ تم التنفيذ":o.status==="paid_pending_fulfillment"?"⏳ لم يُنفذ بعد":o.status==="rejected"?"❌ رُفض وأُرجع الرصيد":"↩️ تم إرجاع الرصيد")
          +"\n🆔 "+o.id
        ).join("\n\n");
    } else if (command === "smsauto") {
      const action = payload.toLowerCase();
      if (!action || action === "status") {
        const { data: cfg, error: cfgError } = await db.from("sms_auto_credit_settings")
          .select("enabled").eq("id",1).single();
        if (cfgError) reportError(cfgError);
        reply = "🤖 الشحن الآلي: " + (cfg?.enabled ? "✅ مفعّل" : "⏸️ متوقف") +
          "\nيعتمد تحويلات ليبيانا الحديثة للحسابات المربوطة فقط (حتى 10 د.ل للتحويل)." +
          "\nللإيقاف: /smsauto off  |  للتشغيل: /smsauto on";
      } else if (action === "on" || action === "off") {
        const { error: setError } = await db.from("sms_auto_credit_settings")
          .update({enabled:action==="on",activated_at:new Date().toISOString()}).eq("id",1);
        if (setError) reportError(setError);
        reply = action === "on"
          ? "✅ فعلت الشحن الآلي للرسائل الجديدة فقط، للأرقام المرتبطة بالحسابات، مع حد 10 د.ل للتحويل."
          : "⏸️ أوقفت الشحن الآلي. تظل الرسائل تصل للمراجعة يدويًا.";
      } else reply = "الصيغة: /smsauto status أو /smsauto on أو /smsauto off";
    } else if (command === "sms") {
      const { error: matchError } = await db.rpc("sms_match_pending_receipts");
      if (matchError) reportError(matchError);
      const { data: receipts, error: listError } = await db.from("sms_topup_receipts")
        .select("review_number,status,provider,amount,transfer_phone,received_at,request_id,note")
        .in("status", ["matched","unmatched","approved"]).order("received_at", { ascending: false }).limit(15);
      if (listError) reportError(listError);
      const phones = [...new Set((receipts ?? []).map(r => String(r.transfer_phone)))];
      let linked = new Set<string>();
      if (phones.length) {
        const { data: links, error: linkError } = await db.from("sms_sender_wallet_links")
          .select("provider,transfer_phone").in("transfer_phone", phones);
        if (linkError) reportError(linkError);
        linked = new Set((links ?? []).map(l => l.provider + ":" + l.transfer_phone));
      }
      reply = !receipts?.length ? "📨 ما فيش رسائل تحويل جديدة للمراجعة." :
        "📨 رسائل التحويل (آخر 15):\n\n" + receipts.map(r => {
          const hasLink = linked.has(r.provider + ":" + r.transfer_phone);
          const state = r.status === "approved"
            ? (r.note === "AUTO_SMS_V1" ? "🤖 تم الشحن آليًا" : "✅ تم اعتماد الرصيد")
            : r.status === "matched"
              ? "✅ طلب شحن مطابق"
              : hasLink ? "✅ رقم مربوط بحساب — جاهز للشحن الآلي للرسائل الجديدة" : "⚠️ رقم غير مربوط بحساب";
          return "رقم " + r.review_number + " | " +
            (r.provider === "libyana" ? "ليبيانا" : "المدار") +
            " | " + Number(r.amount).toFixed(3) + " د.ل" +
            " | ***" + String(r.transfer_phone).slice(-4) +
            "\n" + state +
            "\n" + (r.status === "approved" ? "🔒 أُضيف الرصيد بالفعل" :
              (r.status === "matched" || hasLink ? "/smsok " + r.review_number + "    " : "") +
              "/smsno " + r.review_number +
              (!hasLink && r.status !== "matched" ? "\nلربط الرقم مرة واحدة: /smsbind " + r.review_number + " EMAIL" : ""));
        }).join("\n\n") +
        "\n\n⚠️ رسالة SMS مش إثبات من مشغّل الشبكة. ما تعتمدش إلا بعد التحقق. كل رسالة تُستخدم مرة واحدة.";
    } else if (command === "smsbind") {
      const m = payload.match(/^([0-9]{1,15})\s+([^\s]{5,254})$/);
      if (!m || !Number.isSafeInteger(Number(m[1])) || Number(m[1]) < 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m[2])) {
        reply = "الصيغة: /smsbind 1 email@example.com\nاربط الرقم بحساب الزبون بعد التأكد من ملكيته فقط. هذا الإجراء مرة واحدة.";
      } else {
        const { data: bind, error: bindError } = await db.rpc("sms_link_sender_wallet", {
          p_review_number: Number(m[1]), p_email: m[2]
        });
        if (bindError) {
          if (bindError.message?.includes("store_account_not_found"))
            reply = "🚫 ما لقيتش حسابًا بهذا البريد. خلي الزبون يسجّل في المتجر أولاً.";
          else if (bindError.message?.includes("phone_already_linked_to_other_account"))
            reply = "🚫 الرقم مربوط مسبقًا بحساب ثاني، وما غيرناش الربط.";
          else if (bindError.message?.includes("registered_account_phone_does_not_match_sender"))
            reply = "🚫 رقم المحوّل ما يطابقش رقم الهاتف المسجّل في حساب الزبون. خلّيه يسجّل بالرقم الصحيح وتحقق من ملكيته أولًا.";
          else reportError(bindError);
        } else reply = "✅ ربطت رقم المحوّل في الرسالة " + bind.review_number +
          " بحساب " + bind.account_email +
          ". من توا ما يحتاجش الزبون يقدم طلب شحن في كل مرة.\n" +
          "بعد مراجعة وصول التحويل الحقيقي، اعتمده بالأمر /smsok " + bind.review_number;
      }
    } else if (command === "smsok" || command === "smsno") {
      const number = Number(payload);
      if (!/^[0-9]{1,15}$/.test(payload) || !Number.isSafeInteger(number) || number < 1) {
        reply = "اكتب رقم الرسالة، مثلاً: /smsok 1 أو /smsno 1";
      } else {
        const { error: matchError } = await db.rpc("sms_match_pending_receipts");
        if (matchError) reportError(matchError);
        const { data: receipt, error: readError } = await db.from("sms_topup_receipts")
          .select("review_number,status,amount,provider,transfer_phone,request_id")
          .eq("review_number",number).maybeSingle();
        if (readError) reportError(readError);
        if (!receipt) reply = "ما لقيتش رسالة بهذا الرقم. استخدم /sms";
        else if (receipt.status === "approved" || receipt.status === "rejected")
          reply = "هذه الرسالة تمت مراجعتها سابقًا، وما نقدرش نعتمدها مرة ثانية.";
        else {
          const decision = command === "smsok" ? "approved" : "rejected";
          const isOldMatched = receipt.status === "matched" && !!receipt.request_id;
          let senderLinked = false;
          if (!isOldMatched && decision === "approved") {
            const { data: link, error: linkError } = await db.from("sms_sender_wallet_links")
              .select("user_id").eq("provider",receipt.provider)
              .eq("transfer_phone",receipt.transfer_phone).maybeSingle();
            if (linkError) reportError(linkError);
            senderLinked = !!link;
          }
          if (!isOldMatched && decision === "approved" && !senderLinked) {
            reply = "🚫 رقم المحوّل مش مربوط بحساب زبون. تأكد من صاحب الرقم ثم اربطه مرة واحدة:\n/smsbind " +
              number + " email@example.com\nوبعدها استخدم /smsok " + number;
          } else {
            const rpc = isOldMatched ? "sms_review_topup" : "sms_review_direct_topup";
            const { data: reviewed, error: reviewError } = await db.rpc(rpc, {
              p_review_number:number, p_decision:decision
            });
            if (reviewError) {
              if (reviewError.message?.includes("requires_manual_verification"))
                reply = "⚠️ المبلغ أو تاريخ التحويل يحتاج مراجعة خارج مسار SMS. لم يُضف رصيد.";
              else if (reviewError.message?.includes("sender_phone_not_linked"))
                reply = "🚫 رقم المحوّل مش مربوط بحساب. استخدم /smsbind أولاً.";
              else if (reviewError.message?.includes("receipt_already_reviewed"))
                reply = "الرسالة تمت مراجعتها مسبقًا، وما نقدرش نضيف رصيدًا مرتين.";
              else reportError(reviewError);
            } else reply = decision === "approved"
              ? "✅ اعتمدت التحويل رقم " + number + "، وأضفت " +
                Number(reviewed?.amount ?? receipt.amount).toFixed(3) +
                " د.ل لمحفظة الزبون " + (isOldMatched ? "حسب طلبه." : "مباشرةً، بدون طلب شحن.") +
                "\n🔒 نفس الرسالة ما تقدرش تنشحن مرتين."
              : "⛔ رفضت رسالة التحويل رقم " + number + ". ما أضفناش أي رصيد.";
          }
        }
      }
    } else if (!command) {
      const natural = await handleArabicAdmin(db, chatId!, text);
      reply = natural.reply;
      deleteSensitiveMessage = !!natural.deleteMessage;
    } else if (command === "start" || command === "help") {
      reply = HELP;
    } else if (command === "games") {
      const { data, error } = await db.from("products").select("game,active").limit(1000);
      if (error) reportError(error);
      const games = new Map<string, number>();
      for (const product of data ?? []) {
        const game = String(product.game);
        games.set(game, (games.get(game) ?? 0) + 1);
      }
      reply = games.size
        ? "🎮 الألعاب:\n" + [...games].map(([game, qty]) => game + " — " + qty + " باقة").join("\n")
        : "ما فيش ألعاب مضافة.";
    } else if (command === "list") {
      const { data, error } = await db.from("products")
        .select("product_key,name,game,price,active")
        .order("game").order("sort_order").limit(40);
      if (error) reportError(error);
      reply = (data?.length ?? 0)
        ? "📦 الباقات (أول 40):\n\n" + (data ?? []).map(p =>
            (p.active ? "✅ " : "⛔ ") + p.product_key + "\n" + p.name +
            " / " + p.game + " / " + p.price + " د.ل"
          ).join("\n\n")
        : "ما فيش باقات.";
    } else if (command === "add") {
      const args = textPart(payload);
      if (args.length !== 5) reply = "الصيغة:\n/add key | game | name | amount | price";
      else {
        const [key, game, name, amountText, priceText] = args;
        const amount = Number(amountText), price = Number(priceText);
        if (!validKey(key) || !/^[a-z0-9_-]{2,50}$/.test(game) ||
            name.length < 2 || name.length > 160 ||
            !Number.isSafeInteger(amount) || amount < 1 || amount > 100000000 ||
            !Number.isFinite(price) || price <= 0 || price > 1000000)
          reply = "تحقق من المعرف (حروف إنجليزية وأرقام وشرطة)، اللعبة، الاسم، الكمية والسعر.";
        else {
          const { error } = await db.from("products").insert({
            product_key: key, game, name, amount,
            price: Math.round(price * 100) / 100, active: false, sort_order: 1000,
          });
          if (error?.code === "23505") reply = "هذا المعرف مستخدم من قبل. اختار معرفًا ثانيًا.";
          else if (error) reportError(error);
          else reply = "✅ تمت إضافة الباقة " + key + " (مخفية).\nراجع بياناتها وبعدها استخدم /on " + key;
        }
      }
    } else if (["price", "rename", "on", "off"].includes(command)) {
      const args = textPart(payload);
      const key = command === "on" || command === "off" ? payload.trim() : args[0] ?? "";
      if (!validKey(key) || (["price", "rename"].includes(command) && args.length !== 2))
        reply = "الصيغة الصحيحة:\n/" + command + " key" + (["price", "rename"].includes(command) ? " | القيمة" : "");
      else {
        let change: Record<string, unknown> = {};
        if (command === "on" || command === "off") change = { active: command === "on" };
        if (command === "price") {
          const price = Number(args[1]);
          if (!Number.isFinite(price) || price <= 0 || price > 1000000) reply = "السعر غير صحيح.";
          else change = { price: Math.round(price * 100) / 100 };
        }
        if (command === "rename") {
          if (args[1].length < 2 || args[1].length > 160) reply = "اسم الباقة لازم بين حرفين و160 حرف.";
          else change = { name: args[1] };
        }
        if (!reply) {
          const { data, error } = await db.from("products").update(change)
            .eq("product_key", key).select("product_key").maybeSingle();
          if (error) reportError(error);
          reply = data ? "✅ تم تحديث الباقة " + key : "ما لقيتش باقة بالمعرف " + key;
          if (data && command === "on")
            reply += "\nتنبيه: فعّل الباقات الرقمية بعد إضافة أكواد للمخزون. الروبوكس ما زال تنفيذه يدويًا.";
        }
      }
    } else if (command === "code") {
      const args = textPart(payload);
      if (args.length !== 2) reply = "الصيغة:\n/code product-key | DIGITAL-CODE";
      else {
        const [key, code] = args;
        if (!validKey(key) || code.length < 3 || code.length > 300)
          reply = "معرف الباقة أو طول الكود غير صالح.";
        else {
          const { data: product, error: findError } = await db.from("products")
            .select("id,product_key").eq("product_key", key).maybeSingle();
          if (findError) reportError(findError);
          if (!product) reply = "الباقة غير موجودة. أضفها أولاً.";
          else {
            const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
            const hash = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
            const { error } = await db.from("telegram_code_stock").insert({
              product_id: product.id, code_value: code, code_sha256: hash,
            });
            if (error?.code === "23505") reply = "الكود هذا مسجّل مسبقًا لهذه الباقة؛ ما أضفناش نسخة ثانية.";
            else if (error) reportError(error);
            else reply = "✅ تم حفظ كود جديد في المخزون المحمي للباقة " + key +
              ".\nالأكواد تُسلَّم فورًا للمشتري عند شراء باقة رقمية مدعومة من المحفظة.";
          }
        }
      }
    } else if (command === "stock") {
      const key = payload.trim();
      if (!validKey(key)) reply = "الصيغة:\n/stock product-key";
      else {
        const { data: product, error: findError } = await db.from("products")
          .select("id").eq("product_key", key).maybeSingle();
        if (findError) reportError(findError);
        if (!product) reply = "الباقة غير موجودة.";
        else {
          const { count, error } = await db.from("telegram_code_stock")
            .select("id", { head: true, count: "exact" })
            .eq("product_id", product.id).eq("status", "available");
          if (error) reportError(error);
          reply = "📊 المخزون المتاح للباقة " + key + ": " + (count ?? 0) + " كود.";
        }
      }
    } else {
      reply = "الأمر غير معروف. اكتب /help لعرض الأوامر.";
    }

    // Code commands contain supplier secrets. Best-effort remove the original message
    // from the private bot conversation once handled; do not echo the secret.
    if ((command === "code" || deleteSensitiveMessage) && Number.isSafeInteger(message?.message_id)) {
      try {
        await fetch("https://api.telegram.org/bot" + token + "/deleteMessage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: message!.message_id }),
        });
      } catch { /* deletion is best-effort */ }
    }
    await telegramMessage(token, chatId!, reply);
    return json({ ok: true });
  } catch (error) {
    // Never log the Telegram message, codes, API keys, or customer data.
    console.error("L1017n Telegram bot operation failed:", error instanceof Error ? error.name : "unknown");
    try { await telegramMessage(token, chatId!, "تعذر تنفيذ العملية حاليًا. راجع إعدادات البوت أو جرّب بعد قليل."); }
    catch { /* Telegram may be unavailable */ }
    return json({ error: "operation_failed" }, 500);
  }
});
