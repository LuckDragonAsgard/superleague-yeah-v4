const PATCH = `<script>
(function(){if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})});if('caches' in window)caches.keys().then(function(k){k.forEach(function(x){caches.delete(x)})});})();
</script>
<style id="sly-patch-style">
img[src*="team-logos"],img[src*="hzkodmxrranessgbjjjl.supabase"]{
  width:60px!important;height:76px!important;object-fit:contain!important;
  background:transparent!important;padding:0!important;border-radius:0!important;
  box-sizing:content-box!important;mix-blend-mode:normal!important;
  display:inline-block!important;vertical-align:middle!important;
  filter:none!important;opacity:1!important;border:none!important;
}
[class*="fixture"] img[src*="team-logos"],[class*="Fixture"] img[src*="team-logos"],
[class*="fixture"] img[src*="supabase"],[class*="Fixture"] img[src*="supabase"],
[class*="match-card"] img[src*="team-logos"],[class*="match"] img[src*="team-logos"]{
  width:72px!important;height:90px!important;
  background:transparent!important;padding:0!important;border-radius:0!important;
}
[class*="welcome"] img[src*="team-logos"],[class*="header"] img[src*="team-logos"],
[class*="hero"] img[src*="team-logos"]{
  width:80px!important;height:100px!important;
}
[class*="ladder"] img[src*="team-logos"],[class*="activity"] img[src*="team-logos"],
[class*="feed"] img[src*="team-logos"]{
  width:36px!important;height:46px!important;
}
[class*="banter"] img[src*="team-logos"],[class*="chat"] img[src*="team-logos"],
[class*="message"] img[src*="team-logos"],[class*="Banter"] img[src*="team-logos"]{
  width:32px!important;height:40px!important;margin-right:8px!important;
}
[class*="trophy"] img[src*="team-logos"],[class*="Trophy"] img[src*="team-logos"]{
  width:40px!important;height:50px!important;background:transparent!important;
  mix-blend-mode:multiply!important;
}
/* Coach logo webp files have baked-in white bgs - blend them with dark page */
img.coach-logo-img,img[src*="logo.webp"]{
  mix-blend-mode:multiply!important;
  background:transparent!important;filter:contrast(1.1) brightness(1.1)!important;
}
/* Hard cap on injected AFL player headshots — prevent runaway growth on Lovable re-renders */
img[src*="ChampIDImages"]{
  max-width:48px!important;max-height:48px!important;
  width:auto;height:auto;object-fit:cover!important;object-position:top center!important;
  border-radius:50%!important;
}
/* Strip white background from any direct parent div wrapping a team jumper */
div:has(img[src*="team-logos"]),span:has(img[src*="team-logos"]),
[class*="bg-white"]:has(img[src*="team-logos"]){
  background:transparent!important;background-color:transparent!important;
  border-radius:0!important;padding:0!important;box-shadow:none!important;
}
.coach-select-btn,[class*="coach-select"]{
  display:flex!important;flex-direction:column!important;align-items:center!important;
  gap:6px!important;padding:10px!important;min-height:auto!important;
}
[class*="player"][class*="avatar"],[class*="player-photo"],[class*="initial"]{
  border-radius:50%!important;overflow:hidden!important;
  background:#1f2937!important;color:#fff!important;
  display:inline-flex!important;align-items:center!important;justify-content:center!important;
  font-weight:700!important;
}
#sly-extras-btn{position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:50%;width:54px;height:54px;font-size:22px;cursor:pointer;z-index:9999;box-shadow:0 4px 20px rgba(99,102,241,.5)}
#sly-extras-btn:hover{transform:scale(1.12);box-shadow:0 6px 24px rgba(99,102,241,.7)}
#sly-ver-banner{position:fixed;top:6px;right:6px;background:#10b981;color:#000;padding:3px 8px;font-size:11px;font-weight:700;border-radius:4px;z-index:99999;font-family:ui-monospace,monospace;pointer-events:none;opacity:.85}
#sly-extras-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);align-items:center;justify-content:center;padding:12px}
#sly-extras-modal.open{display:flex}
#sly-extras-inner{background:#111827;border-radius:14px;width:min(100%,560px);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.sly-mhead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #1f2937}
.sly-mtitle{color:#fff;font-weight:700;font-size:15px;font-family:system-ui,sans-serif}
.sly-mclose{background:none;border:none;color:#6b7280;font-size:20px;cursor:pointer;padding:0;line-height:1}.sly-mclose:hover{color:#fff}
#sly-extras-tabs{display:flex;border-bottom:1px solid #1f2937}
.sly-tab{flex:1;padding:11px 4px;text-align:center;cursor:pointer;font-size:12px;color:#6b7280;border:none;background:none;border-bottom:2px solid transparent;font-family:system-ui,sans-serif}
.sly-tab.active{color:#818cf8;border-bottom-color:#6366f1}.sly-tab:hover{color:#d1d5db}
#sly-extras-body{overflow-y:auto;padding:14px 16px;flex:1;font-family:system-ui,sans-serif;color:#d1d5db}
.sly-coach-card{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #1f2937}
.sly-coach-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.sly-coach-logo{width:38px;height:38px;border-radius:6px;object-fit:cover;flex-shrink:0}
.sly-coach-team{color:#fff;font-weight:600;font-size:14px}.sly-coach-sub{color:#6b7280;font-size:12px;margin-top:1px}
.sly-pill{display:inline-block;background:#1f2937;border-radius:4px;padding:1px 6px;margin:2px;color:#d1d5db;font-size:11px}
.sly-pill.myman{background:#4c1d95;color:#c4b5fd}.sly-pill.fa{background:#0c4a6e;color:#7dd3fc}
.sly-act-item{padding:9px 0;border-bottom:1px solid #1f2937}
.sly-act-msg{color:#d1d5db;font-size:13px;margin-top:4px}
.sly-act-time{color:#6b7280;font-size:11px;margin-top:3px}
.sly-swap-item{padding:10px 0;border-bottom:1px solid #1f2937}
.sly-badge-done{display:inline-block;background:#064e3b;color:#6ee7b7;padding:1px 7px;border-radius:4px;font-size:11px}
.sly-badge-pend{display:inline-block;background:#78350f;color:#fcd34d;padding:1px 7px;border-radius:4px;font-size:11px}
.sly-input{width:100%;padding:10px 12px;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:10px;outline:none;font-family:system-ui,sans-serif}
.sly-input:focus{border-color:#6366f1}
.sly-btn{width:100%;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif}
.sly-btn:hover{background:#4f46e5}
.sly-ok{color:#4ade80;text-align:center;margin-top:10px;font-size:13px}
.sly-err{color:#f87171;text-align:center;margin-top:10px;font-size:13px}
.sly-md-board{padding:12px;background:#0f172a;border-radius:10px;margin:8px 0}
.sly-md-title{color:#fff;font-weight:700;font-size:14px;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.sly-md-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e293b;color:#e5e7eb;font-size:13px}
.sly-md-row:last-child{border-bottom:none}
.sly-md-team{display:flex;align-items:center;gap:8px}
.sly-md-team img{width:28px!important;height:36px!important;border-radius:0!important;background:transparent!important;padding:0!important;object-fit:contain!important}
.sly-md-pts{font-weight:700;color:#fcd34d;font-variant-numeric:tabular-nums}
.sly-gold-card{padding:14px;background:linear-gradient(135deg,#78350f,#92400e);border-radius:10px;margin:10px 0;color:#fff;font-family:system-ui,sans-serif}
.sly-gold-h{font-size:15px;font-weight:700;margin-bottom:8px;color:#fcd34d}
.sly-gold-li{font-size:13px;margin:4px 0;color:#fff8e1;display:flex;gap:6px;align-items:flex-start}
.sly-gold-li::before{content:"\\u2605";color:#fcd34d;flex-shrink:0}
.sly-gold-divider{height:1px;background:rgba(255,255,255,0.2);margin:10px 0}
.sly-gold-addon{font-size:13px;color:#fff8e1;margin-top:4px}
.sly-gold-addon b{color:#fcd34d}
</style>
<script>
(function(){
'use strict';
var API='/api';
var VER='v4.37';

function ensureBanner(){
  if(document.getElementById('sly-ver-banner'))return;
  var b=document.createElement('div');b.id='sly-ver-banner';b.textContent=VER+' \\xb7 LIVE';
  document.body&&document.body.appendChild(b);
}
setInterval(ensureBanner,1500);ensureBanner();

var _pmap=null,_coaches=null,_scores=null,_pBaseByName=null;
var _extraChamp={
  "alix tauru": "1030433",
  "jade gresham": "298421",
  "jaeger o'meara": "294613",
  "jagga smith": "1028515",
  "jai culley": "1020802",
  "jai murray": "1029307",
  "jai newcombe": "1020895",
  "jai saxena": "1033835",
  "jai serong": "1017091",
  "jaime uhr-henry": "1039499",
  "jake bowey": "1012825",
  "jake kolodjashnij": "296291",
  "jake lever": "298281",
  "jake lloyd": "295342",
  "jake melksham": "280824",
  "jake riccardi": "1008123",
  "jake rogers": "1018123",
  "jake soligo": "1017109",
  "jake stringer": "293884",
  "jake waterman": "996554",
  "jakob ryan": "1020104",
  "jamarra ugle-hagan": "1009301",
  "james barrat": "1028545",
  "james blanck": "1011839",
  "james borlase": "1009029",
  "james harmes": "297899",
  "james jordon": "1013409",
  "james leake": "1032119",
  "james o'donnell": "1032966",
  "james peatling": "1006013",
  "james rowbottom": "1006126",
  "james sicily": "297566",
  "james trezise": "1031829",
  "james tunstill": "1021108",
  "james worpel": "1002222",
  "jamie cripps": "290826",
  "jamie elliott": "293801",
  "jaren carr": "1023047",
  "jarman impey": "296254",
  "jarrod berry": "998133",
  "jarrod witts": "291975",
  "jase burgoyne": "1013462",
  "jason horne-francis": "1011640",
  "jaspa fletcher": "1023708",
  "jasper alger": "1028537",
  "jaxon prior": "1009386",
  "jay polkinghorne": "1027428",
  "jayden laverde": "298280",
  "jayden nguyen": "1018987",
  "jayden short": "992049",
  "jed adams": "1023174",
  "judson clarke": "1017043",
  "justin mcinerney": "1011936",
  "jy farrar": "999715",
  "jy simpkin": "993998",
  "jye amiss": "1020594",
  "jye caldwell": "1006103",
  "kade chandler": "1005330",
  "kai lohmann": "1014026",
  "kalani white": "1033572",
  "kaleb smith": "1022999",
  "kane farrell": "1002253",
  "kane mcauliffe": "1019916",
  "karl amon": "297354",
  "karl worner": "1021015",
  "kayle gerreyn": "1029159",
  "keidean coleman": "1006059",
  "keighton matofai-forbes": "1032141",
  "kieren briggs": "1008436",
  "kobe mcdonald": "1044597",
  "koby coulson": "1033555",
  "koby evans": "1037376",
  "koltyn tholstrup": "1023640",
  "kye fincher": "1033048",
  "kyle langford": "298630",
  "kysaiah pickett": "1008541",
  "lachie ash": "1009253",
  "lachie fogarty": "1002228",
  "lachie jaques": "1028493",
  "lachie jones": "1011583",
  "lachie neale": "293535",
  "lachie schultz": "1000860",
  "lachie weller": "298524",
  "lachie whitfield": "294305",
  "lachlan blakiston": "1028196",
  "lachlan bramble": "1000864",
  "lachlan carmichael": "1033626",
  "lachlan cowan": "1021353",
  "lachlan gulbin": "1029304",
  "lachlan mcandrew": "1021200",
  "lachlan mcneil": "1009015",
  "lachlan sholl": "1006136",
  "lachlan smith": "1027702",
  "lachlan sullivan": "998480",
  "lachy dovaston": "1033060",
  "laitham vandermeer": "1005000",
  "lance collard": "1017959",
  "latrelle pickett": "1022677",
  "lawson humphries": "1013464",
  "leek aleer": "1008691",
  "mason cox": "998647",
  "mason redman": "997078",
  "mason wood": "295340",
  "massimo d'ambrosio": "1005144",
  "matt duffy": "1039720",
  "matt flynn": "993902",
  "matt guelfi": "996232",
  "matt hill": "1039500",
  "matt roberts": "1012210",
  "matt rowell": "1009208",
  "matt whitlock": "1028547",
  "mattaes phillipou": "1020137",
  "matthew carroll": "1027964",
  "matthew cottrell": "1008154",
  "matthew jefferson": "1023486",
  "matthew johnson": "1016825",
  "matthew kennedy": "1001398",
  "matthew leray": "1027145",
  "matthew owies": "1013973",
  "maurice rioli": "1009551",
  "max gawn": "290528",
  "max gruzewski": "1027921",
  "max hall": "1020855",
  "max heath": "1015886",
  "max holmes": "1015889",
  "max king": "1029015",
  "max knobel": "1027701",
  "max kondogiannis": "1036584",
  "max michalanney": "1015370",
  "max ramsden": "1027965",
  "michael frederick": "999321",
  "michael sellwood": "1020621",
  "milan murdock": "1005972",
  "miles bergman": "1009191",
  "mitch georgiades": "1010174",
  "mitch knevitt": "1021103",
  "mitch lewis": "1000887",
  "mitch mcgovern": "297255",
  "mitch owens": "1023272",
  "mitch zadow": "1029603",
  "mitchell edwards": "1024304",
  "mitchell hinge": "1004863",
  "mitchell marsh": "1031747",
  "murphy reid": "1028513",
  "mykelti lefau": "1008747",
  "nasiah wanganeen-milera": "1015507",
  "nate caddy": "1027899",
  "nathan broad": "295203",
  "ned bowman": "1027406",
  "ned long": "1017124",
  "ned moyle": "1021013",
  "ned reeves": "1001024",
  "neil erasmus": "1020250",
  "nic martin": "1012013",
  "nic newman": "297907",
  "nicholas driscoll": "1033039",
  "nicholas madden": "1023743",
  "nick blakey": "1006028",
  "nick bryan": "1011954",
  "nick coffield": "1005717",
  "nick daicos": "1023261",
  "nick haynes": "295265",
  "nick holman": "297456",
  "nick larkey": "1001017",
  "nick murray": "1008230",
  "nick vlastuin": "294674",
  "nick watson": "1023473",
  "nik cox": "1015827",
  "noah anderson": "1009199",
  "noah answerth": "1005053",
  "noah balta": "1002245",
  "noah chamberlain": "1033013",
  "noah howes": "1022614",
  "noah long": "1023496",
  "noah mraz": "1028643",
  "noah roberts-thomson": "1026974",
  "oisin mullin": "1024982",
  "oliver dempsey": "1025034",
  "oliver florent": "998103",
  "oliver greeves": "1033071",
  "oliver hannaford": "1028485",
  "oliver hayes-brown": "1035199",
  "oliver henry": "1012860",
  "oliver hollands": "1023495",
  "oliver wiltshire": "1020881",
  "ollie lord": "1012881",
  "ollie murphy": "1027990",
  "ollie wines": "294318",
  "oscar adams": "1015515",
  "oscar allen": "1004385",
  "oscar berry": "1005152",
  "oscar mcdonald": "992472",
  "oscar ryan": "1027893",
  "oscar steene": "1022844",
  "oskar baker": "1008855",
  "oskar taylor": "1036379",
  "paddy dow": "1002256",
  "patrick cripps": "990704",
  "patrick dangerfield": "270917",
  "patrick lipinski": "1003130",
  "patrick retschko": "1032081",
  "patrick said": "1028514",
  "patrick snell": "1024685",
  "patrick voss": "1017754",
  "paul curtis": "1002947",
  "peter ladhams": "997142",
  "peter wright": "298289",
  "phoenix gothard": "1032042",
  "reece torrent": "1024187",
  "reef mcinnes": "1013278",
  "reilly o'brien": "297523",
  "reuben ginbey": "1023025",
  "rhett bazzo": "1017718",
  "rhyan mansell": "1008478",
  "rhylee west": "1006127",
  "rhys stanley": "280317",
  "rhys unwin": "1032023",
  "riak andrew": "1027659",
  "ricky mentha": "1029211",
  "riley bice": "1008224",
  "riley garcia": "1006533",
  "riley hamilton": "1029046",
  "riley hardeman": "1023625",
  "riley onley": "1033093",
  "riley thilthorpe": "1008384",
  "river stevens": "1031989",
  "roan steele": "1027501",
  "rob monahan": "1035129",
  "robert hansen jr": "1023144",
  "rory laird": "293222",
  "rory lobb": "990740",
  "rowan marshall": "992468",
  "ryan angwin": "1015777",
  "ryan byrnes": "1011994",
  "ryan gardner": "997501",
  "ryan lester": "291548",
  "ryan maric": "1029416",
  "ryda luke": "1037928",
  "ryley sanders": "1017939",
  "saad el-hawli": "1015919",
  "sam allen": "1033063",
  "sam banks": "1013197",
  "sam berry": "1012807",
  "sam butler": "1010708",
  "sam clohesy": "1013257",
  "sam cumming": "1027099",
  "sam darcy": "1017126",
  "sam davidson": "1036123",
  "sam de koning": "1009229",
  "sam draper": "1005577",
  "sam durham": "1015810",
  "sam flanders": "1009260",
  "sam grlj": "1036579",
  "sam lalor": "1028491",
  "sam marshall": "1028520",
  "sam powell-pepper": "993979",
  "sam sturt": "1013611",
  "sam swadling": "1037021",
  "sam switkowski": "992059",
  "sam taylor": "1005247",
  "sam walsh": "1006094",
  "sam wicks": "1006232",
  "samson ryan": "1012386",
  "sandy brock": "1013315",
  "scott pendlebury": "260257",
  "sean darcy": "998145",
  "seth campbell": "1023275",
  "shadeau brain": "1028105",
  "shai bolton": "993993",
  "shane mcadam": "298470",
  "shannon neale": "1016433",
  "shaun mannagh": "993878",
  "sid draper": "1022607",
  "steele sidebottom": "280965",
  "steely green": "1023056",
  "stephen coniglio": "291969",
  "steven may": "281085",
  "sullivan robey": "1043261",
  "tai hayes": "1040584",
  "taj hotton": "1032106",
  "talor byrne": "1036426",
  "tanner bruhn": "1012805",
  "taylor adams": "291776",
  "taylor goad": "1031506",
  "taylor walker": "280506",
  "tew jiath": "1032017",
  "thomas edwards": "1018323",
  "thomas matthews": "1034214",
  "tim english": "1004592",
  "tim kelly": "295898",
  "tim membrey": "294596",
  "tim taranto": "998172",
  "tobie travaglia": "1028538",
  "toby bedford": "1008139",
  "toby conway": "1017063",
  "toby greene": "295344",
  "tom sims": "1018996"
};
function loadAll(){
  fetch(API+'/players').then(function(r){return r.json();}).then(function(players){
    if(!Array.isArray(players))return;
    var m={},base={};
    players.forEach(function(p){
      if(!p.name)return;
      if(!p.champid){var _c=_extraChamp[p.name.toLowerCase()];if(_c){p.champid=_c;}else{return;}}
      var parts=p.name.split(' ');
      var fn=(parts[0]||'').toUpperCase();
      var ln=(parts[parts.length-1]||'').toUpperCase();
      var fnln=(fn[0]||'')+(ln[0]||'');
      var triple=fn[0]+(parts.length>2?(parts[1][0]||''):'')+(ln[0]||'');
      m[fnln]=m[fnln]||p;
      m[triple.toUpperCase()]=m[triple.toUpperCase()]||p;
      var lower=p.name.toLowerCase();
      base[lower]=p;
      base[ln.toLowerCase()]=base[ln.toLowerCase()]||p;
      base[(fn[0]+'. '+parts[parts.length-1]).toLowerCase()]=p;
    });
    _pmap=m;_pBaseByName=base;
  }).catch(function(){_pmap={};_pBaseByName={};});
  fetch(API+'/coaches').then(function(r){return r.json();}).then(function(c){_coaches=Array.isArray(c)?c:[];}).catch(function(){});
  fetch(API+'/scores').then(function(r){return r.json();}).then(function(s){_scores=Array.isArray(s)?s:[];}).catch(function(){});
}
loadAll();setInterval(loadAll,10000);

function headshotUrl(champid,season){return 'https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/'+(season||'2026014')+'/'+champid+'.png';}
function setHeadshot(img,champid){img.onerror=function(){this.onerror=function(){this.onerror=null;this.style.display='none';};this.src=headshotUrl(champid,'2025014');};img.src=headshotUrl(champid);}

function injectPlayerPhotos(){
  if(!_pmap)return;
  var els=document.querySelectorAll('div,span');
  for(var i=0;i<els.length;i++){
    var el=els[i];
    if(el.dataset.slyP||el.children.length)continue;
    var txt=(el.textContent||'').trim();
    if(!/^[A-Z]{2,3}$/.test(txt))continue;
    var w=el.clientWidth||0,h=el.clientHeight||0;
    if(w<8||w>100||h>100)continue;
    var player=_pmap[txt];
    if(!player||!player.champid)continue;
    var img=document.createElement('img');
    setHeadshot(img,player.champid);
    img.style.cssText='width:32px;height:32px;max-width:40px;max-height:40px;object-fit:cover;object-position:top center;border-radius:50%;display:block;background:#1f2937';
    img.onerror=function(){this.remove();};
    el.dataset.slyP='1';el.textContent='';el.appendChild(img);
  }
}

function injectHomePlayerPics(){
  if(!_pBaseByName)return;
  var els=document.querySelectorAll('div,span,p,td,li,a');
  for(var i=0;i<els.length;i++){
    var el=els[i];
    if(el.dataset.slyHP||el.children.length>1)continue;
    var txt=(el.textContent||'').trim();
    if(!txt||txt.length<3||txt.length>40)continue;
    var p=_pBaseByName[txt.toLowerCase()];
    if(!p||!p.champid)continue;
    if(el.querySelector('img[src*="ChampIDImages"]'))continue;
    el.dataset.slyHP='1';
    var img=document.createElement('img');
    setHeadshot(img,p.champid);img.alt=p.name;
    img.style.cssText='width:24px;height:24px;border-radius:50%;background:#1f2937;object-fit:cover;object-position:top center;vertical-align:middle;margin-right:6px;display:inline-block;flex-shrink:0';
    img.onerror=function(){this.remove();};
    el.insertBefore(img,el.firstChild);
  }
}


function fillPlayerAvatars(){
  if(!_pBaseByName||!_pmap)return;
  document.querySelectorAll('div,span').forEach(function(el){
    if(el.dataset.slyAV)return;
    if(el.children.length>0)return;
    var t=(el.textContent||'').trim();
    if(t.length>3)return;
    var w=el.clientWidth||0,h=el.clientHeight||0;
    if(w<14||w>72||h<14||h>72)return;
    if(el.closest('button,a,input,select,textarea'))return;
    var nameTxt='';
    var probe=el;
    for(var depth=0;depth<3&&probe;depth++){
      probe=probe.parentElement;
      if(!probe)break;
      var clone=probe.cloneNode(true);
      clone.querySelectorAll('img,button,select,input').forEach(function(n){n.remove();});
      var pTxt=(clone.textContent||'').trim();
      if(pTxt&&pTxt.length<=40&&pTxt.length>=3){nameTxt=pTxt;break;}
    }
    if(!nameTxt)return;
    var key=nameTxt.toLowerCase();
    var p=_pBaseByName[key];
    if(!p){
      var words=nameTxt.split(/\\s+/);
      if(words.length>1)p=_pBaseByName[words[words.length-1].toLowerCase()];
    }
    if(!p&&/^[A-Z]{2,3}$/.test(t))p=_pmap[t];
    if(!p||!p.champid)return;
    el.dataset.slyAV='1';
    var img=document.createElement('img');
    setHeadshot(img,p.champid);img.alt=p.name;
    img.style.cssText='width:32px;height:32px;max-width:40px;max-height:40px;object-fit:cover;object-position:top center;border-radius:50%;display:block;background:#1f2937';
    img.onerror=function(){this.remove();};
    el.style.borderRadius='50%';el.style.overflow='hidden';
    el.style.background='#1f2937';
    el.textContent='';el.appendChild(img);
  });
}

function stripJumperWrappers(){
  // Walk every team-logos img up 4 ancestors, strip white/light bg + padding + border-radius
  document.querySelectorAll('img[src*="team-logos"],img[src*="supabase"]').forEach(function(img){
    if(img.dataset.slyW)return;
    img.dataset.slyW='1';
    var p=img.parentElement;
    for(var i=0;i<4&&p;i++){
      var cs=getComputedStyle(p);
      var bg=cs.backgroundColor||'';
      // Detect white-ish bg: rgb(255, 255, 255), white, or rgba alpha > 0.5 with high RGB
      var m=bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
      var isLight=false;
      if(m){
        var r=+m[1],g=+m[2],b=+m[3],a=m[4]?+m[4]:1;
        if(a>0.3&&r>200&&g>200&&b>200)isLight=true;
      }
      if(isLight||bg==='white'||bg==='#fff'||bg==='#ffffff'){
        p.style.background='transparent';p.style.backgroundColor='transparent';
        p.style.padding='0';p.style.borderRadius='0';p.style.boxShadow='none';
      }
      p=p.parentElement;
    }
  });
}

function fixLadderRank(){
  // Target rank-badge cells directly (Lovable's ladder uses .rank-badge.rank-other)
  var badges=document.querySelectorAll('.rank-badge,[class*="rank-badge"]');
  if(!badges.length)return;
  var todo=[];
  badges.forEach(function(b){
    if(b.dataset.slyRK)return;
    var t=(b.textContent||'').trim();
    if(t==='undefined'||t==='Indefined'||t==='ndefined'||t===''){todo.push(b);}
  });
  if(!todo.length)return;
  todo.sort(function(a,b){
    var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    if(Math.abs(ra.top-rb.top)>4)return ra.top-rb.top;
    return ra.left-rb.left;
  });
  todo.forEach(function(c,i){
    c.dataset.slyRK='1';
    c.textContent=String(i+1);
    c.style.color='#fff';c.style.fontWeight='700';
  });
}

// The Fund: only inject if row has NO existing jumper anywhere nearby (parent, siblings, descendants)
function injectFundLogos(){
  if(!_coaches)return;
  // Find Fund scope (Who's Paid container or page header)
  var scopes=[];
  document.querySelectorAll('h1,h2,h3,h4,div,section').forEach(function(h){
    var t=(h.textContent||'').trim();
    if(/^(\\ud83d\\udcb0\\s*)?The Fund$|^Who['\\u2019]?s Paid$|^WHO['\\u2019]?S PAID$/i.test(t)){
      var p=h.parentElement||h;
      if(scopes.indexOf(p)<0)scopes.push(p);
    }
  });
  if(!scopes.length)return; // Don't inject anywhere if Fund page not visible
  _coaches.forEach(function(c){
    if(!c.logo_url||!c.name)return;
    scopes.forEach(function(scope){
      scope.querySelectorAll('div,li,tr,a').forEach(function(el){
        if(el.dataset.slyFL)return;
        // Skip if any ancestor was already processed (avoids cascading double-injection)
        var anc=el.parentElement;
        while(anc&&anc!==scope){if(anc.dataset.slyFL)return;anc=anc.parentElement;}
        if(el.children.length>20)return;
        var t=(el.textContent||'').trim();
        if(!t||t.length>200)return;
        if(t.indexOf(c.name)<0&&t.indexOf(c.team_name||'@@@@')<0)return;
        if(!/\\$\\d|Paid|Unpaid|paid|unpaid|owed/i.test(t))return;
        // Skip if THIS row OR direct parent has any jumper image
        if(el.querySelector('img[src*="team-logos"],img[src*="supabase"],img[data-sly-fund]'))return;
        if(el.parentElement&&el.parentElement.querySelector('img[src*="team-logos"],img[src*="supabase"],img[data-sly-fund]'))return;
        el.dataset.slyFL='1';
        var img=document.createElement('img');
        img.src=c.logo_url;img.alt=c.team_name||c.name;
        img.setAttribute('data-sly-fund','1');
        img.style.cssText='width:40px;height:50px;background:transparent;padding:0;object-fit:contain;flex-shrink:0;margin-right:10px;vertical-align:middle;display:inline-block';
        var first=el.firstElementChild||el.firstChild;
        if(first&&first.nodeType===1)el.insertBefore(img,first);
        else el.insertBefore(img,el.firstChild);
      });
    });
  });
}

// Match Day: only inject scoreboard ON the Match Day page (not Home preview)
function fillMatchDay(){
  if(!_scores||!_coaches)return;
  var byRound={};
  _scores.forEach(function(s){var r=s.round_number||s.round||'?';(byRound[r]=byRound[r]||[]).push(s);});
  var rounds=Object.keys(byRound).sort(function(a,b){return (+b)-(+a);});
  if(!rounds.length)return;
  var latest=rounds[0];
  var rs=byRound[latest]||[];
  rs.sort(function(a,b){return (b.points||0)-(a.points||0);});
  function buildBoard(){
    var h='<div class="sly-md-board"><div class="sly-md-title">\\ud83c\\udfc6 Round '+latest+' Scores</div>';
    rs.forEach(function(s){
      var c=_coaches.find(function(x){return x.id===s.coach_id;})||{};
      var lg=c.logo_url?'<img src="'+c.logo_url+'" alt="">':'';
      h+='<div class="sly-md-row"><div class="sly-md-team">'+lg+'<span>'+(c.team_name||('Coach '+s.coach_id))+'</span></div><div class="sly-md-pts">'+(s.points||0)+'</div></div>';
    });
    return h+'</div>';
  }
  // Detect if Match Day is current page: heading near top of viewport
  var onMatchDay=false;
  document.querySelectorAll('h1,h2,h3').forEach(function(h){
    var t=(h.textContent||'').trim();
    if(t==='Match Day'||t==='MATCH DAY'||/^Round \\d+ \\u2014 Match Day$/.test(t)){
      var rect=h.getBoundingClientRect();
      if(rect.top<300&&rect.top>-50)onMatchDay=true;
    }
  });
  // Always replace error-state placeholders (anywhere)
  var TRIGGERS=/^(Could not load (AFL )?scores?\\.?|Failed to load scores|No scores available|AFL scores unavailable)$/i;
  document.querySelectorAll('div,p,span').forEach(function(el){
    if(el.dataset.slyMD||el.children.length)return;
    var t=(el.textContent||'').trim();
    if(!TRIGGERS.test(t))return;
    el.dataset.slyMD='1';el.innerHTML=buildBoard();
  });
  // Inject after Match Day header only when on Match Day page
  if(onMatchDay){
    document.querySelectorAll('h1,h2,h3').forEach(function(h){
      var t=(h.textContent||'').trim();
      if(t!=='Match Day'&&t!=='MATCH DAY'&&!/^Round \\d+ \\u2014 Match Day$/.test(t))return;
      var parent=h.parentElement||h;
      if(parent.dataset.slyMDP||parent.querySelector('.sly-md-board'))return;
      parent.dataset.slyMDP='1';
      var div=document.createElement('div');div.innerHTML=buildBoard();
      h.insertAdjacentElement('afterend',div.firstChild);
    });
  }
}

function fixGold(){
  try{
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);
    var nodes=[],n;while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(function(tn){
      var t=tn.nodeValue||'';
      if(t.indexOf('$20')>=0&&!/\\$200/.test(t))tn.nodeValue=t.replace(/\\$20\\b/g,'$50');
    });
  }catch(e){}
  document.querySelectorAll('h1,h2,h3,h4,h5,div,span,p').forEach(function(el){
    var t=(el.textContent||'').trim();
    if(el.dataset.slyGD)return;
    if(!/\\bgold\\b/i.test(t))return;
    if(t.length>40)return;
    if(el.children.length>2)return;
    var parent=el.parentElement;
    if(!parent||parent.querySelector('.sly-gold-card'))return;
    el.dataset.slyGD='1';
    var card=document.createElement('div');
    card.className='sly-gold-card';
    card.innerHTML='<div class="sly-gold-h">\\u2b50 What $50 gets you (one-off, full season)</div><div class="sly-gold-li">Auto-draft at start of year so you never miss a pick</div><div class="sly-gold-li">Gold member badge on the ladder</div><div class="sly-gold-li">AI recommendations during the draft</div><div class="sly-gold-li">Best-for-team sort when picking your team</div><div class="sly-gold-li">Early access to new features</div><div class="sly-gold-divider"></div><div class="sly-gold-addon"><b>+ $5 / week</b> if you also want <b>Auto Team Selection</b> \\u2014 best team picked for you each round (skip the lineup grind)</div>';
    el.insertAdjacentElement('afterend',card);
  });
}

var _patchT=null;
function schedulePatch(){
  if(_patchT)return;
  _patchT=setTimeout(function(){
    _patchT=null;
    try{injectPlayerPhotos();}catch(e){}
    try{injectHomePlayerPics();}catch(e){}
    try{fillPlayerAvatars();}catch(e){}
    try{stripJumperWrappers();}catch(e){}
    try{fixLadderRank();}catch(e){}
    try{injectFundLogos();}catch(e){}
    try{fillMatchDay();}catch(e){}
    try{fixGold();}catch(e){}
  },300);
}
var _obs=new MutationObserver(schedulePatch);
function startObs(){
  if(!document.body)return setTimeout(startObs,200);
  _obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  schedulePatch();
}
startObs();setInterval(schedulePatch,2500);

var btn=document.createElement('button');btn.id='sly-extras-btn';btn.title='SLY Extras';btn.textContent='\\u2b50';
function placeBtn(){if(!document.body)return setTimeout(placeBtn,200);document.body.appendChild(btn);}
placeBtn();
var mel=document.createElement('div');mel.id='sly-extras-modal';
mel.innerHTML='<div id="sly-extras-inner"><div class="sly-mhead"><span class="sly-mtitle">\\u2b50 SLY Extras</span><button class="sly-mclose" id="sly-mc">\\u2715</button></div><div id="sly-extras-tabs"><button class="sly-tab active" data-tab="rosters">Rosters</button><button class="sly-tab" data-tab="activity">Activity</button><button class="sly-tab" data-tab="swaps">Swaps</button><button class="sly-tab" data-tab="pin">Change PIN</button></div><div id="sly-extras-body"><div style="text-align:center;padding:24px;color:#6b7280">Loading\\u2026</div></div></div>';
function placeModal(){if(!document.body)return setTimeout(placeModal,200);document.body.appendChild(mel);}
placeModal();
var modal=mel,body=mel.querySelector('#sly-extras-body');
function loading(){body.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280">Loading\\u2026</div>';}
function errMsg(m){body.innerHTML='<div style="text-align:center;padding:24px;color:#f87171">'+m+'</div>';}
function fetchJ(u){return fetch(u).then(function(r){return r.json();});}
function fmtDate(d){try{return new Date(d).toLocaleDateString('en-AU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return d||'';}}
function loadTab(tab){
  document.querySelectorAll('.sly-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===tab);});
  loading();
  if(tab==='rosters')loadRosters();else if(tab==='activity')loadActivity();else if(tab==='swaps')loadSwaps();else showPin();
}
function loadRosters(){
  Promise.all([fetchJ(API+'/coaches'),fetchJ(API+'/draft-picks')]).then(function(res){
    var coaches=res[0],picks=res[1];
    if(!Array.isArray(coaches)||!Array.isArray(picks)){errMsg('Bad data');return;}
    var html='';
    coaches.forEach(function(c){
      var cp=picks.filter(function(p){return p.coach_id===c.id;});
      var myMan=cp.find(function(p){return p.acquisition_type==='my_man';});
      var drafted=cp.filter(function(p){return p.acquisition_type==='draft';});
      var fas=cp.filter(function(p){return p.acquisition_type==='free_agent';});
      html+='<div class="sly-coach-card"><div class="sly-coach-head">';
      if(c.logo_url)html+='<img class="sly-coach-logo" src="'+c.logo_url+'" alt="">';
      else html+='<span style="font-size:28px">'+c.avatar_emoji+'</span>';
      html+='<div><div class="sly-coach-team">'+c.team_name+'</div>';
      html+='<div class="sly-coach-sub">'+c.name+(myMan?' \\xb7 \\ud83c\\udfaf My Man: '+myMan.player_name:'')+'</div></div></div><div>';
      if(myMan)html+='<span class="sly-pill myman">\\u2605 '+myMan.player_name+'</span>';
      drafted.forEach(function(p){html+='<span class="sly-pill">'+p.player_name+'</span>';});
      if(fas.length)html+='<span class="sly-pill fa">+'+fas.length+' FA</span>';
      html+='</div></div>';
    });
    body.innerHTML=html||'<div style="text-align:center;padding:24px;color:#6b7280">No data</div>';
  }).catch(function(){errMsg('Failed to load rosters');});
}
function loadActivity(){
  fetchJ(API+'/activity-feed').then(function(items){
    if(!items.length){body.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280">No activity yet</div>';return;}
    var html='';
    items.slice(0,60).forEach(function(a){
      var msg=a.message||a.description||'';
      if(!msg){try{var pl=JSON.parse(a.payload||'{}');msg=(pl.is_update?'\\ud83d\\udcc4 Updated':'\\u2705 Submitted')+' '+(pl.round_name||('R'+(pl.round||'?')))+' team';}catch(e){msg=a.event_type||'event';}}
      html+='<div class="sly-act-item"><div style="display:flex;align-items:center;gap:8px">';
      if(a.logo_url||a.actor_logo_url)html+='<img src="'+(a.logo_url||a.actor_logo_url)+'" style="width:24px;height:24px;border-radius:3px;object-fit:cover">';
      else if(a.avatar_emoji)html+='<span>'+a.avatar_emoji+'</span>';
      html+='<span style="color:#e5e7eb;font-weight:600;font-size:13px">'+(a.team_name||a.actor_name||'')+'</span></div>';
      html+='<div class="sly-act-msg">'+msg+'</div><div class="sly-act-time">'+fmtDate(a.created_at)+'</div></div>';
    });
    body.innerHTML=html;
  }).catch(function(){errMsg('Failed to load activity');});
}
function loadSwaps(){
  fetchJ(API+'/swap-requests').then(function(swaps){
    if(!swaps.length){body.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280">No emergency swaps recorded</div>';return;}
    var html='';
    swaps.forEach(function(s){
      var done=s.status==='completed';
      html+='<div class="sly-swap-item"><div style="display:flex;align-items:center;justify-content:space-between">';
      html+='<span style="color:#fff;font-size:13px;font-weight:600">'+(s.coach_name||'Coach '+s.coach_id)+' \\u2013 '+(s.team_name||'')+'</span>';
      html+=(done?'<span class="sly-badge-done">done</span>':'<span class="sly-badge-pend">pending</span>')+'</div>';
      html+='<div style="color:#9ca3af;font-size:12px;margin-top:3px">R'+(s.round||'?')+' \\xb7 OUT: '+(s.suggested_dnp_slot||'?')+' \\u2192 IN: '+(s.suggested_emergency_slot||'?')+'</div>';
      if(s.comment)html+='<div style="color:#d1d5db;font-size:12px;margin-top:4px;font-style:italic">"'+s.comment+'"</div>';
      html+='<div class="sly-act-time">'+fmtDate(s.created_at)+'</div></div>';
    });
    body.innerHTML=html;
  }).catch(function(){errMsg('Failed to load swaps');});
}
function showPin(){
  body.innerHTML='<p style="color:#9ca3af;font-size:13px;margin-bottom:14px">Change your coach PIN.</p><select id="sly-pc" class="sly-input"><option value="">Select your coach\\u2026</option></select><input id="sly-pp" type="password" placeholder="Current PIN" class="sly-input"><input id="sly-pn" type="password" placeholder="New PIN (min 4 digits)" class="sly-input"><input id="sly-pk" type="password" placeholder="Confirm new PIN" class="sly-input"><button id="sly-ps" class="sly-btn">Change PIN</button><div id="sly-pm"></div>';
  fetchJ(API+'/coaches').then(function(coaches){
    var sel=document.getElementById('sly-pc');
    coaches.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name+' \\u2013 '+c.team_name;sel.appendChild(o);});
  });
  document.getElementById('sly-ps').addEventListener('click',function(){
    var id=document.getElementById('sly-pc').value;
    var cur=document.getElementById('sly-pp').value;
    var np=document.getElementById('sly-pn').value;
    var nc=document.getElementById('sly-pk').value;
    var msg=document.getElementById('sly-pm');
    msg.className='';msg.textContent='';
    if(!id||!cur||!np||!nc){msg.className='sly-err';msg.textContent='All fields required';return;}
    if(np!==nc){msg.className='sly-err';msg.textContent="New PINs don't match";return;}
    if(np.length<3){msg.className='sly-err';msg.textContent='PIN too short';return;}
    fetch(API+'/coaches/'+id+'/pin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_pin:cur,new_pin:np})})
      .then(function(r){return r.json();}).then(function(d){
        if(d.ok){msg.className='sly-ok';msg.textContent='PIN changed \\u2713';}
        else{msg.className='sly-err';msg.textContent=d.error||'Failed';}
      }).catch(function(){msg.className='sly-err';msg.textContent='Request failed';});
  });
}
btn.addEventListener('click',function(){modal.classList.add('open');loadTab('rosters');});
mel.querySelector('#sly-mc').addEventListener('click',function(){modal.classList.remove('open');});
mel.addEventListener('click',function(e){if(e.target===modal)modal.classList.remove('open');});
mel.querySelectorAll('.sly-tab').forEach(function(t){t.addEventListener('click',function(){loadTab(t.dataset.tab);});});

})();
</script>`;

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const p = u.pathname;

    // Block service worker registration (we want fresh HTML always)
    if (p.includes('service-worker') || (p.includes('sw') && p.endsWith('.js'))) {
      return new Response('', { status: 404 });
    }

    // CORS preflight
    if (p.startsWith('/api/') && req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }

    // v4 backend bridges (kept for any v4-style callers)
    if (p === '/api/login' && req.method === 'POST') {
      try {
        const bd = await req.json().catch(() => ({}));
        const cid = bd.coach_id || bd.coachId || bd.id;
        const pin = String(bd.pin || bd.password || '');
        if (!cid || !pin) return new Response(JSON.stringify({ ok: false, error: 'Missing coach_id or pin' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        const vr = await fetch('https://sly-api.pgallivan.workers.dev/api/coaches/' + cid + '/pin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_pin: pin, new_pin: pin }) });
        const vd = await vr.json();
        if (vd.ok) {
          const cs = await (await fetch('https://sly-api.pgallivan.workers.dev/api/coaches')).json();
          const coach = Array.isArray(cs) ? cs.find(c => String(c.id) === String(cid)) : null;
          return new Response(JSON.stringify({ ok: true, coach }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        return new Response(JSON.stringify({ ok: false, error: vd.error || 'Invalid PIN' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if ((p === '/api/banter' || p === '/api/chat') && (req.method === 'GET' || req.method === 'POST')) {
      const r = await fetch('https://sly-api.pgallivan.workers.dev/api/messages' + u.search, { method: req.method, headers: req.headers, body: req.method === 'POST' ? req.body : undefined });
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (p.startsWith('/api/v4/')) {
      const inner = p.replace('/api/v4', '/api');
      return fetch('https://sly-api.pgallivan.workers.dev' + inner + u.search, { method: req.method, headers: req.headers, body: req.body });
    }

    // TRUE REVERSE PROXY: fetch live from mate's .online for everything else
    const upstreamUrl = 'https://superleagueyeah.online' + p + u.search;
    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.delete('host');
    upstreamHeaders.delete('cf-connecting-ip');
    upstreamHeaders.delete('cf-ipcountry');
    upstreamHeaders.delete('cf-ray');
    upstreamHeaders.delete('cf-visitor');
    upstreamHeaders.set('host', 'superleagueyeah.online');

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: ['GET','HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual'
    });

    const ct = upstream.headers.get('content-type') || '';
    const newHeaders = new Headers(upstream.headers);
    // Don't pass through HSTS or upgrade headers that lock host to .online
    newHeaders.delete('strict-transport-security');
    newHeaders.delete('content-security-policy');
    newHeaders.delete('content-encoding');
    newHeaders.delete('content-length');

    // Inject patch only into HTML responses
    if (ct.includes('text/html') && upstream.status === 200) {
      let html = await upstream.text();
      html = html.replace('</body>', PATCH + '</body>');
      newHeaders.set('content-type', 'text/html; charset=utf-8');
      newHeaders.set('cache-control', 'no-cache, no-store, must-revalidate, max-age=0');
      return new Response(html, { status: upstream.status, headers: newHeaders });
    }

    return new Response(upstream.body, { status: upstream.status, headers: newHeaders });
  }
};