/* KPI Khu vực 5.5 – giao diện (GitHub Pages). Dữ liệu lấy qua API Apps Script sau khi đăng nhập. */
(function(){
/* ---------- parsing ---------- */
function csv(txt){ const out=[]; let row=[],cell='',q=false;
  for(let i=0;i<txt.length;i++){const ch=txt[i];
    if(q){ if(ch=='"'){ if(txt[i+1]=='"'){cell+='"';i++;} else q=false;} else cell+=ch; }
    else if(ch=='"') q=true; else if(ch==','){row.push(cell);cell='';} else if(ch=='\n'){row.push(cell);out.push(row);row=[];cell='';} else if(ch!='\r') cell+=ch;}
  if(cell||row.length){row.push(cell);out.push(row);} return out; }
const num = s => { if(typeof s==='number') return isFinite(s)?s:null; s=String(s==null?'':s).trim().replace(/\u2212/g,'-');
  const m=s.match(/^-?[\d.,]+%?/); if(!m) return null; let t=m[0]; const p=t.endsWith('%'); t=t.replace('%','').replace(/\./g,'').replace(',','.'); const v=parseFloat(t); return isNaN(v)?null:(p?v/100:v); };
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'D').replace(/\s+/g,' ').trim().toUpperCase();
let TB={}, REGION='', POINTS=[], META={}, DIRTY=0;
const tb=n=>TB[norm(n)];
function loadData(SRC, meta){ TB={}; META=meta||{}; DIRTY=0;
  for(const name in SRC){ const src=SRC[name]; const rows=typeof src==='string'?csv(src):(src.v||src), disp=typeof src==='string'?rows:(src.d||rows);
    rows.forEach(r=>r.forEach(c=>{ if(typeof c==='string'&&/^\s*-?[\d.,]+%?\s+[^\d\s]/.test(c)) DIRTY++; }));
    const h0=(rows[0]||[]).map(norm);
    if(h0.includes('SOURCE')&&h0.includes('KPI')&&h0.includes('PGD')){ pivot(rows,disp,h0); continue; }
    const b=rows.findIndex(r=>String(r[0]).trim()==='Miền Trung'); if(b<0) continue;
    const keep=[]; for(let i=b;i<rows.length;i++) if(String(rows[i][0]).trim()) keep.push(i);
    TB[norm(name)]={name, head:rows.slice(0,b).map(r=>r.map(c=>String(c).trim())), body:keep.map(i=>{const r=[...rows[i]]; r[0]=String(r[0]).trim(); return r;}),
      dhead:disp.slice(0,b), dbody:keep.map(i=>disp[i])}; }
  const d=tb('DPD0'); const reg=d.body.find(r=>/^\(/.test(r[0])); REGION=reg?reg[0]:d.body[2][0];
  POINTS=d.body.filter(r=>/^[A-Z]{2,5}\d/.test(r[0])).map(r=>r[0]); }
function pivot(rows, disp, h){ const ix=k=>h.indexOf(k), iS=ix('SOURCE'), iK=ix('KPI'), iP=ix('PGD'), cols=['T_1','MT','TH','PCT_HT','VS_T_1'].map(ix), iR=ix('REPORT_DATE');
  const head=['Miền','T-1','MT','TH','%HT','vs. T-1'], groups={};
  const iN=ix('NHOM'), iD=ix('DEN_NGAY');
  for(let r=1;r<rows.length;r++){ const row=rows[r]; if(!String(row[iP]||'').trim()) continue;
    const grp=String(iN>=0?row[iN]:row[iS]).trim(), src=String(row[iS]).trim(), key='KÊNH|'+grp+'|'+String(row[iK]).trim();
    if(groups[key]&&groups[key].src!==src) continue;
    const g=groups[key]||(groups[key]={src, name:(iN>=0?grp+' · '+src:'Kênh · '+grp)+' · '+String(row[iK]).trim(), head:[head], dhead:[head], body:[], dbody:[]});
    if(iD>=0&&!META.asof3) META.asof3=String((disp[r]||row)[iD]);
    g.body.push([String(row[iP]).trim(),...cols.map(c=>c<0?'':row[c])]); g.dbody.push([String(row[iP]).trim(),...cols.map(c=>c<0?'':(disp[r]||row)[c])]);
    if(iR>=0&&!META.asof2) META.asof2=String((disp[r]||row)[iR]); }
  for(const k in groups) TB[norm(k)]=groups[k]; }
function cell(tab, ent, col, nth){ const t=tb(tab); if(!t) return null; const h=t.head[t.head.length-1]; let ix=-1, c=0;
  for(let i=0;i<h.length;i++) if(h[i]===col){ if(c===(nth||0)){ix=i;break;} c++; }
  if(ix<0) return null; const r=t.body.find(r=>r[0]===ent); return r?num(r[ix]):null; }
const short = n => { if(n===REGION) return 'Toàn khu vực'; const m=n.match(/^([A-Z]+)\d+\.(\S+)\s+(.*)$/); return m?m[1]+' '+m[2]+' '+m[3]:n; };
const typeOf = n => { const m=n.match(/^([A-Z]+)\d/); return m?m[1]:'Khu vực'; };

/* ---------- KPI catalogue ---------- */
const GROUPS=['Dư nợ & chất lượng','Giải ngân & khách hàng','Doanh thu & bảo hiểm','MBBank','KHM theo kênh bán'];
const K=[
 {k:'dpd0',tab:'DPD0',label:'Dư nợ DPD0',s:'DPD0',g:0,u:'amt',vs:'diff'},
 {k:'net',tab:'TĂNG NET',label:'Tăng Net',s:'Tăng Net',g:0,u:'amt',vs:'abs'},
 {k:'rg',tab:'RÚT GỐC',label:'Rút gốc',s:'Rút gốc',g:0,u:'amt',vs:'pct',low:1},
 {k:'ngrg',tab:'NET GIẢI NGÂN - RÚT GỐC',label:'GN tổng − Rút gốc',s:'GN − RG',g:0,u:'amt',vs:'abs'},
 {k:'rfw',tab:'RFW',label:'%RFW',s:'%RFW',g:0,u:'pct2',vs:'pp',low:1},
 {k:'thu',tab:'TỶ LỆ THU DPD0',label:'Tỷ lệ thu DPD0',s:'Thu DPD0',g:0,u:'pct1',vs:'ppdiff'},
 {k:'tre',tab:'TỶ LỆ TRỄ HẠN',label:'Tỷ lệ trễ hạn',s:'Trễ hạn',g:0,u:'pct1',vs:'ppdiff',low:1},
 {k:'gnt',tab:'GIẢI NGÂN TỔNG',label:'Giải ngân tổng',s:'GN tổng',g:1,u:'amt',vs:'pct'},
 {k:'gnn',tab:'GIẢI NGÂN NET',label:'Giải ngân NET',s:'GN NET',g:1,u:'amt',vs:'pct'},
 {k:'gnkhm',tab:'GIẢI NGÂN KHM',label:'GN khách hàng mới',s:'GN KHM',g:1,u:'amt',vs:'pct'},
 {k:'gnkhql',tab:'GIẢI NGÂN NET KHQL',label:'GN NET khách quay lại',s:'GN KHQL',g:1,u:'amt',vs:'pct'},
 {k:'khm',tab:'KHM',label:'Số khách hàng mới',s:'KH mới',g:1,u:'cnt',vs:'pct'},
 {k:'khql',tab:'KHQL',label:'Số khách quay lại',s:'KH quay lại',g:1,u:'cnt',vs:'pct'},
 {k:'dt',tab:'DOANH THU',label:'Doanh thu',s:'Doanh thu',g:2,u:'amt'},
 {k:'dtv',tab:'DOANH THU VAY',label:'Doanh thu vay',s:'DT vay',g:2,u:'amt'},
 {k:'dtbh',tab:'DOANH THU BẢO HIỂM',label:'Doanh thu bảo hiểm',s:'DT BH',g:2,u:'amt'},
 {k:'bhqd',tab:'PHÍ BẢO HIỂM QUY ĐỔI',label:'Phí BH quy đổi',s:'BH quy đổi',g:2,u:'amt',vs:'pct'},
 {k:'bhbk',tab:'PHÍ BH BÁN KÈM',label:'Phí BH bán kèm',s:'BH bán kèm',g:2,u:'amt',vs:'pct'},
 {k:'bhtn',tab:'PHÍ BH TỰ NGUYỆN',label:'Phí BH tự nguyện',s:'BH tự nguyện',g:2,u:'dec1',vs:'pct'},
 {k:'bhdl',tab:'PHÍ BH ĐỘC LẬP',label:'Phí BH độc lập',s:'BH độc lập',g:2,u:'dec2',vs:'pct'},
 {k:'mbnr',tab:'NẠP RÚT MBBANK',label:'Nạp rút MBBank',s:'Nạp rút MB',g:3,u:'cnt',vs:'pct'},
 {k:'mbtk',tab:'MỞ TÀI KHOẢN MBBANK',label:'Mở tài khoản MBBank',s:'Mở TK MB',g:3,u:'cnt',vs:'pct'},
];
const CH=[['DIGITAL HO','Digital HO','var(--accent)'],['MARKETING PGD','Marketing PGD','var(--cat2)'],['CTV PGD','CTV PGD','var(--cat3)'],['PTĐT','PTĐT','var(--cat4)']];
const ctab=(ch,kpi)=>'KÊNH|'+ch+'|'+kpi;
CH.forEach(([ch,lab],i)=>{ K.push({k:'c'+i+'khm',tab:ctab(ch,'KHM'),label:'KHM · '+lab,s:'KHM '+lab,g:4,u:'cnt',vs:'pct'},
  {k:'c'+i+'form',tab:ctab(ch,'FORM'),label:'Form · '+lab,s:'Form '+lab,g:9,u:'cnt',vs:'pct'},
  {k:'c'+i+'f2s',tab:ctab(ch,'F2S'),label:'F2S · '+lab,s:'F2S '+lab,g:9,u:'pct1',vs:'pp'},
  {k:'c'+i+'gn',tab:ctab(ch,'GIẢI NGÂN'),label:'Giải ngân · '+lab,s:'GN '+lab,g:9,u:'amt',vs:'pct'}); });
const CHD=[
 {key:'HO',lab:'Digital HO',src:'Chi tiết HO',progs:[['OWNED','Owned','var(--p2)','FORM','Form','F2S'],['PAID','Paid','var(--p1)','FORM','Form','F2S']]},
 {key:'MKT',lab:'Marketing PGD',src:'Chi tiết MKT',progs:[['DIGITAL MẠNG LƯỚI','Digital mạng lưới','var(--p2)','FORM','Form','F2S','TASK'],['TRADE','Trade','var(--p3)','FORM','Form','F2S','TASK']]},
 {key:'PT',lab:'PTĐT',src:'Chi tiết PTĐT',progs:[['PTĐT LEAD','Lead','var(--p1)','FORM','Form','F2S'],['PTĐT E2E 3P','E2E 3P','var(--p2)','APPFORM','AppForm','A2S'],['PTĐT QUICK-OFFER','Quick-offer','var(--p3)','QO','QO','QO2S']]}];
let ptCh=0;
CHD.forEach((c,ci)=>c.progs.forEach(([g,lab,,inK,inL,cvK,pre],pi)=>{ const id='x'+ci+'_'+pi;
  K.push({k:id+'in',tab:ctab(g,inK),label:inL+' · '+lab,s:inL+' '+lab,g:9,u:'cnt',vs:'pct'},
   {k:id+'cv',tab:ctab(g,cvK),label:cvK+' · '+lab,s:cvK+' '+lab,g:9,u:'pct1',vs:'pp'},
   {k:id+'sale',tab:ctab(g,'SALE'),label:'Sale · '+lab,s:'Sale '+lab,g:9,u:'cnt',vs:'pct'},
   {k:id+'khm',tab:ctab(g,'KHM'),label:'KHM · '+lab,s:'KHM '+lab,g:9,u:'cnt',vs:'pct'});
  if(pre) K.push({k:id+'pre',tab:ctab(g,pre),label:'Task · '+lab,s:'Task '+lab,g:9,u:'cnt'}); }));
const ptChoices=ci=>{ const c=CHD[ci], ids=c.progs.map((p,pi)=>'x'+ci+'_'+pi); const o=[];
  ['khm','in','cv','pre'].forEach(s=>ids.forEach((id,pi)=>{ if(s!=='pre'||c.progs[pi][6]) o.push(id+s); })); return o; };
const KB=K.filter(d=>d.g<5);
const KM=Object.fromEntries(K.map(x=>[x.k,x]));
function kv(k, ent){ const d=KM[k]; const o={t1:cell(d.tab,ent,'T-1'), mt:cell(d.tab,ent,'MT'), th:cell(d.tab,ent,'TH'), ht:cell(d.tab,ent,'%HT'), vs:cell(d.tab,ent,'vs. T-1')};
  if(d.vs==='diff'||d.vs==='ppdiff') o.vs=(o.th!=null&&o.t1!=null)?o.th-o.t1:null;
  if(o.ht==null && o.mt!=null) o.ht = o.th==null?0:null;
  return o; }
const T={good:1,warn:0.9,rg:0.05,rfw:1.5};
function st(ht, k, th){ if(k==='net'&&th<0) return ['NET ÂM','solid']; if(ht==null) return ['–','na'];
  return ht>=T.good?['TỐT','good']:ht>=T.warn?['THEO DÕI','warn']:['CẢNH BÁO','crit']; }

/* ---------- formatting ---------- */
const NF=(a,b)=>new Intl.NumberFormat('vi-VN',{minimumFractionDigits:a,maximumFractionDigits:b});
const nf0=NF(0,0), nf1=NF(1,1), nf2=NF(2,2);
const fmt=v=>v==null?'–':nf0.format(Math.round(v)||0);
const sfmt=v=>v==null?'–':(Math.round(v)>0?'+':'')+fmt(v);
const pct0=v=>v==null?'–':nf0.format(v*100)+'%';
const pct1=v=>v==null?'–':nf1.format(v*100)+'%';
const pct2=v=>v==null?'–':nf2.format(v*100)+'%';
const spct=v=>v==null?'–':(v>0?'+':'')+pct0(v);
const pp=v=>v==null?'–':(v>0?'+':'')+nf1.format(v*100)+' điểm';
const fu=(u,v)=>u==='pct1'?pct1(v):u==='pct2'?pct2(v):u==='dec1'?(v==null?'–':nf1.format(v)):u==='dec2'?(v==null?'–':nf2.format(v)):fmt(v);
const fvs=(d,v)=>!d.vs||v==null?'':d.vs==='abs'||d.vs==='diff'?sfmt(v):d.vs==='pct'?spct(v):pp(v);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const col=c=>'var(--'+(c==='solid'?'crit':c==='na'?'muted':c)+')';
const $=id=>document.getElementById(id);

/* ---------- Tracking-derived (Net bridge, risk) ---------- */
function trk(ent){ const g=c=>cell('Tracking MT Vùng',ent,c)||0;
  const o={name:ent, short:short(ent), type:typeOf(ent), dk:g('DPD0 đầu kỳ'), dpd0:g('DPD0 hiện tại'), netMT:g('Net MT'), netTH:g('Net TH'), netVs1:g('Net vs. T-1'),
    gnt:g('GN TH'), rgTH:g('RG TH'), rgMT:g('RG MT'), prgVs:g('%RG vs. T-1'), prgTH:g('%RG TH'), rfwTH:g('RFW TH'), prfwTH:g('%RFW TH'), prfwMT:g('%RFW MT'), rb:g('RB TH'), gnrfw:g('GN-RFW trong tháng')};
  o.hut=o.netTH-o.netMT; o.rfwRatio=o.prfwMT?o.prfwTH/o.prfwMT:0; return o; }
let R, P;
function deriveAll(){ R=trk(REGION); P=POINTS.map(trk);
  const regMT=R.prfwMT;
  [R,...P].forEach(o=>{ const gnn=kv('gnn',o.name), rg=kv('rg',o.name);
    o.flags=[]; if(o.netTH<0) o.flags.push('NET-ÂM'); if(o.prfwTH>T.rfw*regMT) o.flags.push('RFW-CAO'); if(o.gnrfw>0) o.flags.push('GN-XẤU');
    if(o.prgVs>T.rg) o.flags.push('RG-TĂNG'); if(gnn.ht!=null&&gnn.ht<T.warn) o.flags.push('GN-NET-CHẬM');
    const c=[]; if(gnn.ht!=null&&gnn.ht<T.warn) c.push('GN NET chỉ đạt '+pct0(gnn.ht)+' MT');
    if(rg.ht!=null&&rg.ht<T.warn) c.push('rút gốc '+fmt(o.rgTH)+' vượt trần '+fmt(o.rgMT));
    if(o.prfwTH>o.prfwMT) c.push('%RFW '+pct2(o.prfwTH)+' vượt MT '+pct2(o.prfwMT));
    if(o.gnrfw>0) c.push(fmt(o.gnrfw)+' giải ngân mới đã chuyển quá hạn');
    o.cause=o.hut>=0?'Đạt MT tăng Net':(c.length?c.join('; '):'Hụt nhẹ, các chỉ số khác trong ngưỡng'); }); }

/* ---------- state ---------- */
let sel=-1;  // -1 = khu vực
const ent=()=>sel<0?REGION:POINTS[sel];
const cur=()=>sel<0?R:P[sel];
let view='tq';
const choose={dn:'dpd0', gn:'gnn', dt:'dtbh', mb:'mbtk', kn:'c0khm', pt:'x0_0khm'};
const CHOICES={dn:['dpd0','net','thu','rfw','rg','ngrg','tre'], gn:['gnn','khm','gnt','gnkhm','gnkhql','khql'], dt:['dtbh','bhqd','bhbk','bhtn','bhdl','dt','dtv'], mb:['mbnr','mbtk'], kn:['c0khm','c1khm','c2khm','c3khm','c0form','c1form','c2form','c3form','c0f2s','c1f2s','c2f2s','c3f2s']};

/* ---------- shared pieces ---------- */
function bar(p, c){ const w=Math.max(0,Math.min(p==null?0:p,1.5))/1.5*100;
  return '<div class="barbox"><div class="bar"><i style="width:'+w+'%;background:'+col(c)+'"></i><span class="mark" style="left:calc('+(100/1.5)+'% - 1px)"></span></div><span class="cap" style="left:'+(100/1.5)+'%">100% MT</span></div>'; }
function tile(k){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s); const m=[];
  if(v.mt!=null) m.push([d.low?'Trần':'MT', fu(d.u,v.mt)]); if(v.t1!=null) m.push(['T-1', fu(d.u,v.t1)]);
  if(v.vs!=null) m.push(['So T-1', fvs(d,v.vs), (d.low?v.vs>0:v.vs<0)?'neg':'pos']);
  return '<article class="tile '+c+'"><div class="htop"><span class="hl">'+d.label+(d.low?'<small>MT là trần</small>':'')+'</span>'+(v.ht!=null?'<span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+pct0(v.ht)+'</b></span>':'')+'</div>'+
    '<div class="big num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</div>'+(s[1]==='solid'?'<span class="pill crit" style="align-self:flex-start">NET ÂM</span>':'')+
    '<div class="metas">'+m.map(x=>'<div class="meta"><span>'+x[0]+'</span><b class="num '+(x[2]||'')+'">'+x[1]+'</b></div>').join('')+'</div></article>'; }
function plainTile(label, big, meta){ return '<article class="tile na"><div class="head"><span class="eyebrow">'+label+'</span></div><div class="big num">'+big+'</div>'+meta.map(x=>'<div class="meta"><span>'+x[0]+'</span><b class="num">'+x[1]+'</b></div>').join('')+'</article>'; }
function ticks(lo,hi,n){ const sp=hi-lo||1, raw=sp/n, mag=Math.pow(10,Math.floor(Math.log10(raw))), s=[1,2,2.5,5,10].map(x=>x*mag).find(x=>sp/x<=n)||raw;
  const t=[]; for(let v=Math.ceil(lo/s)*s; v<=hi+1e-9; v+=s) t.push(+v.toFixed(6)); return t; }
function wireRows(svg){ svg.querySelectorAll('.row').forEach(g=>g.addEventListener('click',()=>select(+g.dataset.i))); }

/* point bars of %HT for any KPI */
function chooser(where){ const host=document.querySelector('[data-chooser="'+where+'"]'); const k=choose[where], d=KM[k];
  host.innerHTML='<div class="ph"><h2>%HT theo PGD · '+d.label+'</h2><span class="sub">Bấm chỉ tiêu để đổi</span></div><div class="chips">'+
    CHOICES[where].map(x=>'<button class="chip" type="button" data-k="'+x+'" aria-pressed="'+(x===k)+'">'+KM[x].s+'</button>').join('')+'</div><div class="scrollx w"><svg viewBox="0 0 560 360" role="img" aria-label="%HT theo PGD"></svg></div>';
  host.querySelectorAll('button.chip').forEach(b=>b.addEventListener('click',()=>{choose[where]=b.dataset.k; chooser(where);}));
  const svg=host.querySelector('svg');
  const rows=POINTS.map((n,i)=>({i,n,v:kv(k,n)})).sort((a,b)=>(a.v.ht??-9)-(b.v.ht??-9));
  const rowH=24, Tp=8, W=1000, H=Tp+rows.length*rowH+22, L=190, Rr=190;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  const lo=Math.max(-0.5,Math.min(0,...rows.map(r=>r.v.ht??0))), hi=Math.max(1.2,Math.min(2,Math.max(...rows.map(r=>r.v.ht??0))));
  const x=v=>L+(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(W-L-Rr);
  let s='';
  ticks(lo,hi,5).forEach(t=>{s+='<line class="grid" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+Tp+'" y2="'+(H-20)+'"/><text class="t-muted" x="'+x(t)+'" y="'+(H-5)+'" text-anchor="middle" font-size="10.5">'+Math.round(t*100)+'%</text>';});
  rows.forEach((r,j)=>{ const y0=Tp+j*rowH, cy=y0+rowH/2, s2=st(r.v.ht,k,r.v.th), ht=r.v.ht??0;
    s+='<g class="row'+(r.i===sel?' sel':'')+'" data-i="'+r.i+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rowH+'" rx="4" fill="transparent"/>';
    s+='<text x="6" y="'+(cy+4)+'" font-size="12">'+esc(short(r.n))+'</text>';
    const a=x(Math.min(0,ht)), b=x(Math.max(0,ht));
    s+='<rect x="'+a+'" y="'+(cy-7)+'" width="'+Math.max(1.5,b-a)+'" height="14" rx="2" fill="'+col(s2[1])+'" fill-opacity=".85"><title>'+esc(short(r.n))+': '+fu(d.u,r.v.th)+' / MT '+fu(d.u,r.v.mt)+'</title></rect>';
    if(ht>hi) s+='<text x="'+(b+3)+'" y="'+(cy+4)+'" font-size="11" class="t-muted">›</text>';
    s+='<text class="num" x="'+(W-6)+'" y="'+(cy+4)+'" text-anchor="end" font-size="11.5"><tspan font-weight="700" fill="'+col(s2[1])+'">'+pct0(r.v.ht)+'</tspan><tspan class="t-muted" dx="8">'+fu(d.u,r.v.th)+' / '+fu(d.u,r.v.mt)+'</tspan></text></g>'; });
  s='<line stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity=".6" x1="'+x(1)+'" x2="'+x(1)+'" y1="'+Tp+'" y2="'+(H-20)+'"/><line class="axis" x1="'+x(0)+'" x2="'+x(0)+'" y1="'+Tp+'" y2="'+(H-20)+'"/>'+s;
  svg.innerHTML=s; wireRows(svg);
  { const m=mlist(svg); if(m) hbars(m, rows.map(r=>{ const s2=st(r.v.ht,k,r.v.th); return {i:r.i,name:esc(short(r.n)),right:'<b style="color:'+col(s2[1])+'">'+pct0(r.v.ht)+'</b> <span class="t-muted">'+fu(d.u,r.v.th)+' / '+fu(d.u,r.v.mt)+'</span>',segs:[{a:0,b:r.v.ht??0,c:col(s2[1])}],mark:1}; }), Math.min(0,lo), Math.min(hi,1.6)); } }

/* ---------- TỔNG QUAN ---------- */
const GPAGE=['dn','gn','dt','mb','kn'];
const PAGES={tq:'Tổng quan',hs:'Hồ sơ PGD',xh:'Xếp hạng PGD',dn:'DPD0 · NET · TLT · RFW',gn:'GN NET · KHM',kn:'Kênh bán',pt:'Chi tiết kênh',dt:'Bảo hiểm',nk:'Ai đã xem',mb:'MBBank',kt:'Kiểm tra dữ liệu',raw:'Dữ liệu gốc'};
const sc=s=>s[1]==='solid'?'crit':s[1];
const wide=()=>window.matchMedia('(min-width:1024px)').matches;
const openG=new Set([0,1]);
function ring(p,c){ const r=27, C=2*Math.PI*r, f=Math.max(0,Math.min(p??0,1));
  return '<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="'+r+'" class="rt"/><circle cx="32" cy="32" r="'+r+'" class="rv" style="stroke:'+c+';--len:'+(C*f).toFixed(1)+';--c:'+C.toFixed(1)+'" stroke-dasharray="'+(C*f).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'; }
function heroCard(k,ix){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s);
  const vsCls=v.vs==null?'':(d.low?v.vs>0:v.vs<0)?'neg':'pos';
  return '<button type="button" class="hcard '+c+(ix===0?' feat':'')+'" data-go="'+GPAGE[d.g]+'">'+
    '<span class="htop"><span class="hl">'+esc(d.label)+'<small>'+GROUPS[d.g]+'</small></span><span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+(v.ht!=null?pct0(v.ht):'–')+'</b></span></span>'+
    '<span class="hv num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</span>'+
    '<span class="hm"><span>MT <b class="num">'+fu(d.u,v.mt)+'</b></span>'+(v.vs!=null?'<span class="delta num '+vsCls+'">'+(v.vs<0?'▼ ':'▲ ')+fvs(d,v.vs)+' so T-1</span>':'')+'</span>'+
    '<span class="hstat">'+(s[1]==='solid'?s[0]:s[1]==='good'?'Đạt MT':s[1]==='warn'?'Theo dõi':s[1]==='crit'?'Cảnh báo':'')+'</span></button>'; }
const RM=window.matchMedia('(prefers-reduced-motion: reduce)');
function countUp(root){ if(RM.matches||document.hidden) return; root.querySelectorAll('[data-n]').forEach(el=>{ const to=+el.dataset.n, u=el.dataset.u; if(!el.dataset.n||!isFinite(to)) return;
  const id=(el._cu||0)+1; el._cu=id; const fin=()=>{ if(el._cu===id) el.textContent=fu(u,to); };
  const t0=performance.now(), dur=800; const step=t=>{ if(el._cu!==id) return; const k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3); el.textContent=fu(u,to*e); if(k<1) requestAnimationFrame(step); else fin(); };
  requestAnimationFrame(step); setTimeout(fin, dur+250); }); }
function tilt(root){ if(RM.matches||!window.matchMedia('(hover:hover)').matches) return;
  root.querySelectorAll('.hcard,.tile').forEach(el=>{ if(el.dataset.tilt) return; el.dataset.tilt=1; el.addEventListener('pointermove',e=>{ const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      el.style.transform='perspective(900px) rotateX('+(-y*7).toFixed(2)+'deg) rotateY('+(x*9).toFixed(2)+'deg) translateY(-3px)'; el.style.setProperty('--mx',(x+.5)*100+'%'); el.style.setProperty('--my',(y+.5)*100+'%'); });
    el.addEventListener('pointerleave',()=>{ el.style.transform=''; }); }); }
function renderOverview(){ const e=ent();
  const vals=KB.map(d=>({d,v:kv(d.k,e)})).filter(o=>o.v.ht!=null);
  const ok=vals.filter(o=>o.v.ht>=T.good).length, warn=vals.filter(o=>o.v.ht>=T.warn&&o.v.ht<T.good).length, bad=vals.length-ok-warn;
  $('ovHead').innerHTML='<div class="ovt"><span class="eyebrow">'+(sel<0?'Toàn khu vực · '+POINTS.length+' PGD':'PGD')+'</span><h2>'+esc(short(e))+' đạt <span class="num">'+ok+'/'+vals.length+'</span> chỉ tiêu</h2></div>'+
    '<div class="seg" role="img" aria-label="'+ok+' đạt, '+warn+' theo dõi, '+bad+' cảnh báo">'+(ok?'<i class="good" style="flex:'+ok+'"></i>':'')+(warn?'<i class="warn" style="flex:'+warn+'"></i>':'')+(bad?'<i class="crit" style="flex:'+bad+'"></i>':'')+'</div>'+
    '<div class="seglg"><span><i class="good"></i><b class="num">'+ok+'</b> đạt ≥ 100%</span><span><i class="warn"></i><b class="num">'+warn+'</b> theo dõi 90–100%</span><span><i class="crit"></i><b class="num">'+bad+'</b> cảnh báo &lt; 90%</span></div>';
  $('hero').innerHTML=['net','dpd0','gnn','khm','dt'].map(heroCard).join('');
  const worst=vals.filter(o=>o.v.ht<T.warn||(o.d.k==='net'&&o.v.th<0)).sort((a,b)=>a.v.ht-b.v.ht).slice(0,6);
  $('attnSub').textContent=worst.length?'Thấp nhất '+worst.length+'/'+bad+' chỉ tiêu dưới 90% MT':'';
  $('attn').innerHTML=worst.length?worst.map(o=>{ const s=st(o.v.ht,o.d.k,o.v.th);
    return '<button type="button" class="arow" data-go="'+GPAGE[o.d.g]+'"><span class="an"><b>'+esc(o.d.label)+'</b><small>'+GROUPS[o.d.g]+'</small></span><span class="av num">'+fu(o.d.u,o.v.th)+'<small>MT '+fu(o.d.u,o.v.mt)+'</small></span><span class="pill '+sc(s)+'">'+(s[1]==='solid'?s[0]:pct0(o.v.ht))+'</span></button>'; }).join(''):'<p class="sub">Không có chỉ tiêu nào dưới 90% MT.</p>';
  const pp=$('pgdPanel');
  if(!canRank()){ pp.hidden=true; } else { pp.hidden=false; const rk=ranking();
    const item=r=>{ const j=rk.indexOf(r); return '<button type="button" class="prow'+(r.i===sel?' on':'')+'" data-i="'+r.i+'"><span class="rk num">'+(j+1)+'</span><span class="pn">'+esc(short(r.n))+'</span><span class="scorebar"><i style="width:'+Math.min(100,r.score/1.5)+'%;background:'+col(st(r.score/100)[1])+'"></i></span><b class="num">'+nf0.format(r.score)+'</b></button>'; };
    if(sel<0){ $('pgdTitle').textContent='3 PGD đầu và 3 PGD cuối';
      $('pgdMini').innerHTML='<div class="plist">'+rk.slice(0,3).map(item).join('')+'<div class="pgap" aria-hidden="true">· · ·</div>'+rk.slice(-3).map(item).join('')+'</div><p class="foot">Điểm = %HT bình quân có trọng số của '+KB.length+' chỉ tiêu, 100 = vừa đủ MT. Bấm một PGD để mở hồ sơ.</p>';
    } else { const pos=rk.findIndex(r=>r.i===sel); $('pgdTitle').textContent='Vị trí trong khu vực';
      $('pgdMini').innerHTML='<div class="rankbig"><span class="num">'+(pos+1)+'</span><small>/ '+rk.length+' PGD · điểm '+nf0.format(rk[pos].score)+'</small></div><div class="plist">'+rk.slice(Math.max(0,pos-1),pos+2).map(item).join('')+'</div><button type="button" class="btn" data-go="hs">Mở hồ sơ PGD</button>'; } }
  const big=wide();
  $('board').innerHTML=GROUPS.map((g,gi)=>{ const ks=K.filter(d=>d.g===gi), sv=ks.map(d=>({d,v:kv(d.k,e)})), ht=sv.filter(o=>o.v.ht!=null);
    const c3=[ht.filter(o=>o.v.ht>=T.good).length, ht.filter(o=>o.v.ht>=T.warn&&o.v.ht<T.good).length, ht.filter(o=>o.v.ht<T.warn).length];
    return '<details class="kgrp" data-g="'+gi+'"'+(openG.has(gi)?' open':'')+'><summary><span class="gname">'+g+'</span><span class="gcnt">'+(c3[0]?'<span class="dot good"></span>'+c3[0]:'')+(c3[1]?'<span class="dot warn"></span>'+c3[1]:'')+(c3[2]?'<span class="dot crit"></span>'+c3[2]:'')+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>'+
    sv.map(({d,v})=>{ const s=st(v.ht,d.k,v.th), w=Math.max(0,Math.min(v.ht??0,1.5))/1.5*100;
      return '<div class="krow"><div class="nm">'+d.label+(d.low?'<small>MT là trần</small>':'')+'</div><div class="v num">'+fu(d.u,v.th)+'<small>MT '+fu(d.u,v.mt)+'</small></div>'+
      '<div class="mini"><i style="width:'+w+'%;background:'+col(s[1])+'"></i><b style="left:'+(100/1.5)+'%"></b></div><div><span class="pill '+sc(s)+'">'+(v.ht!=null?pct0(v.ht):'–')+'</span></div><div class="vs num">'+fvs(d,v.vs)+'</div></div>'; }).join('')+'</details>'; }).join('');
  $('board').querySelectorAll('details').forEach(el=>el.addEventListener('toggle',()=>{ const g=+el.dataset.g; el.open?openG.add(g):openG.delete(g); }));
  wireGo($('v-tq'));
  $('v-tq').querySelectorAll('.prow').forEach(el=>el.addEventListener('click',()=>{ sel=+el.dataset.i; $('pick').value=String(sel); show('hs'); }));
}
function wireGo(root){ root.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.go))); }
function renderHeat(){ const e=ent();
  const groupsHead='<tr><th></th>'+GROUPS.map((g,gi)=>'<th class="grp" colspan="'+K.filter(d=>d.g===gi).length+'">'+g+'</th>').join('')+'</tr>';
  const kHead='<tr><th>PGD</th>'+KB.map((d,i)=>'<th class="k'+(i&&KB[i-1].g!==d.g?' gl':'')+'">'+d.s+'</th>').join('')+'</tr>';
  const rowH=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+
    KB.map((d,j)=>{const v=kv(d.k,n), s=st(v.ht,d.k,v.th); return '<td class="h '+sc(s)+(j&&KB[j-1].g!==d.g?' gl':'')+'" title="'+esc(d.label)+': '+fu(d.u,v.th)+' / MT '+fu(d.u,v.mt)+'">'+pct0(v.ht)+'</td>';}).join('')+'</tr>';
  $('heatTitle').textContent='Bản đồ %HT · '+POINTS.length+' PGD × '+KB.length+' chỉ tiêu';
  $('heat').innerHTML='<thead>'+groupsHead+kHead+'</thead><tbody>'+rowH(REGION,-1)+POINTS.map((n,i)=>rowH(n,i)).join('')+'</tbody>';
  $('heat').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i)));
}

/* ---------- DƯ NỢ ---------- */
function renderDN(){
  $('dnTiles').innerHTML=['dpd0','net','thu','rfw','rg','tre'].map(tile).join('');
  // waterfall
  const c=cur(); const steps=[['GN tổng',c.gnt],['RG',-c.rgTH],['RFW',-c.rfwTH],['RB',c.rb],['GN-RFW',-c.gnrfw]];
  let acc=0; const bars=steps.map(([l,v])=>{const a=acc; acc+=v; return {l,v,a,b:acc};}); bars.push({l:'Tăng Net',v:acc,a:0,b:acc,total:1});
  const W=560,H=300,L=58,Rr=12,Tp=26,B=40; const vs=bars.flatMap(b=>[b.a,b.b]); let lo=Math.min(0,...vs), hi=Math.max(0,...vs); const pd=(hi-lo)*.06; hi+=pd; if(lo<0) lo-=pd;
  const y=v=>Tp+(hi-v)/(hi-lo)*(H-Tp-B), bw=(W-L-Rr)/bars.length, x=i=>L+i*bw; let s='';
  ticks(lo,hi,5).forEach(t=>{s+='<line class="grid" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text class="t-muted" x="'+(L-8)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="11">'+fmt(t)+'</text>';});
  s+='<line class="axis" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
  bars.forEach((b,i)=>{ const top=y(Math.max(b.a,b.b)), h=Math.max(1.5,Math.abs(y(b.a)-y(b.b))), fill=b.total?'var(--accent)':(b.v>=0?'var(--good)':'var(--crit)'), bx=x(i)+bw*.18, w=bw*.64;
    s+='<rect fill="'+fill+'" x="'+bx+'" y="'+top+'" width="'+w+'" height="'+h+'" rx="3"><title>'+b.l+': '+sfmt(b.v)+'</title></rect>';
    if(i<bars.length-1) s+='<line class="grid" stroke-dasharray="3 3" x1="'+(bx+w)+'" x2="'+(x(i+1)+bw*.18)+'" y1="'+y(b.b)+'" y2="'+y(b.b)+'"/>';
    s+='<text class="num" x="'+(bx+w/2)+'" y="'+(b.v>=0?top-6:top+h+14)+'" text-anchor="middle" font-size="12" font-weight="600">'+(b.total?fmt(b.v):sfmt(b.v))+'</text>';
    s+='<text class="t-muted" x="'+(bx+w/2)+'" y="'+(H-14)+'" text-anchor="middle" font-size="12">'+b.l+'</text>'; });
  $('wf').innerHTML=s; { const m=mlist($('wf')); if(m) hbars(m, bars.map(b=>({name:b.l,right:'<b class="'+(b.total?'':b.v>=0?'pos':'neg')+'">'+(b.total?fmt(b.v):sfmt(b.v))+'</b>',segs:[{a:b.a,b:b.b,c:b.total?'var(--accent)':(b.v>=0?'var(--good)':'var(--crit)')}]})), lo, hi); } $('wfTitle').textContent='Cầu nối Net · '+c.short;
  // net by point
  { const rows=P.map((p,i)=>({p,i})).sort((a,b)=>a.p.hut-b.p.hut); const rowH=27,Tp=10,W=560,H=Tp+rows.length*rowH+24,L=172,Rr=78; const svg=$('byPoint');
    svg.setAttribute('viewBox','0 0 '+W+' '+H); const vv=rows.flatMap(o=>[o.p.netTH,o.p.netMT,0]); let lo=Math.min(...vv),hi=Math.max(...vv); const pd=(hi-lo)*.04; lo-=pd; hi+=pd;
    const x=v=>L+(v-lo)/(hi-lo)*(W-L-Rr); let s='';
    ticks(lo,hi,4).forEach(t=>{s+='<line class="grid" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+Tp+'" y2="'+(H-22)+'"/><text class="t-muted" x="'+x(t)+'" y="'+(H-6)+'" text-anchor="middle" font-size="10.5">'+fmt(t)+'</text>';});
    rows.forEach((o,k)=>{ const p=o.p, y0=Tp+k*rowH, cy=y0+rowH/2, c2=p.netTH<0?'crit':st(p.netMT?p.netTH/p.netMT:0)[1];
      s+='<g class="row'+(o.i===sel?' sel':'')+'" data-i="'+o.i+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rowH+'" rx="4" fill="transparent"/><text x="6" y="'+(cy+4)+'" font-size="12">'+esc(p.short)+'</text>';
      const a=x(Math.min(0,p.netTH)), b=x(Math.max(0,p.netTH));
      s+='<rect x="'+a+'" y="'+(cy-7)+'" width="'+Math.max(1.5,b-a)+'" height="14" rx="2" fill="'+col(c2)+'"><title>'+esc(p.short)+': '+fmt(p.netTH)+' / MT '+fmt(p.netMT)+'</title></rect>';
      s+='<text class="num" x="'+(p.netTH<0?a-4:b+4)+'" y="'+(cy+4)+'" text-anchor="'+(p.netTH<0?'end':'start')+'" font-size="10.5" font-weight="600" fill="'+col(c2)+'">'+fmt(p.netTH)+'</text>';
      s+='<line x1="'+x(p.netMT)+'" x2="'+x(p.netMT)+'" y1="'+(cy-10)+'" y2="'+(cy+10)+'" stroke="var(--ink)" stroke-width="2"/>';
      s+='<text class="num" x="'+(W-6)+'" y="'+(cy+4)+'" text-anchor="end" font-size="12" font-weight="600" fill="'+(p.hut<0?'var(--crit)':'var(--good)')+'">'+sfmt(p.hut)+'</text></g>'; });
    s+='<line class="axis" x1="'+x(0)+'" x2="'+x(0)+'" y1="'+Tp+'" y2="'+(H-22)+'"/>'; svg.innerHTML=s; wireRows(svg);
    { const m=mlist(svg); if(m) hbars(m, rows.map(o=>{ const p=o.p, c2=p.netTH<0?'crit':st(p.netMT?p.netTH/p.netMT:0)[1]; return {i:o.i,name:esc(p.short),right:'<b style="color:'+col(c2)+'">'+fmt(p.netTH)+'</b> <span class="t-muted">/ MT '+fmt(p.netMT)+'</span> · <b class="'+(p.hut<0?'neg':'pos')+'">'+sfmt(p.hut)+'</b>',segs:[{a:0,b:p.netTH,c:col(c2)}],mark:p.netMT}; }), lo, hi); } }
  // matrix
  { const W=560,H=440,L=48,Rr=16,Tp=16,B=40; $('mx').setAttribute('viewBox','0 0 560 440'); const xs=P.map(p=>p.prgVs); let xlo=Math.min(-0.04,...xs), xhi=Math.max(T.rg+0.04,...xs); const xp=(xhi-xlo)*.06; xlo-=xp; xhi+=xp; const CAP=2.5;
    const x=v=>L+(v-xlo)/(xhi-xlo)*(W-L-Rr), y=v=>Tp+(CAP-Math.min(v,CAP))/CAP*(H-Tp-B); let s='';
    s+='<rect x="'+x(T.rg)+'" y="'+Tp+'" width="'+(W-Rr-x(T.rg))+'" height="'+(y(1)-Tp)+'" fill="var(--crit-soft)"/><rect x="'+L+'" y="'+Tp+'" width="'+(x(T.rg)-L)+'" height="'+(y(1)-Tp)+'" fill="var(--warn-soft)" opacity=".7"/><rect x="'+x(T.rg)+'" y="'+y(1)+'" width="'+(W-Rr-x(T.rg))+'" height="'+(H-B-y(1))+'" fill="var(--warn-soft)" opacity=".45"/>';
    [0,.5,1,1.5,2,2.5].forEach(t=>{s+='<text class="t-muted" x="'+(L-6)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="10.5">'+(t===CAP?'≥':'')+String(t).replace('.',',')+'×</text>';});
    ticks(xlo,xhi,6).forEach(t=>{s+='<text class="t-muted" x="'+x(t)+'" y="'+(H-B+16)+'" text-anchor="middle" font-size="10.5">'+(t>0?'+':'')+Math.round(t*100)+'đ</text>';});
    s+='<line class="axis" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+(H-B)+'" y2="'+(H-B)+'"/><line class="axis" x1="'+L+'" x2="'+L+'" y1="'+Tp+'" y2="'+(H-B)+'"/><line stroke="var(--muted)" stroke-dasharray="4 3" x1="'+x(T.rg)+'" x2="'+x(T.rg)+'" y1="'+Tp+'" y2="'+(H-B)+'"/><line stroke="var(--muted)" stroke-dasharray="4 3" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(1)+'" y2="'+y(1)+'"/>';
    const q=(a,b,an,t)=>'<text class="t-muted" x="'+a+'" y="'+b+'" text-anchor="'+an+'" font-size="11" font-weight="600" letter-spacing=".04em">'+t+'</text>';
    s+=q(W-Rr-6,Tp+14,'end','ƯU TIÊN 1')+q(L+6,Tp+14,'start','CHẤT LƯỢNG NỢ')+q(W-Rr-6,H-B-8,'end','GIỮ CHÂN KHÁCH')+q(L+6,H-B-8,'start','ỔN');
    s+='<text class="t-muted" x="'+((L+W-Rr)/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11">%RG thay đổi so T-1 (điểm %) · vạch đứt = +'+Math.round(T.rg*100)+' điểm</text>';
    const maxD=Math.max(...P.map(p=>p.dpd0)), placed=[{x:W-Rr-110,y:H-B-12,w:110},{x:L,y:H-B-12,w:30},{x:W-Rr-80,y:Tp+10,w:80},{x:L,y:Tp+10,w:110}];
    P.map((p,i)=>({p,i})).sort((a,b)=>y(a.p.rfwRatio)-y(b.p.rfwRatio)).forEach(({p,i})=>{ const cx=x(p.prgVs), cy=y(p.rfwRatio), r=4+Math.sqrt(p.dpd0/maxD)*6;
      const hot=p.rfwRatio>1&&p.prgVs>T.rg?'crit':(p.rfwRatio>1||p.prgVs>T.rg)?'warn':'good';
      const lbl=p.short+(p.rfwRatio>CAP?' ('+nf1.format(p.rfwRatio)+'×)':''), lw=lbl.length*6.4; let right=cx<W-150, ly=cy, found=false;
      for(const off of [0,13,-13,26,-26,39,-39,52,-52]){ for(const side of (right?[true,false]:[false,true])){ const lx=side?cx+r+4:cx-r-4-lw, t=cy+off;
        if(lx<L+2||lx+lw>W-Rr||t>H-B-4||t<Tp+8) continue;
        if(!placed.some(b=>Math.abs(b.y-t)<12&&lx<b.x+b.w&&lx+lw>b.x)){ly=t;right=side;found=true;break;} } if(found) break; }
      placed.push({x:right?cx+r+4:cx-r-4-lw,y:ly,w:lw}); placed.push({x:cx-r,y:cy,w:2*r});
      s+='<g class="row'+(i===sel?' sel':'')+'" data-i="'+i+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+(r+(i===sel?3:0))+'" fill="'+col(hot)+'" fill-opacity=".85" stroke="'+(i===sel?'var(--ink)':'var(--surface)')+'" stroke-width="'+(i===sel?2:1.5)+'"><title>'+esc(p.short)+': %RG '+pp(p.prgVs)+', %RFW '+pct2(p.prfwTH)+'</title></circle>'+
        (ly!==cy?'<line x1="'+(right?cx+r:cx-r)+'" y1="'+cy+'" x2="'+(right?cx+r+4:cx-r-4)+'" y2="'+ly+'" stroke="var(--muted)"/>':'')+
        '<text x="'+(right?cx+r+4:cx-r-4)+'" y="'+(ly+4)+'" text-anchor="'+(right?'start':'end')+'" font-size="11">'+esc(lbl)+'</text></g>'; });
    $('mx').innerHTML=s; wireRows($('mx')); }
  // actions
  const list=P.map((p,i)=>({p,i})).filter(o=>o.p.hut<0||o.p.flags.length).sort((a,b)=>a.p.hut-b.p.hut);
  $('actSub').textContent=list.length+' / '+P.length+' PGD';
  $('actions').innerHTML=list.map(({p,i})=>'<div class="act'+(i===sel?' sel':'')+'" data-i="'+i+'" tabindex="0" role="button"><div><span class="nm">'+esc(p.short)+'</span></div><div class="gap num '+(p.hut<0?'neg':'')+'">'+sfmt(p.hut)+'</div><div class="why">'+
    (p.flags.length?'<span class="chips" style="display:inline-flex;margin-right:6px">'+p.flags.map(f=>'<span class="chip '+(f==='NET-ÂM'||f==='RFW-CAO'?'crit':'warn')+'">'+f+'</span>').join('')+'</span>':'')+esc(p.cause)+'</div></div>').join('');
  $('actions').querySelectorAll('.act').forEach(el=>{el.addEventListener('click',()=>select(+el.dataset.i)); el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+el.dataset.i);}});});
  chooser('dn');
}

/* ---------- GIẢI NGÂN ---------- */
function renderGN(){
  const e=ent(); const g=(t,c)=>cell(t,e,c);
  $('gnTiles').innerHTML=['gnn','khm','gnt','gnkhm','gnkhql','khql'].map(tile).join('')+
    plainTile('Giấy nhận nợ mở mới', fmt(g('GIẤY NHẬN NỢ MỞ MỚI','TH')), [['T-1',fmt(g('GIẤY NHẬN NỢ MỞ MỚI','T-1'))],['vs. T-1',spct(g('GIẤY NHẬN NỢ MỞ MỚI','vs. T-1'))],['2W · 4W',fmt(g('GIẤY NHẬN NỢ MỞ MỚI','TH 2W'))+' · '+fmt(g('GIẤY NHẬN NỢ MỞ MỚI','TH 4W'))]]);
  // stacked KHM + KHQL
  { const rows=POINTS.map((n,i)=>({i,n,khm:cell('GIẢI NGÂN KHM',n,'TH')||0,khql:cell('GIẢI NGÂN NET KHQL',n,'TH')||0,mt:cell('GIẢI NGÂN NET',n,'MT')||0,ht:cell('GIẢI NGÂN NET',n,'%HT')||0})).sort((a,b)=>a.ht-b.ht);
    const rowH=30,Tp=8,W=1100,H=Tp+rows.length*rowH+22,L=190,Rr=170, svg=$('gnStack'); svg.setAttribute('viewBox','0 0 '+W+' '+H);
    const hi=Math.max(...rows.map(r=>Math.max(r.khm+r.khql,r.mt)))*1.04, x=v=>L+v/hi*(W-L-Rr); let s='';
    ticks(0,hi,4).forEach(t=>{s+='<line class="grid" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+Tp+'" y2="'+(H-20)+'"/><text class="t-muted" x="'+x(t)+'" y="'+(H-5)+'" text-anchor="middle" font-size="11">'+fmt(t)+'</text>';});
    const seg=(x0,x1,cy,v,fill,ink)=>'<rect x="'+x0+'" y="'+(cy-9)+'" width="'+Math.max(0,x1-x0)+'" height="18" fill="'+fill+'"><title>'+fmt(v)+'</title></rect>'+
      (x1-x0>34?'<text class="num" x="'+((x0+x1)/2)+'" y="'+(cy+4)+'" text-anchor="middle" font-size="11" font-weight="600" fill="'+ink+'">'+fmt(v)+'</text>':'');
    rows.forEach((r,j)=>{ const y0=Tp+j*rowH, cy=y0+rowH/2, sc=st(r.ht)[1], tot=r.khm+r.khql;
      s+='<g class="row'+(r.i===sel?' sel':'')+'" data-i="'+r.i+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rowH+'" rx="4" fill="transparent"/><text x="6" y="'+(cy+4)+'" font-size="12.5">'+esc(short(r.n))+'</text>'+
        seg(x(0),x(r.khm),cy,r.khm,'var(--accent)','var(--surface)')+seg(x(r.khm),x(tot),cy,r.khql,'var(--cat2)','#1d1406')+
        '<line x1="'+x(r.mt)+'" x2="'+x(r.mt)+'" y1="'+(cy-12)+'" y2="'+(cy+12)+'" stroke="var(--ink)" stroke-width="2"><title>MT '+fmt(r.mt)+'</title></line>'+
        '<text class="num" x="'+(W-6)+'" y="'+(cy+4)+'" text-anchor="end" font-size="12"><tspan font-weight="700">'+fmt(tot)+'</tspan><tspan class="t-muted"> / '+fmt(r.mt)+'</tspan><tspan dx="8" font-weight="700" fill="'+col(sc)+'">'+pct0(r.ht)+'</tspan></text></g>'; });
    svg.innerHTML=s; wireRows(svg);
    { const m=mlist(svg); if(m) hbars(m, rows.map(r=>({i:r.i,name:esc(short(r.n)),right:'<b>'+fmt(r.khm+r.khql)+'</b><span class="t-muted"> / '+fmt(r.mt)+'</span> <b style="color:'+col(st(r.ht)[1])+'">'+pct0(r.ht)+'</b>',segs:[{a:0,b:r.khm,c:'var(--accent)',lab:fmt(r.khm),t:'GN KHM'},{a:r.khm,b:r.khm+r.khql,c:'var(--cat2)',lab:fmt(r.khql),t:'GN NET KHQL'}],mark:r.mt})), 0, hi); } }
  // topup by channel for selected
  { const t='GIẢI NGÂN NET TOPUP', rowsT=tb(t); const r=rowsT.body.find(x=>x[0]===e);
    const groups=[['Ô tô · My F88',1],['Ô tô · Tại quầy',5],['Xe máy · My F88',9],['Xe máy · Tại quầy',13]];
    const data=groups.map(([l,ix])=>({l,v:[num(r[ix])||0,num(r[ix+1])||0,num(r[ix+2])||0],ch:num(r[ix+3])}));
    const W=1100,H=300,L=60,Rr=10,Tp=24,B=44, hi=Math.max(1,...data.flatMap(d=>d.v))*1.12, y=v=>Tp+(hi-v)/hi*(H-Tp-B), gw=(W-L-Rr)/data.length, bw=gw*0.22; let s='';
    ticks(0,hi,4).forEach(v=>{s+='<line class="grid" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="t-muted" x="'+(L-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5">'+fmt(v)+'</text>';});
    const fills=['var(--line)','var(--muted)','var(--accent)'];
    data.forEach((d,i)=>{ const gx=L+i*gw+gw*0.14; d.v.forEach((v,j)=>{ s+='<rect x="'+(gx+j*bw*1.1)+'" y="'+y(v)+'" width="'+bw+'" height="'+(y(0)-y(v))+'" rx="2" fill="'+fills[j]+'"><title>'+d.l+' '+['T-2','T-1','T'][j]+': '+fmt(v)+'</title></rect>'; });
      d.v.forEach((v,j)=>{ s+='<text class="num'+(j<2?' t-muted':'')+'" x="'+(gx+j*bw*1.1+bw/2)+'" y="'+(y(v)-6)+'" text-anchor="middle" font-size="'+(j<2?11:12)+'" font-weight="'+(j<2?500:700)+'">'+fmt(v)+'</text>'; });
      s+='<text class="t-muted" x="'+(L+i*gw+gw/2)+'" y="'+(H-26)+'" text-anchor="middle" font-size="11.5">'+d.l+'</text>';
      s+='<text x="'+(L+i*gw+gw/2)+'" y="'+(H-10)+'" text-anchor="middle" font-size="11" font-weight="600" fill="'+(d.ch==null?'var(--muted)':d.ch>=0?'var(--good)':'var(--crit)')+'">'+(d.ch==null?'mới phát sinh':'vs T-1 '+spct(d.ch))+'</text>'; });
    s+='<line class="axis" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
    $('topup').innerHTML=s; { const m=mlist($('topup')); if(m) hbars(m, data.map(d=>({name:d.l,right:'<span class="t-muted">T-2 '+fmt(d.v[0])+' · T-1 '+fmt(d.v[1])+' ·</span> <b>T '+fmt(d.v[2])+'</b> <span class="'+(d.ch==null?'t-muted':d.ch>=0?'pos':'neg')+'">'+(d.ch==null?'mới':spct(d.ch))+'</span>',lines:d.v.map((v,j)=>[{a:0,b:v,c:fills[j]}])})), 0, hi); } $('tuTitle').textContent='GN NET Topup theo kênh · '+short(e)+' · tổng T '+fmt(num(r[19])); }
  chooser('gn');
  // KH table
  { const cols=[['GIẢI NGÂN KHM','TH','GN KHM'],['GIẢI NGÂN KHM','%HT','%HT'],['GIẢI NGÂN NET KHQL','TH','GN KHQL'],['GIẢI NGÂN NET KHQL','%HT','%HT'],['KHM','TH','Số KH mới'],['KHM','%HT','%HT'],['KHQL','TH','Số KHQL'],['KHQL','%HT','%HT'],['GIẤY NHẬN NỢ MỞ MỚI','TH','Giấy nhận nợ'],['GIẤY NHẬN NỢ MỞ MỚI','vs. T-1','vs. T-1'],['GIẢI NGÂN NET','TH 2W','GN NET 2W'],['GIẢI NGÂN NET','TH 4W','GN NET 4W']];
    const head='<thead><tr><th>PGD</th>'+cols.map((c,i)=>'<th class="'+(i%2===0&&i<10?'gl':'')+'">'+c[2]+'</th>').join('')+'</tr></thead>';
    const row=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+cols.map((c,j)=>{ const v=cell(c[0],n,c[1]); const isP=c[1]==='%HT'; const cls=isP?st(v)[1]:'';
      return '<td class="num'+(j%2===0&&j<10?' gl':'')+'">'+(isP?'<span class="pill '+cls+'">'+pct0(v)+'</span>':c[1]==='vs. T-1'?'<span class="'+(v<0?'neg':'pos')+'">'+spct(v)+'</span>':fmt(v))+'</td>'; }).join('')+'</tr>';
    $('khTbl').innerHTML=head+'<tbody>'+row(REGION,-1)+POINTS.map(row).join('')+'</tbody>'; $('khTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i))); }
  // vay lại
  { const t=tb('GIẢI NGÂN VAY LẠI'); const blocks=[['Ô tô',1],['Xe máy',5],['Tổng',9]];
    const head='<thead><tr><th></th>'+blocks.map(b=>'<th class="grp" colspan="4">'+b[0]+'</th>').join('')+'</tr><tr><th>PGD</th>'+blocks.map(()=>'<th class="gl">T-2</th><th>T-1</th><th>T</th><th>vs T-1</th>').join('')+'</tr></thead>';
    const row=(n,i)=>{ const r=t.body.find(x=>x[0]===n); return '<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+blocks.map(b=>{ const v=[0,1,2,3].map(k=>num(r[b[1]+k]));
      return '<td class="num gl">'+fmt(v[0])+'</td><td class="num">'+fmt(v[1])+'</td><td class="num"><b>'+fmt(v[2])+'</b></td><td class="num '+(v[3]==null?'':v[3]<0?'neg':'pos')+'">'+(v[3]==null?(r[b[1]+3]?'mới':'–'):spct(v[3]))+'</td>'; }).join('')+'</tr>'; };
    $('vlTbl').innerHTML=head+'<tbody>'+row(REGION,-1)+POINTS.map(row).join('')+'</tbody>'; $('vlTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i))); }
}

/* ---------- KÊNH BÁN ---------- */
function stackKN(svgId, kpi, withMT){ const svg=$(svgId);
  const rows=POINTS.map((n,i)=>{ const v=CH.map(c=>cell(ctab(c[0],kpi),n,'TH')||0), mt=CH.reduce((s,c)=>s+(cell(ctab(c[0],kpi),n,'MT')||0),0), t1=CH.reduce((s,c)=>s+(cell(ctab(c[0],kpi),n,'T-1')||0),0);
    const tot=v.reduce((s,x)=>s+x,0); return {i,n,v,tot,mt,t1,ht:mt?tot/mt:null}; }).sort((a,b)=>withMT?(a.ht-b.ht):(b.tot-a.tot));
  const rowH=30,Tp=8,W=1100,H=Tp+rows.length*rowH+22,L=190,Rr=180; svg.setAttribute('viewBox','0 0 '+W+' '+H);
  const hi=Math.max(1,...rows.map(r=>Math.max(r.tot,r.mt)))*1.04, x=v=>L+v/hi*(W-L-Rr); let s='';
  ticks(0,hi,5).forEach(t=>{s+='<line class="grid" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+Tp+'" y2="'+(H-20)+'"/><text class="t-muted" x="'+x(t)+'" y="'+(H-5)+'" text-anchor="middle" font-size="11">'+fmt(t)+'</text>';});
  rows.forEach((r,j)=>{ const y0=Tp+j*rowH, cy=y0+rowH/2; let acc=0;
    s+='<g class="row'+(r.i===sel?' sel':'')+'" data-i="'+r.i+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rowH+'" rx="4" fill="transparent"/><text x="6" y="'+(cy+4)+'" font-size="12.5">'+esc(short(r.n))+'</text>';
    r.v.forEach((v,k)=>{ const x0=x(acc), x1=x(acc+v); acc+=v; if(v<=0) return;
      s+='<rect x="'+x0+'" y="'+(cy-9)+'" width="'+(x1-x0)+'" height="18" fill="'+CH[k][2]+'"><title>'+CH[k][1]+': '+fmt(v)+'</title></rect>';
      if(x1-x0>30) s+='<text class="num" x="'+((x0+x1)/2)+'" y="'+(cy+4)+'" text-anchor="middle" font-size="11" font-weight="600" fill="#fff">'+fmt(v)+'</text>'; });
    if(withMT&&r.mt) s+='<line x1="'+x(r.mt)+'" x2="'+x(r.mt)+'" y1="'+(cy-12)+'" y2="'+(cy+12)+'" stroke="var(--ink)" stroke-width="2"><title>MT '+fmt(r.mt)+'</title></line>';
    const right=withMT?'<tspan font-weight="700">'+fmt(r.tot)+'</tspan><tspan class="t-muted"> / '+fmt(r.mt)+'</tspan><tspan dx="8" font-weight="700" fill="'+col(st(r.ht)[1])+'">'+pct0(r.ht)+'</tspan>'
      :'<tspan font-weight="700">'+fmt(r.tot)+'</tspan><tspan dx="8" fill="'+(r.tot>=r.t1?'var(--good)':'var(--crit)')+'">'+(r.t1?spct(r.tot/r.t1-1):'')+'</tspan>';
    s+='<text class="num" x="'+(W-6)+'" y="'+(cy+4)+'" text-anchor="end" font-size="12">'+right+'</text></g>'; });
  svg.innerHTML=s; wireRows(svg);
  { const m=mlist(svg); if(m) hbars(m, rows.map(r=>{ let acc=0; return {i:r.i,name:esc(short(r.n)),right:withMT?'<b>'+fmt(r.tot)+'</b><span class="t-muted"> / '+fmt(r.mt)+'</span> <b style="color:'+col(st(r.ht)[1])+'">'+pct0(r.ht)+'</b>':'<b>'+fmt(r.tot)+'</b> <span class="'+(r.tot>=r.t1?'pos':'neg')+'">'+(r.t1?spct(r.tot/r.t1-1):'')+'</span>',segs:r.v.map((v,k)=>{ const g={a:acc,b:acc+v,c:CH[k][2],lab:fmt(v),t:CH[k][1]}; acc+=v; return g; }).filter(g=>g.b>g.a),mark:withMT?r.mt:null}; }), 0, hi); } }
function renderFunnel(){ const e=ent(), W=1100, gap=18, n=CH.length+1, cw=(W-gap*(n-1))/n, bh=86; let s='';
  const box=(x,y,label,big,meta,ht,colr)=>{ const sc=ht==null?'na':st(ht)[1], bw=cw-28, w=Math.max(0,Math.min(ht??0,1.5))/1.5*bw;
    return '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+bh+'" rx="8" fill="var(--soft)"/><rect x="'+x+'" y="'+y+'" width="4" height="'+bh+'" rx="2" fill="'+colr+'"/>'+
      '<text x="'+(x+14)+'" y="'+(y+18)+'" font-size="10.5" font-weight="600" letter-spacing=".06em" class="t-muted">'+label+'</text>'+
      (ht!=null?'<text class="num" x="'+(x+cw-12)+'" y="'+(y+18)+'" text-anchor="end" font-size="13" font-weight="700" fill="'+col(sc)+'">'+pct0(ht)+'</text>':'')+
      '<text class="num" x="'+(x+14)+'" y="'+(y+40)+'" font-size="21" font-weight="700">'+big+'</text>'+
      '<text class="num t-muted" x="'+(x+14)+'" y="'+(y+58)+'" font-size="10.5">'+meta+'</text>'+
      (ht!=null?'<rect x="'+(x+14)+'" y="'+(y+68)+'" width="'+bw+'" height="6" rx="3" fill="var(--line)"/><rect x="'+(x+14)+'" y="'+(y+68)+'" width="'+w+'" height="6" rx="3" fill="'+col(sc)+'"/><rect x="'+(x+14+bw/1.5-1)+'" y="'+(y+64)+'" width="2" height="14" fill="var(--ink)" opacity=".5"/>':''); };
  const arrow=(x,y,txt,sub,colr)=>'<line x1="'+(x+24)+'" x2="'+(x+24)+'" y1="'+y+'" y2="'+(y+34)+'" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#fn-arrow)"/>'+
      '<text class="num" x="'+(x+38)+'" y="'+(y+15)+'" font-size="12.5" font-weight="700" fill="'+colr+'">'+txt+'</text><text class="num t-muted" x="'+(x+38)+'" y="'+(y+29)+'" font-size="10.5">'+sub+'</text>';
  s+='<defs><marker id="fn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>';
  const get=(ch,k,c)=>cell(ctab(ch,k),e,c), sum=(k,c)=>CH.reduce((t,ch)=>t+(get(ch[0],k,c)||0),0);
  const cols=CH.map(([ch,lab,colr])=>{ const g=(k,c)=>get(ch,k,c); const o={lab,colr,fT:g('FORM','TH'),fM:g('FORM','MT'),fH:g('FORM','%HT'),fV:g('FORM','vs. T-1'),kT:g('KHM','TH'),kM:g('KHM','MT'),kH:g('KHM','%HT'),kV:g('KHM','vs. T-1'),gT:g('GIẢI NGÂN','TH'),gV:g('GIẢI NGÂN','vs. T-1'),f1:g('FORM','T-1'),k1:g('KHM','T-1'),g1:g('GIẢI NGÂN','T-1'),f2:g('F2S','TH'),f2m:g('F2S','MT'),f2h:g('F2S','%HT')};
    if(o.f2==null&&o.fT) o.f2=(o.kT||0)/o.fT; if(o.f2m==null&&o.fM) o.f2m=(o.kM||0)/o.fM; return o; });
  const T={lab:'Tổng 4 kênh',colr:'var(--ink)',fT:sum('FORM','TH'),fM:sum('FORM','MT'),kT:sum('KHM','TH'),kM:sum('KHM','MT'),gT:sum('GIẢI NGÂN','TH')}, f1=sum('FORM','T-1'), k1=sum('KHM','T-1'), g1=sum('GIẢI NGÂN','T-1');
  T.f1=f1; T.k1=k1; T.g1=g1; T.fH=T.fM?T.fT/T.fM:null; T.kH=T.kM?T.kT/T.kM:null; T.fV=f1?T.fT/f1-1:null; T.kV=k1?T.kT/k1-1:null; T.gV=g1?T.gT/g1-1:null;
  T.f2=T.fT?T.kT/T.fT:null; T.f2m=T.fM?T.kM/T.fM:null; T.f2h=T.f2&&T.f2m?T.f2/T.f2m:null; cols.push(T);
  cols.forEach((o,i)=>{ const x=i*(cw+gap), share=T.kT?(o.kT||0)/T.kT:null, last=i===cols.length-1;
    if(last) s+='<line x1="'+(x-gap/2)+'" x2="'+(x-gap/2)+'" y1="4" y2="'+(36+3*bh+70)+'" stroke="var(--line)"/>';
    s+='<circle cx="'+(x+7)+'" cy="16" r="6" fill="'+o.colr+'"/><text x="'+(x+20)+'" y="21" font-size="14" font-weight="700">'+o.lab+'</text>';
    s+=box(x,36,'FORM',fmt(o.fT),'MT '+fmt(o.fM)+' · T-1 '+fmt(o.f1)+' · '+spct(o.fV),o.fH,o.colr);
    s+=arrow(x,36+bh+4,'F2S '+pct1(o.f2),'MT '+pct1(o.f2m)+(o.f2h!=null?' · đạt '+pct0(o.f2h):''),col(o.f2h==null?'na':st(o.f2h)[1]));
    s+=box(x,36+bh+44,'KHM'+(last?'':' · '+pct0(share)),fmt(o.kT),'MT '+fmt(o.kM)+' · T-1 '+fmt(o.k1)+' · '+spct(o.kV),o.kH,o.colr);
    s+=arrow(x,36+2*bh+48,'GN / KHM '+(o.kT?fmt(o.gT/o.kT):'–'),'giải ngân bình quân','var(--muted)');
    s+='<rect x="'+x+'" y="'+(36+2*bh+88)+'" width="'+cw+'" height="'+(bh-14)+'" rx="8" fill="var(--soft)"/><rect x="'+x+'" y="'+(36+2*bh+88)+'" width="4" height="'+(bh-14)+'" rx="2" fill="'+o.colr+'"/>'+
      '<text x="'+(x+14)+'" y="'+(36+2*bh+106)+'" font-size="10.5" font-weight="600" letter-spacing=".06em" class="t-muted">GIẢI NGÂN</text>'+
      '<text class="num" x="'+(x+14)+'" y="'+(36+2*bh+132)+'" font-size="21" font-weight="700">'+fmt(o.gT)+'</text>'+
      '<text class="num t-muted" x="'+(x+cw-12)+'" y="'+(36+2*bh+118)+'" text-anchor="end" font-size="10.5">T-1 '+fmt(o.g1)+'</text>'+
      '<text class="num" x="'+(x+cw-12)+'" y="'+(36+2*bh+134)+'" text-anchor="end" font-size="11.5" font-weight="700" fill="'+(o.gV==null?'var(--muted)':o.gV>=0?'var(--good)':'var(--crit)')+'">'+spct(o.gV)+'</text>'; });
  const svg=$('funnel'); svg.setAttribute('viewBox','0 0 '+W+' '+(36+3*bh+80)); svg.innerHTML=s;
  { const m=mlist(svg); if(m) funnelCards(m, cols.map((o,i)=>({lab:o.lab,colr:o.colr,tag:i<cols.length-1&&T.kT?'chiếm '+pct0((o.kT||0)/T.kT)+' KHM':'',cells:[{l:'Form',T:o.fT,M:o.fM,H:o.fH,V:o.fV},{l:'KHM',T:o.kT,M:o.kM,H:o.kH,V:o.kV},{l:'Giải ngân',T:o.gT,M:null,H:null,V:o.gV,sub:'T-1 '+fmt(o.g1)}],conv:['F2S <b>'+pct1(o.f2)+'</b> <span class="t-muted">MT '+pct1(o.f2m)+'</span>','GN / KHM <b>'+(o.kT?fmt(o.gT/o.kT):'–')+'</b>']}))); }
  $('fnTitle').textContent='Phễu chuyển đổi theo kênh · '+short(e); }
function renderKN(){ renderFunnel(); const e=ent();
  metricTable('knMetric', CH.map(c=>({lab:c[1],colr:c[2],tab:k=>ctab(c[0],k)})), [{k:'KHM',lab:'KHM',u:'cnt'},{k:'FORM',lab:'Form',u:'cnt'},{k:'F2S',lab:'F2S',u:'pct1',rate:true},{k:'GIẢI NGÂN',lab:'Giải ngân',u:'amt'}]);
  const leg=CH.map(c=>'<span><i style="background:'+c[2]+'"></i>'+c[1]+'</span>').join('');
  $('knLeg1').innerHTML=leg+'<span><i style="background:var(--ink);width:2px;height:12px"></i>MT KHM (tổng 4 kênh)</span>'; $('knLeg2').innerHTML=leg;
  stackKN('knKhm','KHM',true); stackKN('knGn','GIẢI NGÂN',false); chooser('kn'); }

/* ---------- bảng chỉ số theo PGD (TH · MT · %HT · T-1 · vs T-1) ---------- */
const mtState={};
function metricTable(id, groups, metrics){ const host=$(id); const mk=mtState[id]&&metrics.some(m=>m.k===mtState[id])?mtState[id]:metrics[0].k; mtState[id]=mk; const M=metrics.find(m=>m.k===mk);
  const fmtV=(u,v)=>u==='pct1'?pct1(v):fmt(v), fVs=v=>v==null?'–':M.rate?pp(v):spct(v);
  const pill=v=>v==null?'<span class="t-muted">–</span>':'<span class="pill '+st(v)[1]+'">'+pct0(v)+'</span>';
  const gs=groups.concat(M.rate?[]:[{lab:'Tổng',colr:'var(--ink)',total:true}]);
  const val=(gr,n,c)=>gr.total?groups.reduce((t,x)=>t+(cell(x.tab(mk),n,c)||0),0):cell(gr.tab(mk),n,c);
  const head='<thead><tr><th></th>'+gs.map(gr=>'<th class="grp" colspan="5"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+gr.colr+';margin-right:6px"></i>'+esc(gr.lab)+'</th>').join('')+'</tr><tr><th>PGD</th>'+
    gs.map(()=>'<th class="gl">TH</th><th>MT</th><th>%HT</th><th>T-1</th><th>vs T-1</th>').join('')+'</tr></thead>';
  const row=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+gs.map(gr=>{ const th=val(gr,n,'TH'), mt=val(gr,n,'MT'), t1=val(gr,n,'T-1');
      const ht=gr.total?(mt?th/mt:null):val(gr,n,'%HT'), vs=gr.total?(t1?th/t1-1:null):val(gr,n,'vs. T-1');
      return '<td class="num gl"><b>'+fmtV(M.u,th)+'</b></td><td class="num">'+fmtV(M.u,mt)+'</td><td class="num">'+pill(ht)+'</td><td class="num">'+fmtV(M.u,t1)+'</td><td class="num '+(vs==null?'':vs<0?'neg':'pos')+'">'+fVs(vs)+'</td>'; }).join('')+'</tr>';
  host.innerHTML='<div class="chips" style="margin-bottom:10px">'+metrics.map(m=>'<button class="chip" type="button" data-k="'+m.k+'" aria-pressed="'+(m.k===mk)+'">'+m.lab+'</button>').join('')+'</div>'+
    '<div class="tablebox"><table>'+head+'<tbody>'+row(REGION,-1)+POINTS.map(row).join('')+'</tbody></table></div>';
  host.querySelectorAll('button.chip').forEach(b=>b.addEventListener('click',()=>{ mtState[id]=b.dataset.k; metricTable(id,groups,metrics); }));
  host.querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i))); }

/* ---------- PTĐT ---------- */
function drawFunnel(svg, cols){ const W=1100, gap=18, n=cols.length, cw=(W-gap*(n-1))/n, bh=86, ah=40; let s='<defs><marker id="pt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>', maxY=0;
  cols.forEach((c,i)=>{ const x=i*(cw+gap); let y=36;
    if(c.sep) s+='<line x1="'+(x-gap/2)+'" x2="'+(x-gap/2)+'" y1="4" y2="'+(36+3*bh+2*ah+10)+'" stroke="var(--line)"/>';
    s+='<circle cx="'+(x+7)+'" cy="16" r="6" fill="'+c.colr+'"/><text x="'+(x+20)+'" y="21" font-size="14" font-weight="700">'+esc(c.lab)+'</text>';
    c.stages.forEach(t=>{
      if(t.type==='space'){ y+=t.h; return; }
      if(t.type==='arrow'){ s+='<line x1="'+(x+24)+'" x2="'+(x+24)+'" y1="'+(y+3)+'" y2="'+(y+ah-3)+'" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pt-arrow)"/>'+
        '<text class="num" x="'+(x+38)+'" y="'+(y+17)+'" font-size="12.5" font-weight="700" fill="'+t.colr+'">'+t.txt+'</text><text class="num t-muted" x="'+(x+38)+'" y="'+(y+31)+'" font-size="10.5">'+t.sub+'</text>'; y+=ah; return; }
      const ht=t.H, sc=ht==null?'na':st(ht)[1], bw=cw-28, w=Math.max(0,Math.min(ht??0,1.5))/1.5*bw;
      s+='<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+bh+'" rx="8" fill="var(--soft)"/><rect x="'+x+'" y="'+y+'" width="4" height="'+bh+'" rx="2" fill="'+c.colr+'"/>'+
        '<text x="'+(x+14)+'" y="'+(y+18)+'" font-size="10.5" font-weight="600" letter-spacing=".06em" class="t-muted">'+t.label+'</text>'+
        (ht!=null?'<text class="num" x="'+(x+cw-12)+'" y="'+(y+18)+'" text-anchor="end" font-size="13" font-weight="700" fill="'+col(sc)+'">'+pct0(ht)+'</text>':'')+
        '<text class="num" x="'+(x+14)+'" y="'+(y+40)+'" font-size="21" font-weight="700">'+fmt(t.T)+'</text>'+
        '<text class="num t-muted" x="'+(x+14)+'" y="'+(y+58)+'" font-size="10.5">MT '+fmt(t.M)+' · T-1 '+fmt(t.T1)+(t.V!=null?' · '+spct(t.V):'')+'</text>'+
        (ht!=null?'<rect x="'+(x+14)+'" y="'+(y+68)+'" width="'+bw+'" height="6" rx="3" fill="var(--line)"/><rect x="'+(x+14)+'" y="'+(y+68)+'" width="'+w+'" height="6" rx="3" fill="'+col(sc)+'"/><rect x="'+(x+14+bw/1.5-1)+'" y="'+(y+64)+'" width="2" height="14" fill="var(--ink)" opacity=".5"/>':'');
      y+=bh; });
    maxY=Math.max(maxY,y); });
  svg.setAttribute('viewBox','0 0 '+W+' '+(maxY+10)); svg.innerHTML=s;
  { const m=mlist(svg); if(m) funnelCards(m, cols.map(c=>({lab:c.lab,colr:c.colr,cells:c.stages.filter(t=>t.type==='box').map(t=>({l:t.label,T:t.T,M:t.M,H:t.H,V:t.V})),conv:c.stages.filter(t=>t.type==='arrow').map(t=>t.txt+' <span class="t-muted">'+t.sub+'</span>')}))); } }
function renderPT(){ const e=ent(), C=CHD[ptCh], PGS=C.progs, hasPre=PGS.some(p=>p[6]); const g=(grp,k,c)=>cell(ctab(grp,k),e,c);
  $('ptPick').innerHTML=CHD.map((c,i)=>'<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===ptCh)+'">'+c.lab+' · '+c.progs.length+' chương trình</button>').join('');
  $('ptPick').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ ptCh=+b.dataset.i; choose.pt=ptChoices(ptCh)[0]; renderPT(); }));
  const box=(grp,k,label)=>({type:'box',label,T:g(grp,k,'TH'),M:g(grp,k,'MT'),H:g(grp,k,'%HT'),V:g(grp,k,'vs. T-1'),T1:g(grp,k,'T-1')});
  const cols=PGS.map(([grp,lab,colr,inK,inL,cvK,pre])=>{ const cv=g(grp,cvK,'TH'), cvm=g(grp,cvK,'MT'), cvh=g(grp,cvK,'%HT'), sT=g(grp,'SALE','TH'), kT=g(grp,'KHM','TH'), iT=g(grp,inK,'TH'), pT=pre?g(grp,pre,'TH'):null;
    const st0=pre?[box(grp,pre,pre),{type:'arrow',txt:inL+' / '+pre+' '+(pT?pct0((iT||0)/pT):'–'),sub:'số Form so với Task',colr:'var(--muted)'}]:[];
    return {lab,colr,stages:st0.concat([box(grp,inK,inL.toUpperCase()),{type:'arrow',txt:cvK+' '+pct1(cv),sub:'MT '+pct1(cvm)+(cvh!=null?' · đạt '+pct0(cvh):''),colr:col(cvh==null?'na':st(cvh)[1])},
      box(grp,'KHM','KHM')])}; });
  const sum=(k,c)=>PGS.reduce((t,p)=>t+(g(p[0],k,c)||0),0);
  const kT=sum('KHM','TH'), kM=sum('KHM','MT'), k1=sum('KHM','T-1'), sameIn=PGS.every(p=>p[3]==='FORM');
  const fT=sameIn?sum('FORM','TH'):0, fM=sameIn?sum('FORM','MT'):0, f1=sameIn?sum('FORM','T-1'):0;
  cols.push({lab:'Tổng '+C.lab,colr:'var(--ink)',sep:true,stages:[{type:'space',h:(86+40)*(hasPre?1:0)}].concat(sameIn?[
    {type:'box',label:'FORM',T:fT,M:fM,T1:f1,H:fM?fT/fM:null,V:f1?fT/f1-1:null},{type:'arrow',txt:'KHM / Form '+(fT?pct1(kT/fT):'–'),sub:'MT '+(fM?pct1(kM/fM):'–'),colr:'var(--muted)'}]:[{type:'space',h:86+40}]).concat([
    {type:'box',label:'KHM',T:kT,M:kM,T1:k1,H:kM?kT/kM:null,V:k1?kT/k1-1:null}])});
  drawFunnel($('ptFunnel'),cols); $('ptTitle').textContent='Phễu '+C.lab+' ('+C.src+') · '+short(e);
  const same=PGS.every(p=>p[3]==='FORM'&&p[5]==='F2S');
  const mets=[{k:'KHM',lab:'KHM',u:'cnt'},{k:'IN',lab:same?'Form':'Đầu vào ('+PGS.map(p=>p[4]).join(' / ')+')',u:'cnt'},{k:'CV',lab:same?'F2S':'Tỷ lệ ('+PGS.map(p=>p[5]).join(' / ')+')',u:'pct1',rate:true}];
  if(hasPre) mets.push({k:'PRE',lab:'Task',u:'cnt'});
  metricTable('ptMetric', PGS.map(p=>({lab:p[1],colr:p[2],tab:k=>ctab(p[0],k==='IN'?p[3]:k==='CV'?p[5]:k==='PRE'?p[6]:k)})), mets);
  $('ptMetricTitle').textContent='Theo PGD · '+C.lab;
  CHOICES.pt=ptChoices(ptCh); if(!CHOICES.pt.includes(choose.pt)) choose.pt=CHOICES.pt[0]; chooser('pt'); }

/* ---------- DOANH THU ---------- */
function renderDT(){
  $('dtTiles').innerHTML=['dtbh','bhqd','bhbk','bhtn','bhdl','dt','dtv'].map(tile).join('');
  chooser('dt');
  const t='TỶ LỆ TICK BH BÁN KÈM', cols=[['%Tick 2W T-1','%Tick 2W TH','2W'],['%Tick 4W T-1','%Tick 4W TH','4W'],['%Tick Topup T-1','%Tick Topup TH','Topup']];
  const head='<thead><tr><th></th>'+cols.map(c=>'<th class="grp" colspan="2">'+c[2]+'</th>').join('')+'</tr><tr><th>PGD</th>'+cols.map(()=>'<th class="gl">T-1</th><th>TH</th>').join('')+'</tr></thead>';
  const row=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+cols.map(c=>{ const a=cell(t,n,c[0]), b=cell(t,n,c[1]);
    return '<td class="num gl">'+pct1(a)+'</td><td class="num"><span class="pill '+(b==null?'na':b>=0.98?'good':b>=0.95?'warn':'crit')+'">'+pct1(b)+'</span></td>'; }).join('')+'</tr>';
  $('tickTbl').innerHTML=head+'<tbody>'+row(REGION,-1)+POINTS.map(row).join('')+'</tbody>'; $('tickTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i)));
}

/* ---------- MBBANK ---------- */
function renderMB(){
  const e=ent(), t='TỶ LỆ KH VAY MỞ TÀI KHOẢN';
  $('mbTiles').innerHTML=['mbnr','mbtk'].map(tile).join('')+
    plainTile('Tỷ lệ KH vay mở TK', pct1(cell(t,e,'TH')), [['T-1',pct1(cell(t,e,'T-1'))],['vs. T-1',pp(cell(t,e,'vs. T-1'))]])+
    plainTile('%KH mới mở TK', pct1(cell(t,e,'%KHM mở TK TH')), [['T-1',pct1(cell(t,e,'%KHM mở TK T-1'))],['vs. T-1',pp(cell(t,e,'%KHM mở TK vs. T-1'))]]);
  chooser('mb');
  const cols=[['NẠP RÚT MBBANK','TH','Nạp rút'],['NẠP RÚT MBBANK','MT','MT'],['NẠP RÚT MBBANK','%HT','%HT'],['MỞ TÀI KHOẢN MBBANK','TH','Mở TK'],['MỞ TÀI KHOẢN MBBANK','MT','MT'],['MỞ TÀI KHOẢN MBBANK','%HT','%HT'],[t,'TH','% KH vay mở TK'],[t,'vs. T-1','vs. T-1'],[t,'%KHM mở TK TH','% KH mới mở TK'],[t,'%KHM mở TK vs. T-1','vs. T-1']];
  const head='<thead><tr><th>PGD</th>'+cols.map((c,i)=>'<th class="'+([0,3,6].includes(i)?'gl':'')+'">'+c[2]+'</th>').join('')+'</tr></thead>';
  const row=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+cols.map((c,j)=>{ const v=cell(c[0],n,c[1]); const g=[0,3,6].includes(j)?' gl':'';
    if(c[1]==='%HT') return '<td class="num'+g+'"><span class="pill '+st(v??0)[1]+'">'+pct0(v??0)+'</span></td>';
    if(c[0]===t) return '<td class="num'+g+(String(c[1]).includes('vs')?(v<0?' neg':' pos'):'')+'">'+(String(c[1]).includes('vs')?pp(v):pct1(v))+'</td>';
    return '<td class="num'+g+'">'+fmt(v)+'</td>'; }).join('')+'</tr>';
  $('mbTbl').innerHTML=head+'<tbody>'+row(REGION,-1)+POINTS.map(row).join('')+'</tbody>'; $('mbTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i)));
}

/* ---------- RAW ---------- */
function renderRaw(){ const t=TB[$('rawPick').value]||Object.values(TB)[0];
  const head='<thead>'+t.dhead.map(r=>'<tr>'+r.map((c,i)=>'<th>'+esc(c)+'</th>').join('')+'</tr>').join('')+'</thead>';
  $('rawTbl').innerHTML=head+'<tbody>'+t.dbody.map(r=>'<tr class="'+(String(r[0]).trim()===REGION?'reg':'')+'">'+r.map((c,i)=>'<td class="num">'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  $('rawFoot').textContent=t.body.length+' dòng · '+(t.head[t.head.length-1].length)+' cột · Nguồn: '+(META.report||'Google Sheet')+', ngày dữ liệu '+(META.asof||'–')+'.'; }


/* ---------- người dùng, lịch sử, xếp hạng ---------- */
let USER=null, HIST=[], booted=false;
const SHIELD='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
function setUser(u){ USER=u||null; if(!u) return;
  const lab={admin:'Admin',khuvuc:'Khu vực',pgd:'PGD '+(u.pgd||'')}[u.role]||u.role;
  const scope={admin:'Xem toàn khu vực · quản lý tài khoản · chốt tháng',khuvuc:'Xem toàn khu vực, tất cả PGD',pgd:'Chỉ xem số liệu PGD '+(u.pgd||'')+' và dòng tổng khu vực'}[u.role]||'';
  const b=$('permBadge'); if(b){ b.innerHTML=SHIELD+'<span>Phân quyền · <b>'+esc(lab)+'</b></span>'; b.title=scope; b.dataset.role=u.role; }
  document.body.dataset.role=u.role;
  const n=$('permNote'); if(n){ n.hidden=u.role!=='pgd'; n.innerHTML=SHIELD+'<p>Bạn đang xem số liệu của <b>PGD '+esc(u.pgd||'')+'</b>.</p>'; } }
function setHistory(r){ HIST=r||[]; }
const canRank=()=>!USER||USER.role!=='pgd';
const WT={net:3,gnn:2,khm:2,dpd0:2,dt:2};
function scoreOf(n){ let s=0,w=0,ok=0,cnt=0; KB.forEach(d=>{ const v=kv(d.k,n); if(v.ht==null) return; const ww=WT[d.k]||1; s+=ww*Math.max(0,Math.min(v.ht,1.5)); w+=ww; cnt++; if(v.ht>=T.good) ok++; }); return {score:w?s/w*100:0, ok, cnt}; }
function ranking(){ return POINTS.map((n,i)=>Object.assign({i,n},scoreOf(n))).sort((a,b)=>b.score-a.score); }
const gname=d=>d.g<5?GROUPS[d.g]:(d.k[0]==='c'?'Kênh bán':'Chi tiết kênh');
function monthOf(){ const m=String(META.asof||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m?m[3]+'-'+String(m[2]).padStart(2,'0'):''; }
const pgdCode=n=>{ const t=String(n).trim().split(/\s+/)[0]; return t.split('.')[0]; };
function matchPgd(name, code){ if(!code) return false; const tok=String(name).trim().split(/\s+/)[0].toUpperCase(), c=String(code).trim().toUpperCase(), p=tok.split('.'); return c===tok||c===p[0]||(p[1]!==undefined&&c===p[1]); }
function histSeries(key, n){ return HIST.filter(r=>r[1]===key&&String(r[3]).trim()===n).map(r=>({m:String(r[0]),ht:r[7]===''||r[7]==null?null:Number(r[7])})).sort((a,b)=>a.m<b.m?-1:1); }
function spark(series){ if(!series.length) return '<span class="t-muted">chưa chốt</span>';
  const W=120,H=28,pts=series.slice(-6), hi=Math.max(1.2,...pts.map(p=>p.ht||0)), x=i=>pts.length<2?W/2:6+i*(W-12)/(pts.length-1), y=v=>H-4-(Math.max(0,Math.min(v,hi))/hi)*(H-8);
  let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="width:'+W+'px;display:inline-block;vertical-align:middle"><line x1="0" x2="'+W+'" y1="'+y(1)+'" y2="'+y(1)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
  s+='<polyline fill="none" stroke="var(--accent)" stroke-width="1.6" points="'+pts.map((p,i)=>x(i)+','+y(p.ht||0)).join(' ')+'"/>';
  pts.forEach((p,i)=>{ s+='<circle cx="'+x(i)+'" cy="'+y(p.ht||0)+'" r="2.6" fill="'+col(st(p.ht)[1])+'"><title>'+p.m+': '+pct0(p.ht)+'</title></circle>'; });
  return s+'</svg>'; }

/* ---------- HỒ SƠ PGD ---------- */
function renderHS(){ const e=ent();
  const rows=K.map(d=>({d,v:kv(d.k,e)})).filter(o=>o.v.ht!=null||o.v.th!=null);
  const withHt=rows.filter(o=>o.v.ht!=null).sort((a,b)=>a.v.ht-b.v.ht), noHt=rows.filter(o=>o.v.ht==null);
  const ok=withHt.filter(o=>o.v.ht>=T.good).length, warn=withHt.filter(o=>o.v.ht>=T.warn&&o.v.ht<T.good).length, bad=withHt.length-ok-warn;
  let rankTxt=''; if(canRank()&&sel>=0){ const rk=ranking(); const pos=rk.findIndex(r=>r.i===sel); if(pos>=0) rankTxt=' · xếp hạng <b>'+(pos+1)+'/'+rk.length+'</b> (điểm '+nf0.format(rk[pos].score)+')'; }
  $('hsHead').innerHTML='<p><b>'+esc(short(e))+'</b> đạt <b>'+ok+'/'+withHt.length+'</b> chỉ tiêu có MT'+rankTxt+'.'+(sel<0?' Chọn một PGD ở ô "Đang xem" để xem hồ sơ từng PGD.':'')+'</p><div class="chips"><span class="chip good">'+ok+' đạt</span><span class="chip warn">'+warn+' theo dõi</span><span class="chip crit">'+bad+' cảnh báo</span></div>';
  const todo=withHt.filter(o=>o.v.ht<T.warn).sort((a,b)=>(isMain(b.d.k)-isMain(a.d.k))||(a.v.ht-b.v.ht)).slice(0,3);
  $('hsTodo').innerHTML=todo.length?todo.map(o=>'<li><b>'+esc(o.d.label)+'</b> đạt <b class="neg">'+pct0(o.v.ht)+'</b> ('+fu(o.d.u,o.v.th)+' / MT '+fu(o.d.u,o.v.mt)+')'+(o.v.vs!=null?', so T-1 '+fvs(o.d,o.v.vs):'')+'<span class="sub"> · '+gname(o.d)+'</span></li>').join(''):'<li>Không có chỉ tiêu nào dưới 90% MT.</li>';
  if(sel>=0){ const code=pgdCode(e), url=location.origin+location.pathname+'?pgd='+encodeURIComponent(code);
    $('hsLink').innerHTML='<div class="linkrow"><input id="hsUrl" readonly value="'+esc(url)+'"><button type="button" class="btn" id="hsCopy">Sao chép</button></div><p class="sub">Gửi link này cho trưởng PGD. Người nhận vẫn phải đăng nhập bằng Gmail đã được cấp quyền mới xem được.</p>';
    $('hsCopy').onclick=()=>{ const i=$('hsUrl'); i.select(); (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{$('hsCopy').textContent='Đã sao chép';}).catch(()=>{ try{document.execCommand('copy'); $('hsCopy').textContent='Đã sao chép';}catch(e){} }); };
  } else $('hsLink').innerHTML='<p class="sub">Chọn một PGD ở ô "Đang xem" để lấy link riêng.</p>';
  $('hsTitle').textContent='Toàn bộ chỉ tiêu · '+short(e)+' ('+rows.length+')';
  const tr=o=>{ const s2=st(o.v.ht,o.d.k,o.v.th); return '<tr><td class="l sub">'+gname(o.d)+'</td><td class="l">'+ktag(o.d.k)+'<b>'+esc(o.d.label)+'</b>'+(o.d.low?' <span class="sub">(MT là trần)</span>':'')+'</td><td class="num"><b>'+fu(o.d.u,o.v.th)+'</b></td><td class="num">'+fu(o.d.u,o.v.mt)+'</td><td class="num">'+(o.v.ht==null?'–':'<span class="pill '+(s2[1]==='solid'?'crit':s2[1])+'">'+pct0(o.v.ht)+'</span>')+'</td><td class="num">'+fu(o.d.u,o.v.t1)+'</td><td class="num '+(o.v.vs==null?'':o.v.vs<0?'neg':'pos')+'">'+(fvs(o.d,o.v.vs)||'–')+'</td><td>'+spark(histSeries(o.d.k,e))+'</td></tr>'; };
  $('hsTbl').innerHTML='<thead><tr><th>Nhóm</th><th style="text-align:left">Chỉ tiêu</th><th>TH</th><th>MT</th><th>%HT</th><th>T-1</th><th>vs T-1</th><th style="text-align:left">Xu hướng</th></tr></thead><tbody>'+withHt.concat(noHt).map(tr).join('')+'</tbody>'; }

/* ---------- XẾP HẠNG ---------- */
function renderXH(){ const rk=ranking(), top=Math.max(...rk.map(r=>r.score),1);
  const keyCols=[['net','Tăng Net'],['gnn','GN NET'],['khm','KH mới'],['dt','Doanh thu']];
  const head='<thead><tr><th>Hạng</th><th style="text-align:left">PGD</th><th style="text-align:left">Điểm</th><th>Đạt MT</th>'+keyCols.map(c=>'<th>'+c[1]+'</th>').join('')+'<th style="text-align:left">2 chỉ tiêu yếu nhất</th></tr></thead>';
  const body=rk.map((r,j)=>{ const weak=KB.map(d=>({d,v:kv(d.k,r.n)})).filter(o=>o.v.ht!=null).sort((a,b)=>a.v.ht-b.v.ht).slice(0,2);
    return '<tr class="click'+(r.i===sel?' sel':'')+'" data-i="'+r.i+'"><td class="num"><b>'+(j+1)+'</b></td><td class="l">'+esc(short(r.n))+'</td><td class="l"><span class="scorebar"><i style="width:'+(r.score/top*100)+'%;background:'+col(st(r.score/100)[1])+'"></i></span> <b class="num">'+nf0.format(r.score)+'</b></td><td class="num">'+r.ok+'/'+r.cnt+'</td>'+
      keyCols.map(c=>{ const v=kv(c[0],r.n); const s2=st(v.ht,c[0],v.th); return '<td class="num"><span class="pill '+(s2[1]==='solid'?'crit':s2[1])+'">'+pct0(v.ht)+'</span></td>'; }).join('')+
      '<td class="l sub">'+weak.map(o=>esc(o.d.label)+' '+pct0(o.v.ht)).join(' · ')+'</td></tr>'; }).join('');
  $('xhTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
  $('xhTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>{ sel=+tr.dataset.i; $('pick').value=String(sel); show('hs'); })); }

/* ---------- KIỂM TRA DỮ LIỆU ---------- */
function renderKT(){ const out=[], Rg=REGION;
  const add=(name,detail,s)=>out.push({name,detail,s});
  const cmp=(name,a,b,tol,soft)=>{ if(a==null||b==null){ add(name,'Thiếu số để so sánh','warn'); return; } const d=a-b; add(name,fmt(a)+' so với '+fmt(b)+(Math.abs(d)>tol?' · lệch '+sfmt(d):''),Math.abs(d)<=tol?'ok':(soft?'warn':'crit')); };
  const ds=[['Tracking Key Driver',META.asof],['Kênh bán',META.asof2],['Chi tiết kênh',META.asof3]].filter(x=>x[1]);
  add('Ngày dữ liệu của 3 file', ds.map(x=>x[0]+': '+x[1]).join(' · ')||'Không đọc được ngày', new Set(ds.map(x=>x[1])).size<=1&&ds.length?'ok':'warn');
  const miss=[...new Set(K.filter(d=>!tb(d.tab)).map(d=>d.tab))];
  add('Đủ các bảng dashboard cần', miss.length?'Thiếu: '+miss.slice(0,6).join(', ')+(miss.length>6?' …':''):'Đủ '+[...new Set(K.map(d=>d.tab))].length+' bảng', miss.length?'crit':'ok');
  [['DPD0','Dư nợ DPD0'],['TĂNG NET','Tăng Net'],['GIẢI NGÂN TỔNG','Giải ngân tổng'],['GIẢI NGÂN NET','Giải ngân NET'],['KHM','Số KH mới'],['DOANH THU','Doanh thu']].forEach(([t,lab])=>{
    if(!tb(t)) return; cmp(lab+': cộng '+POINTS.length+' PGD so với dòng khu vực', POINTS.reduce((a,n)=>a+(cell(t,n,'TH')||0),0), cell(t,Rg,'TH'), 2); });
  cmp('KHM file chính so với tổng KHM 4 kênh bán', cell('KHM',Rg,'TH'), CH.reduce((a,c)=>a+(cell(ctab(c[0],'KHM'),Rg,'TH')||0),0), 2);
  cmp('GN NET file chính so với giải ngân 4 kênh bán', cell('GIẢI NGÂN NET',Rg,'TH'), CH.reduce((a,c)=>a+(cell(ctab(c[0],'GIẢI NGÂN'),Rg,'TH')||0),0), 2, true);
  [['DIGITAL HO',0],['MARKETING PGD',1],['PTĐT',2]].forEach(([ch,ci])=>{ const C=CHD[ci]; if(!tb(ctab(C.progs[0][0],'KHM'))) return;
    cmp('KHM kênh '+C.lab+' so với tổng các chương trình ('+C.progs.map(p=>p[1]).join(' + ')+')', cell(ctab(ch,'KHM'),Rg,'TH'), C.progs.reduce((a,p)=>a+(cell(ctab(p[0],'KHM'),Rg,'TH')||0),0), 0, true); });
  Object.values(TB).forEach(t=>{ const h=t.head[t.head.length-1], ix=h.indexOf('TH'); if(ix<0) return; if(t.body.every(r=>num(r[ix])==null)) add('Bảng trống: '+t.name,'Chưa có số TH ở dòng nào','warn'); });
  add('Ô số có chữ thừa', DIRTY?DIRTY+' ô có chữ dính sau số (vd "131% Định dạng có điều kiện bổ sung"). Dashboard đã tự bỏ phần chữ, nên xóa trong Sheet cho sạch.':'Không có', DIRTY?'warn':'ok');
  const lab={ok:['Khớp','good'],warn:['Cần xem','warn'],crit:['Lệch','crit']};
  const order={crit:0,warn:1,ok:2}; out.sort((a,b)=>order[a.s]-order[b.s]);
  $('ktTbl').innerHTML='<thead><tr><th style="text-align:left">Kiểm tra</th><th style="text-align:left">Kết quả</th><th>Trạng thái</th></tr></thead><tbody>'+out.map(o=>'<tr><td class="l"><b>'+esc(o.name)+'</b></td><td class="l" style="white-space:normal">'+esc(o.detail)+'</td><td class="num"><span class="pill '+lab[o.s][1]+'">'+lab[o.s][0]+'</span></td></tr>').join('')+'</tbody>'; }

function snapshotRows(){ const rows=[]; [REGION,...POINTS].forEach(n=>K.forEach(d=>{ const v=kv(d.k,n); if(v.th==null&&v.mt==null) return; rows.push([d.k,d.label,n,v.t1,v.mt,v.th,v.ht,v.vs]); })); return rows; }
function applyRole(){ const pgd=USER&&USER.role==='pgd', adm=!USER||USER.role==='admin';
  document.querySelectorAll('.navbtn[data-v="xh"]').forEach(b=>b.hidden=pgd);
  document.querySelectorAll('.navbtn[data-v="kt"],.navbtn[data-v="raw"],.navbtn[data-v="nk"]').forEach(b=>b.hidden=!adm);
  document.querySelectorAll('.navg').forEach(g=>g.hidden=![...g.querySelectorAll('.navbtn')].some(b=>!b.hidden));
  if(pgd&&view==='xh') view='hs'; if(!adm&&(view==='kt'||view==='raw'||view==='nk')) view='tq'; }


/* ---------- v4: thẻ chỉ số, biểu đồ dọc cho điện thoại, thanh chọn PGD ---------- */
const MOB=window.matchMedia('(max-width:700px)');
function mlist(svg){ const host=svg.parentNode; let el=host.nextElementSibling; if(!el||!el.classList.contains('mlist')){ el=document.createElement('div'); el.className='mlist'; host.after(el); }
  host.hidden=MOB.matches; el.hidden=!MOB.matches; return MOB.matches?el:null; }
function hbars(el, rows, lo, hi){ if(!(hi>lo)) hi=lo+1; const P=v=>(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*100, z=P(0);
  el.innerHTML='<div class="hb">'+rows.map(r=>{ const tracks=r.lines||[r.segs||[]];
    return '<div class="hbrow'+(r.i!=null&&r.i===sel?' sel':'')+(r.i!=null?' click':'')+'"'+(r.i!=null?' data-i="'+r.i+'" role="button" tabindex="0"':'')+'><div class="hbtop"><span class="hbn">'+r.name+'</span><span class="hbr num">'+(r.right||'')+'</span></div>'+
      tracks.map((segs,ti)=>'<div class="hbt'+(r.lines?' thin':'')+'">'+(lo<0?'<span class="hbz" style="left:'+z+'%"></span>':'')+segs.map(sg=>{ const a=P(Math.min(sg.a,sg.b)), b=P(Math.max(sg.a,sg.b));
        return '<i style="left:'+a+'%;width:'+Math.max(.8,b-a)+'%;background:'+sg.c+'"'+(sg.t?' title="'+esc(sg.t)+'"':'')+'>'+(sg.lab&&b-a>16?'<em class="num">'+sg.lab+'</em>':'')+'</i>'; }).join('')+
        (r.mark!=null&&ti===0?'<b class="hbm" style="left:'+P(r.mark)+'%"></b>':'')+'</div>').join('')+'</div>'; }).join('')+'</div>';
  el.querySelectorAll('.hbrow.click').forEach(x=>{ x.addEventListener('click',()=>select(+x.dataset.i)); x.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); select(+x.dataset.i); } }); }); }
function funnelCards(el, cards){ el.innerHTML='<div class="fcards">'+cards.map(c=>'<div class="fcard"><div class="fch"><i style="background:'+c.colr+'"></i><b>'+esc(c.lab)+'</b>'+(c.tag?'<span class="t-muted">'+c.tag+'</span>':'')+'</div>'+
    '<div class="fcells" style="grid-template-columns:repeat('+c.cells.length+',minmax(0,1fr))">'+c.cells.map(x=>{ const s2=x.H==null?null:st(x.H);
      return '<div class="fcell"><span class="fl">'+esc(x.l)+'</span><span class="fv num">'+fmt(x.T)+'</span>'+(s2?'<span class="pill '+sc(s2)+'">'+pct0(x.H)+'</span>':'<span class="pill na">–</span>')+'<span class="fs num">'+(x.M!=null?'MT '+fmt(x.M):(x.sub||''))+(x.V!=null?'<br><span class="'+(x.V<0?'neg':'pos')+'">'+spct(x.V)+' so T-1</span>':'')+'</span></div>'; }).join('')+'</div>'+
    (c.conv&&c.conv.length?'<div class="fconv">'+c.conv.map(t=>'<span>'+t+'</span>').join('')+'</div>':'')+'</div>').join('')+'</div>'; }
function syncBar(){ const b=$('pgdBar'); if(!b) return; const key=REGION+'|'+POINTS.join('|');
  if(b.dataset.key!==key){ b.dataset.key=key; b.innerHTML=[[-1,'Toàn khu vực']].concat(POINTS.map((n,i)=>[i,short(n)])).map(([i,l])=>'<button type="button" class="pchip" data-i="'+i+'">'+esc(l)+'</button>').join('');
    b.querySelectorAll('.pchip').forEach(x=>x.addEventListener('click',()=>{ sel=+x.dataset.i; $('pick').value=String(sel); render(); })); }
  b.querySelectorAll('.pchip').forEach(x=>{ const on=+x.dataset.i===sel; x.setAttribute('aria-pressed',String(on));
    if(on) b.scrollTo({left:Math.max(0,x.offsetLeft-b.clientWidth/2+x.offsetWidth/2),behavior:RM.matches?'auto':'smooth'}); }); }
MOB.addEventListener('change',()=>render());

/* ---------- v5: KPI chính (6) / KPI phụ (MB, BH) ---------- */
const MAIN=['dpd0','net','gnn','khm','thu','rfw'];
const CODE={dpd0:'DPD0',net:'NET',gnn:'GN NET',khm:'KHM',thu:'TLT',rfw:'RFW'};
const SUBMB=['mbnr','mbtk'], SUBBH=['dtbh','bhqd','bhbk','bhtn','bhdl'];
const isMain=k=>MAIN.includes(k), isSub=k=>SUBMB.includes(k)||SUBBH.includes(k);
const ktag=k=>'';
const REF=KB.map(d=>d.k).filter(k=>!isMain(k)&&!isSub(k)&&KM[k].g<4);
const SECTIONS=[['Chỉ tiêu',MAIN],['MBBank',SUBMB],['Bảo hiểm',SUBBH],['Khác',REF],['KHM theo kênh',KB.filter(d=>d.g===4).map(d=>d.k)]];
const SPAGE=k=>GPAGE[KM[k].g];
const openS=new Set([0,1,2]);
function cnt3(keys,e){ const v=keys.map(k=>kv(k,e)).filter(x=>x.ht!=null); return [v.filter(x=>x.ht>=T.good).length, v.filter(x=>x.ht>=T.warn&&x.ht<T.good).length, v.filter(x=>x.ht<T.warn).length, v.length]; }
function scoreOf(n){ let s=0,ok=0,cnt=0; MAIN.forEach(k=>{ const v=kv(k,n); if(v.ht==null) return; s+=Math.max(0,Math.min(v.ht,1.5)); cnt++; if(v.ht>=T.good) ok++; }); return {score:cnt?s/cnt*100:0, ok, cnt}; }
function subScore(keys,n){ const v=keys.map(k=>kv(k,n).ht).filter(x=>x!=null); return v.length?v.reduce((a,x)=>a+Math.max(0,Math.min(x,1.5)),0)/v.length:null; }
function heroCard(k){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s), vsCls=v.vs==null?'':(d.low?v.vs>0:v.vs<0)?'neg':'pos';
  return '<button type="button" class="hcard '+c+'" data-go="'+SPAGE(k)+'"><span class="htop"><span class="hl"><span class="kcode">'+CODE[k]+'</span></span><span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+(v.ht!=null?pct0(v.ht):'–')+'</b></span></span>'+
    '<span class="hv num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</span>'+(s[1]==='solid'?'<span class="pill crit" style="align-self:flex-start">NET ÂM</span>':'')+
    '<span class="hm"><span>'+(d.low?'Trần':'MT')+' <b class="num">'+fu(d.u,v.mt)+'</b></span>'+(v.vs!=null?'<span class="delta num '+vsCls+'">'+(vsCls==='neg'?'▼ ':'▲ ')+fvs(d,v.vs)+' so T-1</span>':'')+'</span></button>'; }
function subCard(lab,keys,go){ const e=ent(), c=cnt3(keys,e), a=subScore(keys,e), s2=st(a);
  return '<button type="button" class="subcard" data-go="'+go+'"><span class="sh"><b>'+lab+'</b><span class="sc num">đạt '+c[0]+'/'+c[3]+'</span></span>'+
    '<span class="sv"><span class="pill '+sc(s2)+'">'+(a==null?'–':pct0(a))+'</span></span>'+
    '<span class="sd">'+keys.map(k=>{ const v=kv(k,e), s3=st(v.ht,k,v.th); return '<span class="si"><i class="dot '+sc(s3)+'"></i>'+esc(KM[k].s)+' <b class="num">'+pct0(v.ht)+'</b></span>'; }).join('')+'</span></button>'; }
function renderOverview(){ const e=ent(); const [ok,warn,bad,n]=cnt3(MAIN,e);
  const mb=cnt3(SUBMB,e), bh=cnt3(SUBBH,e);
  $('ovHead').innerHTML='<div class="ovt"><span class="eyebrow">'+(sel<0?'Toàn khu vực · '+POINTS.length+' PGD':'PGD')+'</span><h2>'+esc(short(e))+' đạt <span class="num">'+ok+'/'+n+'</span> chỉ tiêu</h2></div>'+
    '<div class="seg" role="img" aria-label="'+ok+' đạt, '+warn+' theo dõi, '+bad+' cảnh báo">'+MAIN.map(k=>{ const v=kv(k,e), s2=st(v.ht,k,v.th); return '<i class="'+sc(s2)+'" style="flex:1" title="'+CODE[k]+' '+pct0(v.ht)+'"><span>'+CODE[k]+'</span></i>'; }).join('')+'</div>'+
    '<div class="seglg"><span><i class="good"></i><b class="num">'+ok+'</b> đạt ≥ 100%</span><span><i class="warn"></i><b class="num">'+warn+'</b> theo dõi 90–100%</span><span><i class="crit"></i><b class="num">'+bad+'</b> cảnh báo &lt; 90%</span></div>';
  $('hero').innerHTML=MAIN.map(heroCard).join('');
  $('subs').innerHTML=subCard('MBBank',SUBMB,'mb')+subCard('Bảo hiểm',SUBBH,'dt');
  const pool=KB.map(d=>({d,v:kv(d.k,e)})).filter(o=>o.v.ht!=null&&(isMain(o.d.k)||isSub(o.d.k))&&(o.v.ht<T.warn||(o.d.k==='net'&&o.v.th<0)));
  const worst=pool.sort((a,b)=>(isMain(b.d.k)-isMain(a.d.k))||(a.v.ht-b.v.ht)).slice(0,6);
  $('attnSub').textContent='';
  $('attn').innerHTML=worst.length?worst.map(o=>{ const s=st(o.v.ht,o.d.k,o.v.th);
    return '<button type="button" class="arow'+(isMain(o.d.k)?'':' sub')+'" data-go="'+SPAGE(o.d.k)+'"><span class="an"><b>'+(CODE[o.d.k]||esc(o.d.label))+'</b><small>'+(isMain(o.d.k)?'':SUBMB.includes(o.d.k)?'MBBank':'Bảo hiểm')+'</small></span><span class="av num">'+fu(o.d.u,o.v.th)+'<small>'+(o.d.low?'Trần ':'MT ')+fu(o.d.u,o.v.mt)+'</small></span><span class="pill '+sc(s)+'">'+(s[1]==='solid'?s[0]:pct0(o.v.ht))+'</span></button>'; }).join(''):'<p class="sub">Không có chỉ tiêu nào dưới 90% MT.</p>';
  const pp=$('pgdPanel');
  if(!canRank()){ pp.hidden=true; } else { pp.hidden=false; const rk=ranking();
    const item=r=>{ const j=rk.indexOf(r); return '<button type="button" class="prow'+(r.i===sel?' on':'')+'" data-i="'+r.i+'"><span class="rk num">'+(j+1)+'</span><span class="pn">'+esc(short(r.n))+'</span><span class="scorebar"><i style="width:'+Math.min(100,r.score/1.5)+'%;background:'+col(st(r.score/100)[1])+'"></i></span><b class="num">'+nf0.format(r.score)+'</b></button>'; };
    if(sel<0){ $('pgdTitle').textContent='3 PGD đầu và 3 PGD cuối';
      $('pgdMini').innerHTML='<div class="plist">'+rk.slice(0,3).map(item).join('')+'<div class="pgap" aria-hidden="true">· · ·</div>'+rk.slice(-3).map(item).join('')+'</div>';
    } else { const pos=rk.findIndex(r=>r.i===sel); $('pgdTitle').textContent='Vị trí trong khu vực';
      $('pgdMini').innerHTML='<div class="rankbig"><span class="num">'+(pos+1)+'</span><small>/ '+rk.length+' PGD · điểm '+nf0.format(rk[pos].score)+'</small></div><div class="plist">'+rk.slice(Math.max(0,pos-1),pos+2).map(item).join('')+'</div><button type="button" class="btn" data-go="hs">Mở hồ sơ PGD</button>'; } }
  $('board').innerHTML=SECTIONS.slice(0,3).map(([g,keys],gi)=>{ const c3=cnt3(keys,e);
    return '<details class="kgrp'+(gi===0?' main':'')+'" data-g="'+gi+'"'+(openS.has(gi)?' open':'')+'><summary><span class="gname">'+g+'</span><span class="gcnt">'+(c3[0]?'<span class="dot good"></span>'+c3[0]:'')+(c3[1]?'<span class="dot warn"></span>'+c3[1]:'')+(c3[2]?'<span class="dot crit"></span>'+c3[2]:'')+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>'+
    keys.map(k=>{ const d=KM[k], v=kv(k,e), s=st(v.ht,k,v.th), w=Math.max(0,Math.min(v.ht??0,1.5))/1.5*100;
      return '<div class="krow"><div class="nm">'+(CODE[k]?'<b class="kc">'+CODE[k]+'</b>':d.label)+'</div><div class="v num">'+fu(d.u,v.th)+'<small>'+(d.low?'Trần ':'MT ')+fu(d.u,v.mt)+'</small></div>'+
      '<div class="mini"><i style="width:'+w+'%;background:'+col(s[1])+'"></i><b style="left:'+(100/1.5)+'%"></b></div><div><span class="pill '+sc(s)+'">'+(v.ht!=null?pct0(v.ht):'–')+'</span></div><div class="vs num">'+fvs(d,v.vs)+'</div></div>'; }).join('')+'</details>'; }).join('');
  $('board').querySelectorAll('details').forEach(el=>el.addEventListener('toggle',()=>{ const g=+el.dataset.g; el.open?openS.add(g):openS.delete(g); }));
  wireGo($('v-tq'));
  $('v-tq').querySelectorAll('.prow').forEach(el=>el.addEventListener('click',()=>{ sel=+el.dataset.i; $('pick').value=String(sel); show('hs'); }));
}
function renderXH(){ const rk=ranking(), top=Math.max(...rk.map(r=>r.score),1);
  const pill=(ht,k,th)=>{ const s2=st(ht,k,th); return '<span class="pill '+sc(s2)+'">'+(s2[1]==='solid'?'ÂM':pct0(ht))+'</span>'; };
  const head='<thead><tr><th>Hạng</th><th class="l">PGD</th><th class="l">Điểm</th><th>Đạt</th>'+MAIN.map(k=>'<th>'+CODE[k]+'</th>').join('')+'<th class="gl">MB</th><th>BH</th></tr></thead>';
  const body=rk.map((r,j)=>'<tr class="click'+(r.i===sel?' sel':'')+'" data-i="'+r.i+'"><td class="num"><b>'+(j+1)+'</b></td><td class="l">'+esc(short(r.n))+'</td><td class="l"><span class="scorebar"><i style="width:'+(r.score/top*100)+'%;background:'+col(st(r.score/100)[1])+'"></i></span> <b class="num">'+nf0.format(r.score)+'</b></td><td class="num">'+r.ok+'/'+r.cnt+'</td>'+
    MAIN.map(k=>{ const v=kv(k,r.n); return '<td class="num">'+pill(v.ht,k,v.th)+'</td>'; }).join('')+
    '<td class="num gl">'+pill(subScore(SUBMB,r.n))+'</td><td class="num">'+pill(subScore(SUBBH,r.n))+'</td></tr>').join('');
  $('xhTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
  $('xhTbl').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>{ sel=+tr.dataset.i; $('pick').value=String(sel); show('hs'); })); }
function renderHeat(){ const cols=SECTIONS.flatMap(([g,keys],gi)=>keys.map((k,j)=>({k,gi,first:j===0})));
  const groupsHead='<tr><th></th>'+SECTIONS.map(([g,keys])=>'<th class="grp" colspan="'+keys.length+'">'+g+'</th>').join('')+'</tr>';
  const kHead='<tr><th>PGD</th>'+cols.map((c,i)=>'<th class="k'+(i&&c.first?' gl':'')+'">'+(CODE[c.k]||KM[c.k].s)+'</th>').join('')+'</tr>';
  const rowH=(n,i)=>'<tr class="click'+(i===-1?' reg':'')+(i===sel&&i>=0?' sel':'')+'" data-i="'+i+'"><td>'+esc(short(n))+'</td>'+
    cols.map((c,j)=>{ const d=KM[c.k], v=kv(c.k,n), s=st(v.ht,c.k,v.th); return '<td class="h '+sc(s)+(j&&c.first?' gl':'')+(c.gi===0?' mk':'')+'" title="'+esc(d.label)+': '+fu(d.u,v.th)+' / MT '+fu(d.u,v.mt)+'">'+pct0(v.ht)+'</td>'; }).join('')+'</tr>';
  $('heatTitle').textContent='Bản đồ %HT · '+POINTS.length+' PGD × '+cols.length+' chỉ tiêu';
  $('heat').innerHTML='<thead>'+groupsHead+kHead+'</thead><tbody>'+rowH(REGION,-1)+POINTS.map((n,i)=>rowH(n,i)).join('')+'</tbody>';
  $('heat').querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',()=>select(+tr.dataset.i))); }
function tile(k){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s); const m=[];
  if(v.mt!=null) m.push([d.low?'Trần':'MT', fu(d.u,v.mt)]); if(v.t1!=null) m.push(['T-1', fu(d.u,v.t1)]);
  if(v.vs!=null) m.push(['So T-1', fvs(d,v.vs), (d.low?v.vs>0:v.vs<0)?'neg':'pos']);
  return '<article class="tile '+c+(isMain(k)?' kmain':'')+'"><div class="htop"><span class="hl">'+ktag(k)+(CODE[k]?'<span class="kcode sm">'+CODE[k]+'</span>':'<span>'+d.label+'</span>')+'</span>'+(v.ht!=null?'<span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+pct0(v.ht)+'</b></span>':'')+'</div>'+
    '<div class="big num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</div>'+(s[1]==='solid'?'<span class="pill crit" style="align-self:flex-start">NET ÂM</span>':'')+
    '<div class="metas">'+m.map(x=>'<div class="meta"><span>'+x[0]+'</span><b class="num '+(x[2]||'')+'">'+x[1]+'</b></div>').join('')+'</div></article>'; }

/* ---------- v6: Hồ sơ PGD gọn ---------- */
function renderHS(){ const e=ent(), keys=MAIN.concat(SUBMB,SUBBH), rows=keys.map(k=>({k,d:KM[k],v:kv(k,e)}));
  const nm=o=>CODE[o.k]||esc(o.d.label); const [ok,,,n]=cnt3(MAIN,e);
  let rankTxt=''; if(canRank()&&sel>=0){ const rk=ranking(), pos=rk.findIndex(r=>r.i===sel); if(pos>=0) rankTxt=' · hạng <b>'+(pos+1)+'/'+rk.length+'</b>'; }
  $('hsHead').innerHTML='<p><b>'+esc(short(e))+'</b> đạt <b>'+ok+'/'+n+'</b> chỉ tiêu'+rankTxt+'</p><div class="chips">'+MAIN.map(k=>{ const v=kv(k,e), s2=st(v.ht,k,v.th); return '<span class="chip '+sc(s2)+'">'+CODE[k]+' '+(s2[1]==='solid'?'ÂM':pct0(v.ht))+'</span>'; }).join('')+'</div>';
  const todo=rows.filter(o=>o.v.ht!=null&&(o.v.ht<T.warn||(o.k==='net'&&o.v.th<0))).sort((a,b)=>(isMain(b.k)-isMain(a.k))||(a.v.ht-b.v.ht)).slice(0,3);
  $('hsTodo').innerHTML=todo.length?todo.map(o=>'<li><b>'+nm(o)+'</b> đạt <b class="neg">'+pct0(o.v.ht)+'</b> <span class="t-muted">('+fu(o.d.u,o.v.th)+' / '+(o.d.low?'trần ':'MT ')+fu(o.d.u,o.v.mt)+')</span></li>').join(''):'<li>Không có chỉ tiêu nào dưới 90% MT.</li>';
  if(sel>=0){ const code=pgdCode(e), url=(window.KPI_SITE||location.origin+location.pathname)+'?pgd='+encodeURIComponent(code);
    $('hsLink').innerHTML='<div class="linkrow"><input id="hsUrl" readonly value="'+esc(url)+'"><button type="button" class="btn" id="hsCopy">Sao chép</button></div>';
    $('hsCopy').onclick=()=>{ const i=$('hsUrl'); i.select(); (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{$('hsCopy').textContent='Đã sao chép';}).catch(()=>{ try{document.execCommand('copy'); $('hsCopy').textContent='Đã sao chép';}catch(err){} }); };
  } else $('hsLink').innerHTML='<p class="t-muted" style="margin:0">Chọn một PGD để lấy link.</p>';
  $('hsTitle').textContent='Chỉ tiêu · '+short(e);
  const tr=o=>{ const s2=st(o.v.ht,o.k,o.v.th); return '<tr'+(isMain(o.k)?' class="mainrow"':'')+'><td class="l"><b>'+nm(o)+'</b></td><td class="num"><b>'+fu(o.d.u,o.v.th)+'</b></td><td class="num">'+fu(o.d.u,o.v.mt)+'</td><td class="num">'+(o.v.ht==null?'–':'<span class="pill '+sc(s2)+'">'+(s2[1]==='solid'?'ÂM':pct0(o.v.ht))+'</span>')+'</td><td class="num neg">'+(gapTxt(o.d,o.v).replace(/^còn thiếu /,'')||'<span class="pos">Đạt</span>')+'</td><td class="num">'+fu(o.d.u,o.v.t1)+'</td><td class="num '+(o.v.vs==null?'':(o.d.low?o.v.vs>0:o.v.vs<0)?'neg':'pos')+'">'+(fvs(o.d,o.v.vs)||'–')+'</td><td>'+spark(histSeries(o.k,e))+'</td></tr>'; };
  const sep=t=>'<tr class="seprow"><td colspan="8">'+t+'</td></tr>';
  $('hsTbl').innerHTML='<thead><tr><th style="text-align:left">Chỉ tiêu</th><th>TH</th><th>MT</th><th>%HT</th><th>Còn thiếu</th><th>T-1</th><th>so T-1</th><th style="text-align:left">Xu hướng</th></tr></thead><tbody>'+
    rows.filter(o=>isMain(o.k)).map(tr).join('')+sep('MBBank')+rows.filter(o=>SUBMB.includes(o.k)).map(tr).join('')+sep('Bảo hiểm')+rows.filter(o=>SUBBH.includes(o.k)).map(tr).join('')+'</tbody>'; }

/* ---------- v7: còn thiếu, báo cáo Zalo, ghi chú, ai đã xem ---------- */
let NOTES=[], ACT=null;
function gapFmt(d,x){ return (d.u==='pct1'||d.u==='pct2')?nf1.format(x*100)+' điểm':fu(d.u,x); }
function gapTxt(d,v){ if(v.th==null||v.mt==null) return '';
  if(d.low) return v.th>v.mt?'vượt trần '+gapFmt(d,v.th-v.mt):'';
  return v.th<v.mt?'còn thiếu '+gapFmt(d,v.mt-v.th):''; }
function heroCard(k){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s), vsCls=v.vs==null?'':(d.low?v.vs>0:v.vs<0)?'neg':'pos', g=gapTxt(d,v);
  return '<button type="button" class="hcard '+c+'" data-go="'+SPAGE(k)+'"><span class="htop"><span class="hl"><span class="kcode">'+CODE[k]+'</span></span><span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+(v.ht!=null?pct0(v.ht):'–')+'</b></span></span>'+
    '<span class="hv num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</span>'+
    '<span class="gap '+(g?'':'ok')+'">'+(g?g.charAt(0).toUpperCase()+g.slice(1):(s[1]==='solid'?'NET âm':'Đã đạt MT'))+'</span>'+
    '<span class="hm"><span>'+(d.low?'Trần':'MT')+' <b class="num">'+fu(d.u,v.mt)+'</b></span>'+(v.vs!=null?'<span class="delta num '+vsCls+'">'+(v.vs<0?'▼ ':'▲ ')+fvs(d,v.vs)+' so T-1</span>':'')+'</span></button>'; }
function tile(k){ const d=KM[k], v=kv(k,ent()), s=st(v.ht,k,v.th), c=sc(s), g=gapTxt(d,v); const m=[];
  if(v.mt!=null) m.push([d.low?'Trần':'MT', fu(d.u,v.mt)]); if(g) m.push([g.startsWith('vượt')?'Vượt trần':'Còn thiếu', g.replace(/^(còn thiếu|vượt trần) /,''), 'neg']);
  if(v.t1!=null) m.push(['T-1', fu(d.u,v.t1)]); if(v.vs!=null) m.push(['So T-1', fvs(d,v.vs), (d.low?v.vs>0:v.vs<0)?'neg':'pos']);
  return '<article class="tile '+c+(isMain(k)?' kmain':'')+'"><div class="htop"><span class="hl">'+(CODE[k]?'<span class="kcode sm">'+CODE[k]+'</span>':'<span>'+d.label+'</span>')+'</span>'+(v.ht!=null?'<span class="gauge">'+ring(v.ht,col(s[1]))+'<b class="num">'+pct0(v.ht)+'</b></span>':'')+'</div>'+
    '<div class="big num" data-n="'+(v.th??'')+'" data-u="'+d.u+'">'+fu(d.u,v.th)+'</div>'+(s[1]==='solid'?'<span class="pill crit" style="align-self:flex-start">NET ÂM</span>':'')+
    '<div class="metas">'+m.map(x=>'<div class="meta"><span>'+x[0]+'</span><b class="num '+(x[2]||'')+'">'+x[1]+'</b></div>').join('')+'</div></article>'; }
function toast(t){ const el=$('toast'); if(!el) return; el.textContent=t; el.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(()=>{ el.hidden=true; },2400); }
function reportText(){ const e=ent(), L=[];
  L.push('KPI '+(sel<0?'Khu vực '+REGION.replace(/^\(([\d.]+)\)\s*/,'$1 – '):short(e))+' · số liệu '+(META.asof||''));
  MAIN.forEach(k=>{ const d=KM[k], v=kv(k,e), s2=st(v.ht,k,v.th), g=gapTxt(d,v);
    L.push('▪ '+CODE[k]+': '+fu(d.u,v.th)+' / '+(d.low?'trần ':'MT ')+fu(d.u,v.mt)+' ('+(s2[1]==='solid'?'âm':pct0(v.ht))+')'+(g?' – '+g:'')); });
  L.push('▪ MB: '+pct0(subScore(SUBMB,e))+' · BH: '+pct0(subScore(SUBBH,e)));
  if(sel<0&&canRank()&&POINTS.length>3){ const rn=POINTS.map(n=>({n,v:kv('net',n)})).filter(o=>o.v.ht!=null).sort((a,b)=>b.v.ht-a.v.ht);
    L.push('Dẫn đầu NET: '+rn.slice(0,3).map(o=>short(o.n)).join(', '));
    L.push('Cần đẩy NET: '+rn.slice(-3).reverse().map(o=>short(o.n)).join(', ')); }
  else { const weak=MAIN.filter(k=>{ const v=kv(k,e); return v.ht!=null&&(v.ht<T.warn||(k==='net'&&v.th<0)); }); if(weak.length) L.push('Cần đẩy: '+weak.map(k=>CODE[k]).join(', ')); }
  return L.join('\n'); }
async function copyReport(){ const t=reportText();
  try{ await navigator.clipboard.writeText(t); toast('Đã sao chép'); }
  catch(err){ const a=document.createElement('textarea'); a.value=t; a.setAttribute('readonly',''); a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select();
    let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} a.remove(); toast(ok?'Đã sao chép':'Không sao chép được, thử lại trên trình duyệt khác'); } }
const fdt=t=>new Date(t).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
function renderNotes(){ const box=$('notesBox'); if(!box) return; const e=ent(), canW=USER&&USER.role!=='pgd';
  const list=NOTES.filter(n=>sel<0||n.pgd===e).sort((a,b)=>b.t-a.t).slice(0,30);
  box.innerHTML=(canW&&sel>=0?'<div class="nform"><textarea id="noteText" rows="2" maxlength="500" placeholder="Việc cần làm cho '+esc(short(e))+'…"></textarea><button type="button" class="btn primary" id="noteAdd">Lưu</button></div>':'')+
    (list.length?'<ul class="nlist">'+list.map(n=>'<li><div><p>'+esc(n.text)+'</p><span class="t-muted">'+(sel<0?esc(short(n.pgd))+' · ':'')+esc(n.by)+' · '+fdt(n.t)+'</span></div>'+(canW?'<button type="button" class="nx" data-t="'+n.t+'" data-p="'+esc(n.pgd)+'" aria-label="Xoá ghi chú">×</button>':'')+'</li>').join('')+'</ul>'
      :'<p class="t-muted nempty">'+(canW&&sel<0?'Chọn một PGD để thêm ghi chú.':'Chưa có ghi chú.')+'</p>');
  const add=$('noteAdd'); if(add) add.onclick=async()=>{ const t=$('noteText').value.trim(); if(!t||!window.kpiApi) return; add.disabled=true;
    try{ const r=await window.kpiApi('noteAdd',{pgd:e,text:t}); NOTES=r.rows||NOTES; renderNotes(); toast('Đã lưu ghi chú'); }catch(err){ toast(err.message); add.disabled=false; } };
  box.querySelectorAll('.nx').forEach(b=>b.onclick=async()=>{ if(!window.kpiApi) return; b.disabled=true;
    try{ const r=await window.kpiApi('noteDel',{t:+b.dataset.t,pgd:b.dataset.p}); NOTES=r.rows||NOTES; renderNotes(); toast('Đã xoá ghi chú'); }catch(err){ toast(err.message); b.disabled=false; } }); }
function renderNK(){ const box=$('nkBox'), rec=$('nkRecent');
  if(!ACT){ box.innerHTML='<p class="t-muted">Đang tải…</p>'; rec.innerHTML=''; if(window.kpiNeed) window.kpiNeed('nk'); return; }
  if(ACT.error){ box.innerHTML='<p class="t-muted">'+esc(ACT.error)+'</p>'; return; }
  const lab={admin:'Admin',khuvuc:'Khu vực',pgd:'PGD'};
  const users=ACT.users.filter(u=>u.active).sort((a,b)=>(b.today>0)-(a.today>0)||(b.last-a.last));
  const seen=users.filter(u=>u.today>0).length;
  $('nkTitle').textContent='Hôm nay '+seen+'/'+users.length+' người đã mở báo cáo';
  box.innerHTML='<ul class="ulist">'+users.map(u=>'<li><div class="uinf"><b>'+esc(u.name||u.email)+'</b><span class="t-muted">'+(lab[u.role]||u.role)+(u.pgd?' '+esc(u.pgd):'')+' · '+esc(u.email)+'</span></div><div class="ust">'+(u.today?'<span class="pill good">'+u.today+' lần</span>':'<span class="pill crit">Chưa mở</span>')+'<span class="t-muted num">'+(u.last?fdt(u.last):'chưa từng mở')+'</span></div></li>').join('')+'</ul>';
  const act={login:'Đăng nhập',view:'Xem báo cáo','login-denied':'Bị từ chối',snapshot:'Chốt tháng',note:'Thêm ghi chú'};
  rec.innerHTML='<ul class="nlist">'+ACT.recent.map(r=>'<li><div><p><b>'+esc(r.name||r.email)+'</b> · '+(act[r.act]||esc(r.act))+(r.detail?' <span class="t-muted">'+esc(r.detail)+'</span>':'')+'</p><span class="t-muted">'+fdt(r.t)+'</span></div></li>').join('')+'</ul>'; }
/* ---------- wiring ---------- */
function select(i){ sel=(sel===i&&i>=0)?-1:i; $('pick').value=String(sel); render(); }
function render(){ if(!booted) return; syncBar(); ({tq:renderOverview,hs:renderHS,xh:()=>{renderXH();renderHeat();},kt:renderKT,dn:renderDN,gn:renderGN,kn:renderKN,pt:renderPT,dt:renderDT,mb:renderMB,raw:renderRaw,nk:renderNK})[view](); if(view==='hs') renderNotes(); if($('hsTbl')) $('hsTbl').classList.toggle('nohist',!HIST.length); const sec=$('v-'+view); if(sec){ sec.querySelectorAll('.tiles').forEach(t=>t.style.setProperty('--n',t.children.length)); countUp(sec); tilt(sec); } }
function show(v){ const changed=view!==v; view=v;
  document.querySelectorAll('.navbtn').forEach(b=>b.setAttribute('aria-current',b.dataset.v===v?'page':'false'));
  document.querySelectorAll('.bn').forEach(b=>b.setAttribute('aria-current',(b.dataset.grp||'').split(' ').includes(v)?'page':'false'));
  document.querySelectorAll('section.view').forEach(s=>s.hidden=s.id!=='v-'+v);
  $('pageTitle').textContent=PAGES[v]||''; document.title=(PAGES[v]||'KPI')+' · KPI Khu vực 5.5';
  $('shell').classList.remove('open'); try{localStorage.setItem('kpi55-view',v);}catch(e){} render(); if(changed) window.scrollTo(0,0); }
$('pick').addEventListener('change',e=>{sel=+e.target.value; render();});
$('rawPick').addEventListener('change',renderRaw);
document.querySelectorAll('.navbtn,.bn[data-v]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.v)));
$('copyBtn').addEventListener('click',copyReport);
const toggleMenu=o=>$('shell').classList.toggle('open',o);
$('menuBtn').addEventListener('click',()=>toggleMenu(true)); $('moreBtn').addEventListener('click',()=>toggleMenu(true)); $('scrim').addEventListener('click',()=>toggleMenu(false));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') toggleMenu(false); });
function boot(SRC, meta){ const prev=sel>=0?POINTS[sel]:null; loadData(SRC, meta);
  sel=prev&&POINTS.includes(prev)?POINTS.indexOf(prev):-1;
  $('title').textContent='Khu vực '+REGION.replace(/^\(([\d.]+)\)\s*/,'$1 · ');
  $('asof').textContent='Số liệu ngày '+(META.asof||'–')+(META.fetched?' · cập nhật '+META.fetched:'');
  $('pick').innerHTML='<option value="-1">Toàn khu vực ('+POINTS.length+' PGD)</option>'+POINTS.map((n,i)=>'<option value="'+i+'">'+esc(short(n))+'</option>').join('');
  $('pick').value=String(sel);
  const rv=$('rawPick').value; $('rawPick').innerHTML=Object.entries(TB).map(([k,t])=>'<option value="'+esc(k)+'">'+esc(t.name)+'</option>').join(''); if(rv&&TB[rv]) $('rawPick').value=rv;
  deriveAll(); booted=true; applyRole();
  if(USER&&USER.role==='pgd'&&sel<0&&POINTS.length) sel=0; $('pick').value=String(sel); }
const VIEWS=['tq','hs','xh','dn','gn','kn','pt','dt','mb','kt','raw','nk'];
let start='tq'; try{ const h=location.hash.slice(1); const s=localStorage.getItem('kpi55-view'); if(VIEWS.includes(h)) start=h; else if(VIEWS.includes(s)) start=s; }catch(e){}
function startView(){ const q=new URLSearchParams(location.search).get('pgd');
  if(q){ const i=POINTS.findIndex(n=>matchPgd(n,q)); if(i>=0){ sel=i; $('pick').value=String(i); start='hs'; } }
  if(USER&&USER.role==='pgd'&&(start==='xh'||start==='kt')) start='hs';
  show(start); }
window.KPI={boot, start:startView, render:()=>render(), setUser, setHistory, snapshotRows, monthOf, setNotes:r=>{NOTES=r||[];}, setActivity:a=>{ACT=a;}, view:()=>view};
})();

/* ================= Đăng nhập Google + gọi API ================= */
(function(){
  const C=window.KPI_CONFIG||{}, $=id=>document.getElementById(id);
  let token=null, first=true; try{ token=sessionStorage.getItem('kpi55-token'); }catch(e){}
  const msg=t=>{ $('liveMsg').textContent=t||''; };
  const askConfirm=text=>new Promise(res=>{ $('confirmText').textContent=text; $('confirmBox').hidden=false;
    const done=v=>{ $('confirmBox').hidden=true; $('confirmYes').onclick=$('confirmNo').onclick=null; res(v); };
    $('confirmYes').onclick=()=>done(true); $('confirmNo').onclick=()=>done(false); $('confirmYes').focus(); });
  async function api(action, extra){
    const r=await fetch(C.API_URL,{method:'POST',body:JSON.stringify(Object.assign({action,token},extra||{}))});
    if(!r.ok) throw new Error('Máy chủ trả lỗi '+r.status);
    const j=await r.json();
    if(!j.ok){ if(j.error==='SESSION_EXPIRED'){ signOut('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'); throw new Error('Phiên đã hết hạn'); } throw new Error(j.error||'Lỗi không xác định'); }
    return j; }
  function showLogin(m){ $('app').hidden=true; $('login').hidden=false; $('loginMsg').textContent=m||''; renderBtn(); }
  function renderBtn(){
    if(!(window.google&&google.accounts&&google.accounts.id)){ setTimeout(renderBtn,300); return; }
    google.accounts.id.initialize({client_id:C.GOOGLE_CLIENT_ID, callback:onCred, auto_select:false, cancel_on_tap_outside:true});
    google.accounts.id.renderButton($('gbtn'),{theme:'outline',size:'large',text:'signin_with',shape:'pill',locale:'vi',width:280}); }
  async function onCred(resp){
    $('loginMsg').textContent='Đang kiểm tra quyền truy cập…';
    try{ const j=await api('login',{idToken:resp.credential}); token=j.token; try{ sessionStorage.setItem('kpi55-token',token); }catch(e){} openApp(); }
    catch(e){ $('loginMsg').textContent=e.message; } }
  function showUser(u){ $('who').textContent=(u.name?u.name+' · ':'')+u.email;
    const lab={admin:'Admin',khuvuc:'Khu vực',pgd:'PGD '+(u.pgd||'')}[u.role]||u.role; $('roleChip').textContent=lab;
    $('snapBtn').hidden=u.role!=='admin'; window.KPI_SITE=location.origin+location.pathname; }
  async function openApp(){ $('login').hidden=true; $('app').hidden=false; await load(); }
  window.kpiApi=(a,x)=>api(a,x);
  window.kpiNeed=async v=>{ if(v==='nk'){ try{ KPI.setActivity(await api('activity')); }catch(e){ KPI.setActivity({error:e.message}); } KPI.render(); } };
  async function load(fresh){ fresh=fresh===true; msg('Đang tải số liệu…'); $('refreshBtn').disabled=true; document.body.classList.add('busy'); if(first) $('skel').hidden=false;
    try{ const j=await api('data',{fresh}); KPI.setUser(j.user); showUser(j.user); KPI.boot(j.sheets,j.meta);
      if(first){ KPI.start(); first=false; } else KPI.render();
      msg('Cập nhật lúc '+(j.meta.fetched||''));
      api('history').then(h=>{ KPI.setHistory(h.rows); KPI.render(); }).catch(()=>{});
      api('notes').then(n=>{ KPI.setNotes(n.rows); KPI.render(); }).catch(()=>{});
      if(KPI.view()==='nk') window.kpiNeed('nk'); }
    catch(e){ msg(e.message); }
    finally{ $('refreshBtn').disabled=false; document.body.classList.remove('busy'); $('skel').hidden=true; } }
  function signOut(m){
    if(token) fetch(C.API_URL,{method:'POST',body:JSON.stringify({action:'logout',token})}).catch(()=>{});
    token=null; try{ sessionStorage.removeItem('kpi55-token'); if(m) sessionStorage.setItem('kpi55-msg',m); }catch(e){}
    try{ google.accounts.id.disableAutoSelect(); }catch(e){}
    location.replace(location.pathname+location.search); }          // tải lại trang để xóa sạch số liệu khỏi bộ nhớ
  $('refreshBtn').addEventListener('click',()=>load(true));
  $('logoutBtn').addEventListener('click',()=>signOut());
  $('snapBtn').addEventListener('click',async()=>{ const m=KPI.monthOf();
    if(!m){ msg('Không xác định được tháng của số liệu'); return; }
    if(!(await askConfirm('Chốt số tháng '+m+'? Số đã chốt trước đó của tháng này (nếu có) sẽ được thay bằng số hiện tại.'))) return;
    $('snapBtn').disabled=true; msg('Đang chốt tháng '+m+'…');
    try{ const j=await api('snapshot',{month:m, rows:KPI.snapshotRows()}); msg('Đã chốt '+j.count+' dòng số liệu tháng '+j.month); const h=await api('history'); KPI.setHistory(h.rows); KPI.render(); }
    catch(e){ msg(e.message); } finally{ $('snapBtn').disabled=false; } });
  let pending=''; try{ pending=sessionStorage.getItem('kpi55-msg')||''; sessionStorage.removeItem('kpi55-msg'); }catch(e){}
  if(!C.API_URL||/DAN_|YOUR_/.test(C.API_URL)||!C.GOOGLE_CLIENT_ID||/DAN_|YOUR_/.test(C.GOOGLE_CLIENT_ID)){ showLogin('Chưa cấu hình config.js (API_URL và GOOGLE_CLIENT_ID). Xem README.'); return; }
  if(token) openApp(); else showLogin(pending);
})();
