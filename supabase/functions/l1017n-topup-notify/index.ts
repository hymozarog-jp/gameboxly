import { createClient } from "npm:@supabase/supabase-js@2.75.0";
const headers={"content-type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const answer=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
function secretKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return ""}}
const api=async(token:string,method:string,body:unknown)=>{const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({ok:false}));if(!r.ok||!j.ok)throw Error("telegram_"+method+"_failed");return j};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method==="GET")return answer({status:"deployed"});
 if(req.method!=="POST")return answer({error:"method_not_allowed"},405);
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return answer({error:"unauthorized"},401);
 const token=Deno.env.get("TG_BOT_TOKEN")||"";
 const admin=Deno.env.get("TG_ADMIN_ID")||"";
 const webhook=Deno.env.get("TG_WEBHOOK_SECRET")||"";
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=secretKey();
 if(!token||!/^[0-9]+$/.test(admin)||!webhook||!url||!key)return answer({error:"server_not_configured"},503);
 let body:{request_id?:string}={};
 try{body=await req.json()}catch{return answer({error:"invalid_json"},400)}
 const id=body.request_id||"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return answer({error:"invalid_request"},400);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.auth.getUser(bearer.slice(7));
 if(authError||!auth.user)return answer({error:"unauthorized"},401);
 const {data:r,error:readError}=await db.from("topup_requests").select("id,user_id,amount,method,phone,transfer_reference,status,created_at,telegram_notified_at").eq("id",id).maybeSingle();
 if(readError)return answer({error:"read_failed"},500);
 if(!r||r.user_id!==auth.user.id)return answer({error:"not_found"},404);
 if(r.status!=="pending")return answer({error:"already_reviewed"},409);
 // For Libyana USSD: the customer's intent is not evidence of a transfer.
 // The signed SMS receiver sends the actual review notification once it arrives,
 // with the receipt number, account name and one-time approval buttons.
 if(r.method==="libyana"&&String(r.transfer_reference||"").startsWith("ussd-intent:")){
   return answer({ok:true,payment_pending:true,notice:"sent_after_sms_receipt"});
 }
 if(Date.now()-new Date(r.created_at).getTime()>60*60*1000)return answer({error:"request_too_old"},409);
 if(r.telegram_notified_at)return answer({ok:true,already_sent:true});
 const now=new Date().toISOString();
  const {data:claim,error:claimError}=await db.from("topup_requests").update({telegram_notification_claimed_at:now}).eq("id",id).eq("status","pending").is("telegram_notified_at",null).is("telegram_notification_claimed_at",null).select("id").maybeSingle();
 if(claimError)return answer({error:"claim_failed"},500);
 if(!claim)return answer({ok:true,already_processing:true});
 try{
  const amount=Number(r.amount).toFixed(2);
  const provider=r.method==="libyana"?"ليبيانا":"المدار";
  const note="⚠️ راجع وصول التحويل الحقيقي قبل القبول. إنشاء الطلب وحده ليس إثبات دفع.";
  const msg="🔔 طلب شحن محفظة جديد\n\n💰 "+amount+" د.ل\n📱 "+provider+"\n☎️ رقم العميل: "+String(r.phone).slice(0,30)+"\n🆔 رقم الطلب: "+id+"\n\n"+note;
  await api(token,"sendMessage",{chat_id:Number(admin),text:msg,reply_markup:{inline_keyboard:[[{text:"✅ قبول",callback_data:"wt:a:"+id},{text:"❌ رفض",callback_data:"wt:r:"+id}]]}});
  const {error:markError}=await db.from("topup_requests").update({telegram_notified_at:new Date().toISOString()}).eq("id",id);
  if(markError)console.error("Topup Telegram message sent but marking delivery failed");
  return answer({ok:true,delivery_recorded:!markError});
 }catch(e){
  // Never release a claimed send automatically: a network error can happen
  // after Telegram accepted the message, and retrying would spam the admin.
  console.error("Telegram topup delivery failed:",e instanceof Error?e.message:"unknown");
  return answer({error:"telegram_delivery_failed"},502);
 }
});