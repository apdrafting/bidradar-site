const results=document.getElementById('results'),status=document.getElementById('status');let counts=null,liveItems=[];
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function render(){
 const trade=document.getElementById('trade').value;
 const query=document.getElementById('search').value.trim().toLowerCase();
 results.replaceChildren();
 if(!counts){status.textContent='Live source totals unavailable. No opportunity count can be verified at this time.';return;}
 const raw=counts.byTrade||{};const small=Object.entries(raw).filter(([k,v])=>k!=='Construction'&&Number.isInteger(v)&&v>0&&v<=2).map(([k])=>k);const count=trade?(trade==='General Construction'?(raw.Construction||0)+small.reduce((n,k)=>n+raw[k],0):raw[trade]||0):counts.total;
 const checked=new Date(counts.checkedAt),valid=Number.isFinite(checked.getTime());
 const age=valid?Date.now()-checked.getTime():Infinity;
 if(age>86400000||age< -300000){status.textContent='Source totals are stale or undated; current opportunity count cannot be verified.';return;}
 status.textContent=(liveItems.length?liveItems.length+' source-linked candidate notices':count+' source notices')+' · Last checked '+checked.toLocaleString()+'. Verify scope and deadlines with each issuing agency.';
 const tradeItems=liveItems.filter(item=>(!trade||(trade==='General Construction'?[ 'Construction',...small].some(t=>String(item.trade||item.category||'').toLowerCase().includes(t.toLowerCase())):String(item.trade||item.category||'').toLowerCase().includes(trade.toLowerCase())))&&(!query||[item.title,item.agency,item.city,item.deadline,item.source].some(v=>String(v||'').toLowerCase().includes(query))));
 for(const item of tradeItems.slice(0,250)){
   const title=String(item.title||item.name||'Untitled solicitation');
   const url=item.sourceUrl||item.url||item.link||item.noticeUrl;
   if(typeof url!=='string'||!/^https:\/\//i.test(url))continue;
   const card=el('article','','card');
   card.append(el('span','SOURCE-LINKED OPPORTUNITY','tag'),el('h2',title));
   card.append(el('p',[item.agency||item.organization,item.city,item.deadline||item.dueDate].filter(Boolean).join(' · '),'detail'));
   const a=el('a','Review original notice →');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);results.append(card);
 }
 if(results.children.length)return;
 if(query){results.append(el('p','No publicly displayed opportunities match this search. Source totals are not searchable project listings.'));return;}
 const sources=Array.isArray(counts.sources)?counts.sources:[];
 for(const source of sources.filter(s=>s.available&&Number(s.count||0)>0)){
  const card=el('article','','card');
  card.append(el('span','PROCUREMENT SOURCE','tag'),el('h2',source.name||source.label||'Procurement source'),el('p',`${Number(source.count||0)} reported source notices. Individual project details are not available in this preview; this is not a bid listing.`,'detail'));
  const url=source.url||source.sourceUrl||source.website;
  if(typeof url==='string'&&/^https:\/\//i.test(url)){const a=el('a','Visit official source →');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
  results.append(card);
 }
 if(!results.children.length)results.append(el('p','No source-level details are currently available for this filter. Try All trades.'));
}
function updateTradeOptions(){const select=document.getElementById('trade');const previous=select.value;const raw=counts?.byTrade||{};select.replaceChildren(new Option('All trades',''));const sparse=Object.entries(raw).filter(([k,v])=>k!=='Construction'&&Number.isInteger(v)&&v>0&&v<=2);for(const [name,n] of Object.entries(raw).filter(([k,v])=>k!=='Construction'&&Number.isInteger(v)&&v>2).sort((a,b)=>b[1]-a[1]))select.add(new Option(`${name} (${n})`,name));const general=(raw.Construction||0)+sparse.reduce((n,[,v])=>n+v,0);if(general)select.add(new Option(`General Construction (${general} trade matches)`, 'General Construction'));if([...select.options].some(o=>o.value===previous))select.value=previous;}
document.getElementById('trade').addEventListener('input',render);
for(const id of ['sector','kind'])document.getElementById(id).hidden=true;
document.getElementById('search').addEventListener('input',render);
async function load(){try{
 let data=null;
 try{
   const local=await fetch('./data/construction-bids.json',{cache:'no-store'});
   if(local.ok){
     const candidate=await local.json();
     if(Array.isArray(candidate.opportunities)&&candidate.opportunities.length&&Number.isFinite(new Date(candidate.checkedAt).getTime())&&Date.now()-new Date(candidate.checkedAt).getTime()<=86400000&&new Date(candidate.checkedAt).getTime()<=Date.now()+300000)data=candidate;
   }
 }catch{}
 if(!data){
   const r=await fetch('https://bidradar-api.bidradar-alerts-help.workers.dev/opportunities?summary=3',{cache:'no-store'});
   if(!r.ok)throw Error('Source request failed');
   data=await r.json();
 }
 if(!Number.isSafeInteger(data.total)||data.total<0||!data.checkedAt)throw Error('Invalid source data');
 const verifiedTime=new Date(data.checkedAt).getTime();
 if(!Number.isFinite(verifiedTime)||Date.now()-verifiedTime>86400000||verifiedTime>Date.now()+300000)throw Error('Stale or invalid source data');
 counts=data;updateTradeOptions();liveItems=Array.isArray(data.opportunities)?data.opportunities:Array.isArray(data.items)?data.items:[];render();
 }catch{counts=null;liveItems=[];render();}}
load();setInterval(load,900000);
