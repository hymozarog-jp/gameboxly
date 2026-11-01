/**
 * Message487 -> L1017n. Authenticated SMS transport, not payment attestation.
 *
 * Auto-credit only a newly matched, timely, authenticated receipt that
 * passes the preexisting restricted database RPC (verified account phone,
 * exact USSD intent, deduplication and guarded small-value limits).
 * The transport SMS is not carrier attestation; anything else stays pending.
 * Legacy SMS Forwarder/HMAC endpoint remains unchanged.
 */
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const encoder = new TextEncoder();
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
  status,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
function serviceKey():string{
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(key)return key;
  try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}").default??""}
  catch{return ""}
}
function bearerSecret():string {
  // Prefer a separate token. Compatibility fallback: the existing, server-side
  // HMAC key can be copied locally from the owner's former Android forwarder.
  return Deno.env.get("MESSAGE487_BEARER_TOKEN")||Deno.env.get("SMS_FORWARD_HMAC_KEY")||"";
}
async function sha256(data:string):Promise<Uint8Array>{
  return new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(data)));
}
async function validToken(actual:string,expected:string):Promise<boolean>{
  if(expected.length<32||actual.length<32||actual.length>4096)return false;
  const [a,b]=await Promise.all([sha256(actual),sha256(expected)]);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
async function fingerprint(secret:string,deviceId:string,eventId:string):Promise<string>{
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode("message487:v1:"+deviceId+":"+eventId)));
  return [...signed].map(n=>n.toString(16).padStart(2,"0")).join("");
}
function digits(v:string):string{
  return v.replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>=1776?1776:1632))).replace(/٫/g,".").replace(/٬/g,"");
}
function parseLibyana(text:string){
  const match=digits(text).trim().match(/^تم\s+تحويل\s+([0-9]+(?:\.[0-9]{1,3})?)\s+دينار(?:اً)?\s+من\s+الرقم\s+(0?9[0-9]{8})\s+إلى\s+رصيدك\s+بنجاح\s*[.!،]?\s*$/u);
  if(!match)return null;
  const amount=Number(match[1]);
  if(!Number.isFinite(amount)||amount<=0||amount>10000)return null;
  return {provider:"libyana" as const,amount,transfer_phone:match[2].slice(-9)};
}
function carrierSender(s:string):boolean{
  return /^(?:[a-z]{1,4}-)?libyana$/i.test(s)||s==="ليبيانا";
}
function isUUID(s:string):boolean{
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function ack(eventId:string,details:Record<string,unknown>={}){
  return respond({status:"accepted",event_id:eventId,...details});
}
async function customerLabel(db:any,requestId:string|null,provider:string,phone:string){
  let userId:string|null=null;
  if(requestId){
    const {data:requestRow}=await db.from("topup_requests")
      .select("user_id").eq("id",requestId).maybeSingle();
    userId=requestRow?.user_id??null;
  }
  if(!userId){
    const {data:link}=await db.from("sms_sender_wallet_links")
      .select("user_id").eq("provider",provider).eq("transfer_phone",phone).maybeSingle();
    userId=link?.user_id??null;
  }
  if(!userId)return "غير محدد";
  try{
    const {data,error}=await db.auth.admin.getUserById(userId);
    if(error||!data?.user)return "حساب مسجّل";
    const u=data.user;
    return String(u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split("@")[0]||"زبون")
      .replace(/[\\r\\n\\t]+/g," ").trim().slice(0,65)||"زبون";
  }catch{return "حساب مسجّل"}
}
async function notifyAdmin(db:any,reviewNumber:number,amount:number,phone:string,matched:boolean,autoCredited:boolean,reason:string,stamp:number,requestId:string|null){
  const token=Deno.env.get("TG_BOT_TOKEN")||"";
  const owner=Deno.env.get("TG_ADMIN_ID")||"";
  if(!token||!/^\\d{5,15}$/.test(owner))return;
  const customer=await customerLabel(db,requestId,"libyana",phone);
  const when=new Date(stamp).toLocaleString("ar-LY",{
    timeZone:"Africa/Tripoli",year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hour12:true
  });
  const state=autoCredited?"✅ تم الشحن تلقائيًا"
    :matched?(amount>10?"⏳ بانتظار موافقتك — أكثر من 10 د.ل":"⏳ طلب مطابق، يحتاج مراجعتك")
    :"⚠️ لا يوجد طلب شحن مطابق — لم يُضاف رصيد";
  const message="🟣 GAMEBOXLY | تحويل ليبيانا\\n"
    +"━━━━━━━━━━━━━━━━\\n"
    +"👤 الزبون: "+customer+"\\n"
    +"📱 رقم المحوّل: ***"+phone.slice(-4)+"\\n"
    +"💰 المبلغ: "+amount.toFixed(3)+" د.ل\\n"
    +"🕒 وقت الرسالة: "+when+"\\n"
    +"🧾 رقم التحويل: #"+reviewNumber+"\\n"
    +"📋 الحالة: "+state+"\\n\\n"
    +(autoCredited?"🔒 أُضيف الرصيد مرة واحدة فقط."
      :matched?"تحقّق من وصول التحويل فعليًا قبل الضغط على قبول."
      :"لا يمكن قبول رسالة غير مطابقة. راجع الحساب والطلب أولًا.")
    +(autoCredited?"":"\\nللمراجعة: /sms");
  const payload:any={chat_id:Number(owner),text:message};
  if(!autoCredited){
    const buttons=matched
      ?[{text:"✅ قبول التحويل",callback_data:"sr:a:"+reviewNumber},
         {text:"❌ رفض التحويل",callback_data:"sr:r:"+reviewNumber}]
      :[{text:"❌ رفض الرسالة",callback_data:"sr:r:"+reviewNumber}];
    payload.reply_markup={inline_keyboard:[buttons]};
  }
  try{
    const r=await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(7000)
    });
    if(!r.ok)console.error("message487_admin_notification_error",r.status);
  }catch{console.error("message487_admin_notification_unavailable")}
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
  const secret=bearerSecret();
  if(secret.length<32){console.error("message487_missing_secret");return respond({error:"receiver_not_configured"},503)}
  const authorization=req.headers.get("authorization")||"";
  const claimed=/^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(authorization);
  if(!claimed||!await validToken(claimed[1],secret))return respond({error:"unauthorized"},401);
  if(Number(req.headers.get("content-length")||0)>5500)return respond({error:"payload_too_large"},413);
  const type=req.headers.get("content-type")||"";
  if(!type.toLowerCase().startsWith("application/json"))return respond({error:"unsupported_content_type"},415);
  let raw="";
  try{raw=await req.text()}catch{return respond({error:"unreadable_body"},400)}
  if(raw.length>5500)return respond({error:"payload_too_large"},413);
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw)}catch{return respond({error:"invalid_json"},400)}
  if(!body||Array.isArray(body)||typeof body!=="object")return respond({error:"invalid_event"},400);
  const eventId=typeof body.event_id==="string"?body.event_id:"";
  if(!isUUID(eventId)||body.schema_version!==1)return respond({error:"invalid_event_id_or_schema"},400);
  const messageType=String(body.message_type||"");
  // Connection Test from Message487 proves transport only, not a transfer.
  if(messageType==="test")return ack(eventId,{stored:false,reason:"connection_test_only"});
  // Do not store OTPs or notifications; Message487 can forward both sources.
  if(messageType!=="sms"||body.source!=="android")return ack(eventId,{stored:false,reason:"not_an_sms"});
  const deviceId=String(body.device_id||"");
  const sender=String(body.sender||"").trim();
  const message=String(body.text||"");
  const occurred=String(body.occurred_at||"");
  const stamp=Date.parse(occurred);
  if(!isUUID(deviceId)||!sender||sender.length>80||!message||message.length>900||!Number.isFinite(stamp))
    return respond({error:"invalid_sms_fields"},400);
  if(!carrierSender(sender))return ack(eventId,{stored:false,reason:"unsupported_sender"});
  const receipt=parseLibyana(message);
  if(!receipt)return ack(eventId,{stored:false,reason:"unrecognized_transfer_format"});
  const now=Date.now();
  if(stamp<now-24*3600*1000||stamp>now+5*60*1000)
    return ack(eventId,{stored:false,reason:"sms_too_old_or_future"});
  const url=Deno.env.get("SUPABASE_URL")||"";
  const key=serviceKey();
  if(!url||!key)return respond({error:"database_unconfigured"},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const fp=await fingerprint(secret,deviceId,eventId);
  // Dedicated, authenticated receiver provenance. Only our restricted
  // service-role RPC can decide eligibility; the SMS itself proves no payment.
  const {data,error}=await db.from("sms_topup_receipts").insert({
    fingerprint:fp,provider:"libyana",sender_label:"message487-libyana",
    transfer_phone:receipt.transfer_phone,amount:receipt.amount,
    sms_received_at:new Date(stamp).toISOString()
  }).select("review_number").single();
  if(error?.code==="23505"){
    // A retried event uses the same fingerprint; never create another receipt.
    // If a previous execution stopped after insert, safely retry the guarded
    // auto-approval of THAT receipt, not a new credit.
    const {data:existing}=await db.from("sms_topup_receipts")
      .select("review_number").eq("fingerprint",fp).maybeSingle();
    const {error:reMatchError}=await db.rpc("sms_match_pending_receipts");
    if(reMatchError)console.error("message487_duplicate_rematch_failed",reMatchError.code);
    let autoCredited=false;
    if(existing?.review_number){
      const {data:retry,error:retryError}=await db.rpc("sms_auto_credit_receipt",{
        p_review_number:existing.review_number
      });
      if(retryError)console.error("message487_duplicate_credit_check_failed",retryError.code);
      autoCredited=!retryError&&retry?.credited===true;
    }
    return ack(eventId,{stored:false,duplicate:true,auto_credited:autoCredited});
  }
  if(error||!data){
    console.error("message487_receipt_insert_error",error?.code||"unknown");
    return respond({error:"receipt_not_saved"},503);
  }
  const {error:matchError}=await db.rpc("sms_match_pending_receipts");
  if(matchError)console.error("message487_match_error",matchError.code);
  const {data:latest}=await db.from("sms_topup_receipts")
    .select("status,request_id").eq("review_number",data.review_number).maybeSingle();
  const matched=latest?.status==="matched";
  // Only the database decides whether this verified, matched transfer may be
  // credited without manual action. Anything questionable remains pending.
  let autoCredited=false;
  let approvalReason="no_matching_request";
  if(matched&&!matchError){
    const {data:decision,error:decisionError}=await db.rpc("sms_auto_credit_receipt",{
      p_review_number:data.review_number
    });
    if(decisionError){
      console.error("message487_guarded_auto_credit_failed",decisionError.code);
      approvalReason="server_check_failed";
    }else{
      autoCredited=decision?.credited===true;
      approvalReason=String(decision?.reason||"review_required");
    }
  }else if(matchError){approvalReason="matching_failed";}
  await notifyAdmin(db,data.review_number,receipt.amount,receipt.transfer_phone,matched,autoCredited,approvalReason,stamp,latest?.request_id??null);
  return ack(eventId,{stored:true,matched,auto_credited:autoCredited,review_number:data.review_number,
    next:autoCredited?"credited":matched?"review_required":"awaiting_matching_request"});
});
