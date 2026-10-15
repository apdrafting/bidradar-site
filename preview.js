const results=document.getElementById('results'),status=document.getElementById('status');let counts=null;
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function render(){
 const trade=document.getElementById('trade').value;
 results.replaceChildren();
 if(!counts){status.textContent='Live source totals unavailable. No opportunity count can be verified at this time.';return;}
 const count=trade?(trade==='Unclassified'?counts.unclassified:(counts.byTrade||{})[trade]||0):counts.total;
 const checked=new Date(counts.checkedAt),valid=Number.isFinite(checked.getTime());
 const age=valid?Date.now()-checked.getTime():Infinity;
 if(age>86400000||age< -300000){status.textContent='Source totals are stale or undated; current opportunity count cannot be verified.';return;}
 status.textContent=count+' source notices'+(trade?' tagged '+trade:' across connected sources')+' · Last checked '+checked.toLocaleString()+'. These are not necessarily construction bids; trade labels may overlap.';
 const sources=Array.isArray(counts.sources)?counts.sources:[];
 for(const source of sources){
  const card=el('article','','card');
  card.append(el('span',source.available?'SOURCE RESPONDING':'SOURCE UNAVAILABLE','tag'),el('h2',source.name||source.label||'Procurement source'),el('p','Review the issuing agency’s current solicitation details, eligibility and deadline.','detail'));
  const url=source.url||source.sourceUrl||source.website;
  if(typeof url==='string'&&/^https:\/\//i.test(url)){const a=el('a','Visit official source →');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
  results.append(card);
 }
 if(!sources.length)results.append(el('p','Source details are not currently available. Please check back after the next feed refresh.'));
}
document.getElementById('trade').addEventListener('input',render);
for(const id of ['sector','kind','search'])document.getElementById(id).hidden=true;
async function load(){try{
 const r=await fetch('https://bidradar-api.bidradar-alerts-help.workers.dev/opportunities?summary=3',{cache:'no-store'});
 if(!r.ok)throw Error('Source request failed');
 const data=await r.json();
 if(!Number.isSafeInteger(data.total)||data.total<0||!data.checkedAt)throw Error('Invalid source data');
 counts=data;render();
 }catch{counts=null;render();}}
load();setInterval(load,900000);
