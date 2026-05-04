// sly-app v5.19 — standalone serve + Squiggle proxy + Fund tab patches
const VERSION = 'v5.20';
// Updated 2026-05-04: v5.14 + Rules tab + every-player tracker; v5.13: v5.8 fix Home status label for 'open' rounds; v5.7 fix round selection
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const p = u.pathname;
    if (p.includes('service-worker') || (p.includes('sw') && p.endsWith('.js'))) return new Response('', {status:404});
    if (p.startsWith('/api/') && req.method === 'OPTIONS') return new Response(null, {status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});

    if (p === '/_version') {
      return new Response(JSON.stringify({v: VERSION,t:Date.now()}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache, no-store, must-revalidate'}});
    }
    if (p === '/api/login' && req.method === 'POST') {
      try {
        const bd = await req.json().catch(() => ({}));
        const cid = bd.coach_id || bd.coachId || bd.id;
        const pin = String(bd.pin || bd.password || '');
        if (!cid || !pin) return new Response(JSON.stringify({ok:false,error:'Missing coach_id or pin'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const vr = await fetch('https://sly-api.luckdragon.io/api/coaches/'+cid+'/pin', {method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({current_pin:pin, new_pin:pin})});
        const vd = await vr.json();
        if (vd.ok) {
          const cs = await (await fetch('https://sly-api.luckdragon.io/api/coaches')).json();
          const coach = Array.isArray(cs) ? cs.find(c => String(c.id) === String(cid)) : null;
          return new Response(JSON.stringify({ok:true, coach}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        return new Response(JSON.stringify({ok:false,error:vd.error||'Invalid PIN'}), {status:401, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      } catch (e) { return new Response(JSON.stringify({ok:false,error:String(e)}), {status:500}); }
    }

    if (p === '/api/squiggle') {
      const q = u.searchParams;
      const url = `https://api.squiggle.com.au/?q=games;year=${q.get('year')||'2026'};round=${q.get('round')||''}`;
      try {
        const r = await fetch(url, {headers:{'User-Agent':'SLY-Fantasy-AFL/1.0 (sly-app worker; paddy@luckdragon.io)'}});
        const text = await r.text();
        return new Response(text, {status:r.status, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=60'}});
      } catch (e) {
        return new Response(JSON.stringify({error:String(e)}), {status:502, headers:{'Content-Type':'application/json'}});
      }
    }

    if ((p === '/api/banter' || p === '/api/chat') && (req.method === 'GET' || req.method === 'POST')) {
      const r = await fetch('https://sly-api.luckdragon.io/api/messages'+u.search, {method:req.method, headers:req.headers, body:req.method==='POST'?req.body:undefined});
      return new Response(await r.text(), {status:r.status, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    if (p.startsWith('/api/')) {
      return fetch('https://sly-api.luckdragon.io'+p+u.search, {method:req.method, headers:req.headers, body:req.body});
    }

    let html = await env.SLY_STATIC.get('standalone-index.html');
    if (!html) return new Response('Standalone HTML not in KV', {status:500});
    // Strip any HTTP response header lines accidentally stored at top of KV value
    if (html.startsWith('HTTP ')) {
      const bodyStart = html.indexOf('<!');
      if (bodyStart > 0) html = html.slice(bodyStart);
    }

    // === Fund tab patches (applied at serve time) ===
    // Patch 1: Add OUTSTANDING column to fund summary card
    html = html.replace(
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem">\n                <div><div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.2rem">COLLECTED</div><div id="fundCollected" style="font-size:2rem;font-weight:800;color:var(--accent2)">$0</div></div>\n                <div style="text-align:right"><div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.2rem">BALANCE</div><div id="fundBalance" style="font-size:2rem;font-weight:800;color:var(--accent)">$0</div></div>\n            </div>',
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem"><div><div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.2rem">COLLECTED</div><div id="fundCollected" style="font-size:1.8rem;font-weight:800;color:var(--accent2)">$0</div></div><div style="text-align:center"><div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.2rem">OUTSTANDING</div><div id="fundOutstanding" style="font-size:1.8rem;font-weight:800;color:#e74c3c">$800</div></div><div style="text-align:right"><div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.2rem">BALANCE</div><div id="fundBalance" style="font-size:1.8rem;font-weight:800;color:var(--accent)">$0</div></div></div>'
    );
    // Patch 2: Update loadSlushFund to compute and set OUTSTANDING
    html = html.replace(
      "document.getElementById('fundProgressLabel').textContent = `${paidCount} of ${pList.length} paid`;",
      "document.getElementById('fundProgressLabel').textContent = `${paidCount} of ${pList.length} paid`;const _outEl=document.getElementById('fundOutstanding');if(_outEl)_outEl.textContent='$$'+(total-collected);"
    );
    // Patch 3: Clear fixtures cache after recalc so scores update
    html = html.replace(
      "    renderFixtures();\n    renderStats();\n    loadAdminScores();",
      "    _slyFixturesCache={};\n    renderFixtures();\n    renderStats();\n    loadAdminScores();"
    );
    // Patch 4: Fix loadHomePage round selection — 'upcoming' never matches, should be 'open'
    html = html.replace(
      "allRounds.find(r => r.status === 'upcoming')",
      "allRounds.find(r => r.status === 'open')"
    );
    // Patch 5: Fix Home status label — 'open' round shows '📝 Open' not '🔒 Locked'
    html = html.replace(
      "liveRound.status === 'completed' ? '\\u2705 Completed' : '\\u{1F512} Locked'",
      "liveRound.status === 'completed' ? '\\u2705 Completed' : liveRound.status === 'open' ? '\\u{1F4DD} Open' : '\\u{1F512} Locked'"
    );
    // Patch 6: Fix chat text in light mode — targeted CSS injection (not global --text override,
    // which would break dark-bg cards like trophy cabinet that use hardcoded #16213e backgrounds)
    html = html.replace(
      '</style>',
      'body.light-mode #pageChat .chat-msg-text{color:#1a1a2e!important}body.light-mode #pageChat .chat-msg-name{color:#1a1a2e!important}body.light-mode #pageChat .chat-msg-time{color:#666!important}</style>'
    );
    // Patch 7: Autopick toggle — $5 warning + updated description
    html = html.replace(
      'Automatically optimises your lineup before each round',
      "Automatically picks your best available team if you haven't submitted before lockout — costs $5, you'll owe SLY."
    );
    html = html.replace(
      "async function toggleAutoPick(enabled) {\n      const statusEl = document.getElementById('autoPickStatus');\n      statusEl.style.display = 'block';\n      statusEl.textContent = enabled ? 'Enabling auto-pick...' : 'Disabling auto-pick...';\n      if (!currentCoach) { statusEl.textContent = 'Log in first'; statusEl.style.color='#e74c3c'; return; }\n      try {\n        await apiFetch('/api/coaches/auto_pick', { method:'PATCH', body: JSON.stringify({ coach_id: currentCoach.id, enabled }) });\n        statusEl.textContent = enabled ? '✅ Auto-pick ON — your team will be optimised before each round (form-weighted, all 11 slots)' : 'Auto-pick OFF — set your lineup manually';\n        statusEl.style.color = enabled ? 'var(--accent)' : 'var(--text-secondary)';\n      } catch(e) {\n        statusEl.textContent = 'Failed to update: ' + e.message;\n        statusEl.style.color = '#e74c3c';\n      }\n    }",
      'async function toggleAutoPick(enabled) {\n      const statusEl = document.getElementById(\'autoPickStatus\');\n      if (!currentCoach) { statusEl.style.display=\'block\'; statusEl.textContent=\'Log in first\'; statusEl.style.color=\'#e74c3c\'; return; }\n      if (enabled) {\n        const ok = confirm("Auto pick will select your best available team if you haven\'t submitted before lockout.\\n\\nYou\'ll owe SLY $5 \\u2014 this will show on the Autopick Tab for everyone to see. Proceed?");\n        if (!ok) { const t=document.getElementById(\'autoPickToggle\'); if(t) t.checked=false; return; }\n      }\n      statusEl.style.display=\'block\';\n      statusEl.textContent = enabled ? \'Enabling auto-pick...\' : \'Disabling auto-pick...\';\n      try {\n        await apiFetch(\'/api/coaches/auto_pick\', { method:\'PATCH\', body: JSON.stringify({ coach_id: currentCoach.id, enabled }) });\n        statusEl.textContent = enabled ? "✅ Auto-pick ON \\u2014 you\'ll owe SLY $5 if this fires." : \'Auto-pick OFF\';\n        statusEl.style.color = enabled ? \'var(--accent)\' : \'var(--text-secondary)\';\n      } catch(e) {\n        statusEl.textContent = \'Failed to update: \' + e.message;\n        statusEl.style.color = \'#e74c3c\';\n      }\n    }'
    );
    // Patch 8: Autopick Tab section in Fund tab + JS functions
    html = html.replace(
      '<div id="fundPayStatus" style="margin-top:0.75rem;font-size:0.78rem;color:var(--accent)"></div>\n        </div>\n        <div style="background:linear-gradient(135deg,rgba(232,160,0,0.12),rgba(245,197,24,0.06));',
      '<div id="fundPayStatus" style="margin-top:0.75rem;font-size:0.78rem;color:var(--accent)"></div>\n        </div>\n        <div style="background:var(--bg-card);border-radius:16px;padding:1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">\n            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem"><span style="font-size:1rem">🤖</span><span style="font-size:0.85rem;font-weight:700;color:var(--text-primary)">AUTOPICK TAB</span></div>\n            <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem">Coaches who\'ve enabled autopick. $5 owed to SLY each time it fires.</p>\n            <div id="autopickTabGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem"></div>\n            <div id="autopickTabStatus" style="margin-top:0.5rem;font-size:0.78rem;color:var(--accent)"></div>\n        </div>\n        <div style="background:linear-gradient(135deg,rgba(232,160,0,0.12),rgba(245,197,24,0.06)); '
    );
    html = html.replace(
      "        renderFundGoldGrid();\n        } catch(e) { console.error('loadSlushFund error', ",
      "        renderFundGoldGrid();\n        loadAutopickTab();\n        } catch(e) { console.error('loadSlushFund error', "
    );
    html = html.replace(
      'async function loadAutoPickStatus() {',
      'async function loadAutopickTab(){\n      try{\n        const data=await apiFetch(\'/api/autopick-status\');\n        const grid=document.getElementById(\'autopickTabGrid\');\n        if(!grid)return;\n        const isAdm=currentCoach&&currentCoach.id===1;\n        const list=Array.isArray(data)?data:[];\n        if(!list.length){\n          grid.innerHTML=\'<div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;padding:0.75rem 0;grid-column:1/-1">No coaches have enabled autopick yet</div>\';\n          return;\n        }\n        grid.innerHTML=\'\';\n        list.forEach(c=>{\n          const card=document.createElement(\'div\');\n          card.style.cssText=\'display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.65rem;border-radius:10px;border:2px solid \'+(c.autopick_paid?\'var(--accent)\':\'#e74c3c\')+\';background:var(--bg-input);\'+(isAdm?\'cursor:pointer\':\'\');\n          card.innerHTML=\'<span style="font-size:1rem">\'+(c.autopick_paid?\'✅\':\'⏳\')+\'</span>\'\n            +\'<div style="flex:1;min-width:0">\'\n            +\'<div style="font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\'+c.name+\'</div>\'\n            +\'<div style="font-size:0.68rem;color:\'+(c.autopick_paid?\'var(--accent)\':\'#e74c3c\')+\'">\'+(c.autopick_paid?\'Paid $5\':\'Owes $5\')+\'</div>\'\n            +\'</div>\';\n          if(isAdm)card.onclick=()=>toggleAutopickPaid(c.coach_id,!c.autopick_paid,c.name);\n          grid.appendChild(card);\n        });\n      }catch(e){console.error(\'loadAutopickTab\',e);}\n    }\n    async function toggleAutopickPaid(coachId,newPaid,name){\n      const s=document.getElementById(\'autopickTabStatus\');\n      if(s)s.textContent=\'Updating \'+name+\'...\';\n      try{\n        await apiFetch(\'/api/payments/\'+coachId,{method:\'PATCH\',body:JSON.stringify({autopick_paid:newPaid?1:0})});\n        await loadAutopickTab();\n        if(s)s.textContent=\'\';\n      }catch(e){if(s)s.textContent=\'Error saving\';}\n    }\n    async function loadAutoPickStatus() {'
    );
    // Patch 9: Draft Board blurb + friendlier encrypted chat UX
    html = html.replace(
      '<div id="draftPanelHistory">\n      <div class="draft-filter" id="draftFilter"></div>\n      <div id="draftBoard"></div>\n    </div>',
      '<div id="draftPanelHistory">\n      <div style="background:var(--bg-card);border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.85rem;border:1px solid var(--border);font-size:0.8rem;color:var(--text-secondary);line-height:1.6"><strong style="color:var(--text-primary)">📋 Pre-season draft board</strong><br>Snake draft completed before Round 1 — 22 rounds, 16 coaches, 352 picks total. Round 1 went picks 1–16, Round 2 reversed (16–1), alternating each round. Your picks are <span style="color:var(--accent);font-weight:600">highlighted green</span>. Tap <strong>🔍 Player Pool</strong> to browse stats, or <strong>🎯 Live Draft</strong> to run a new draft.</div>\n      <div class="draft-filter" id="draftFilter"></div>\n      <div id="draftBoard"></div>\n    </div>'
    );
    html = html.replace(
      "return '🔒 (encrypted — not for you)';",
      "return '🔒 Private message';"
    );
    html = html.replace(
      '<input type="checkbox" id="ncGroupEnc"> 🔒 End-to-end encrypted',
      '<input type="checkbox" id="ncGroupEnc"> 🔒 Make this chat private'
    );
    // Patch 10: Rules nav button — insert before Match Day
    html = html.replace(
      '<div class="nav-item" data-page="pageMatchDay" onclick="switchPage(\'pageMatchDay\', this)">',
      '<div class="nav-item" data-page="pageRules" onclick="switchPage(\'pageRules\', this); if(typeof loadRulesTab===\'function\')loadRulesTab()">\n                <span class="nav-icon">\u{1F4CB}</span>\n                <span>Rules</span>\n            </div>\n            <div class="nav-item" data-page="pageMatchDay" onclick="switchPage(\'pageMatchDay\', this)">'
    );
    // Patch 11: Rules page content — inject before <!-- NAV --> nav block
    const RULES_PAGE = `<div id="pageRules" class="page">
        <div class="section-title">\u{1F4CB} League Rules</div>
        <div style="background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(0,255,136,0.05));border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary)">\u{1F4B0} ENTRY & PRIZES</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6">• Buy-in: <strong style="color:var(--accent2)">$50</strong> per coach. SLY Gold: <strong style="color:#e8a000">+$50 ($100 total)</strong> for the badge + bigger Day of Days party kitty.<br>• Pot funds the <strong>Day of Days party</strong> at season's end.</div>
        </div>
        <div style="background:var(--bg-card);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary)">\u{1F3C6} HOW IT WORKS</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6">• 16 coaches, snake draft pre-season — each coach owns a squad of ~22 players.<br>• Each round: pick <strong>11 starters</strong> from your squad before lockout (Thursday 8:30am AEST).<br>• Score = sum of starters' AFL Fantasy points for the round.<br>• H2H ladder — win/loss against your fixture opponent that round.</div>
        </div>
        <div style="background:linear-gradient(135deg,rgba(232,160,0,0.12),rgba(245,197,24,0.06));border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid rgba(232,160,0,0.35)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;color:#e8a000">⚠️ THE EVERY-PLAYER RULE</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6">By the end of the home & away season, every coach must have started <strong style="color:var(--text-primary)">every player on their squad at least once</strong>. Track your compliance below — unused players are flagged on your Pick tab.</div>
        </div>
        <div style="background:var(--bg-card);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary)">\u{1F916} AUTOPICK</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6">Optional opt-in. If you don't submit before lockout, autopick fills your team with your best available players. <strong style="color:#e74c3c">Costs $5</strong> each time it fires — owed to SLY, public on the Fund tab.</div>
        </div>
        <div style="background:var(--bg-card);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary)">\u{1F501} TRADES & DRAFT</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6">• Pre-season snake draft (22 rounds, 16 coaches).<br>• In-season trades: propose, recipient accepts/rejects — see Trades tab.</div>
        </div>
        <div style="background:var(--bg-card);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem;color:var(--text-primary)">\u{1F4CA} EVERY-PLAYER COMPLIANCE</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem">Squad players who've been started at least once this season.</div>
            <div id="rulesUsageList" style="display:flex;flex-direction:column;gap:0.5rem">
                <div style="font-size:0.78rem;color:var(--text-secondary);text-align:center;padding:0.5rem 0">Loading…</div>
            </div>
        </div>
    </div>`;
    html = html.replace('<!-- NAV -->', RULES_PAGE + '\n    <!-- NAV -->');
    // Patch 12: Pick tab — usage widget above slots
    html = html.replace(
      '<div class="pick-slots" id="pickSlotsContainer"></div>',
      '<div id="pickUsageWidget" style="background:var(--bg-card);border-radius:12px;padding:0.7rem 0.9rem;margin-bottom:0.75rem;border:1px solid var(--border);font-size:0.78rem;color:var(--text-secondary);display:none"></div>\n        <div class="pick-slots" id="pickSlotsContainer"></div>'
    );
    // Patch 13: JS — loadRulesTab + loadPickUsageWidget. Inject before loadAutoPickStatus.
    const RULES_JS = `async function loadRulesTab(){
      try{
        const data=await apiFetch('/api/usage-tracker');
        const list=document.getElementById('rulesUsageList');
        if(!list||!Array.isArray(data))return;
        const meId=currentCoach&&currentCoach.id;
        list.innerHTML='';
        data.forEach((c,idx)=>{
          const row=document.createElement('div');
          const isMe=meId===c.coach_id;
          row.style.cssText='background:var(--bg-input);border-radius:10px;padding:0.55rem 0.75rem;border:1px solid '+(isMe?'var(--accent)':'var(--border)')+';cursor:pointer';
          const pct=c.compliance_pct;
          const barColor=pct>=95?'var(--accent)':pct>=80?'#f5c518':'#e74c3c';
          row.innerHTML='<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem">'
            +'<span style="font-size:0.78rem;color:var(--text-secondary);width:1.2rem">#'+(idx+1)+'</span>'
            +'<span style="font-size:0.95rem">'+(c.avatar_emoji||'\u{1F3C8}')+'</span>'
            +'<span style="flex:1;font-size:0.82rem;font-weight:600;color:var(--text-primary)">'+c.coach_name+(isMe?' (you)':'')+'</span>'
            +'<span style="font-size:0.78rem;font-weight:700;color:'+barColor+'">'+c.used_count+'/'+c.squad_size+' · '+pct+'%</span>'
            +'</div>'
            +'<div style="background:var(--bg-card);border-radius:6px;height:6px;overflow:hidden"><div style="height:100%;background:'+barColor+';width:'+pct+'%"></div></div>';
          const detail=document.createElement('div');
          detail.style.cssText='display:none;margin-top:0.5rem;font-size:0.74rem;color:var(--text-secondary);line-height:1.5';
          if(c.unused_count===0){detail.innerHTML='<span style="color:var(--accent)">✅ All players used</span>';}
          else{detail.innerHTML='<strong style="color:var(--text-primary)">Unused ('+c.unused_count+'):</strong> '+c.unused.map(p=>p.name).join(', ');}
          row.appendChild(detail);
          row.onclick=()=>{detail.style.display=detail.style.display==='none'?'block':'none';};
          list.appendChild(row);
        });
      }catch(e){console.error('loadRulesTab',e);}
    }
    async function loadPickUsageWidget(){
      try{
        if(!currentCoach)return;
        const w=document.getElementById('pickUsageWidget');
        if(!w)return;
        const data=await apiFetch('/api/usage-tracker?coach_id='+currentCoach.id);
        const me=Array.isArray(data)?data[0]:null;
        if(!me){w.style.display='none';return;}
        w.style.display='block';
        const pct=me.compliance_pct;
        const color=pct>=95?'var(--accent)':pct>=80?'#f5c518':'#e74c3c';
        let html='<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem"><span style="font-size:0.85rem">\u{1F4CB}</span><strong style="color:var(--text-primary);font-size:0.78rem">Every-player rule</strong><span style="margin-left:auto;font-weight:700;color:'+color+';font-size:0.78rem">'+me.used_count+'/'+me.squad_size+' · '+pct+'%</span></div>';
        if(me.unused_count===0){html+='<div style="color:var(--accent);font-size:0.74rem">✅ You\\'ve started every player at least once.</div>';}
        else{html+='<div style="font-size:0.74rem;line-height:1.5"><strong style="color:var(--text-primary)">Still need to start:</strong> '+me.unused.map(p=>p.name).join(', ')+'</div>';}
        w.innerHTML=html;
      }catch(e){console.error('loadPickUsageWidget',e);}
    }
    /* Hook switchPage so widget refreshes when entering Pick tab */
    (function(){
      if(window.__sly_switchPage_hooked)return;
      const orig=window.switchPage;
      if(typeof orig!=='function')return;
      window.switchPage=function(pid,el){
        const r=orig.apply(this,arguments);
        try{ if(pid==='pagePickTeam')loadPickUsageWidget(); }catch(e){}
        return r;
      };
      window.__sly_switchPage_hooked=true;
    })();
    async function loadAutoPickStatus() {`;
    html = html.replace('async function loadAutoPickStatus() {', RULES_JS);

    // Patch 14: Fix invisible jumpers — mix-blend-mode:multiply turned dark logos invisible on dark cards.
    // Cards use hardcoded var(--card) which stays dark even in light mode, so multiply broke logos everywhere.
    html = html.replace(
      'img[src*="team-logos"],img[src*="hzkodmxrranessgbjjjl.supabase"]{\n  background:transparent!important;\n  filter:drop-shadow(0 1px 4px rgba(0,0,0,0.55))!important;\n  mix-blend-mode:multiply!important;\n}',
      'img[src*="team-logos"],img[src*="hzkodmxrranessgbjjjl.supabase"]{background:transparent!important;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.55))!important}'
    );
    // Patch 14b: also nuke any inline mix-blend on the served HTML in case styles repeat in scoped scopes
    html = html.replace(/mix-blend-mode:\s*multiply\s*!important;?/g, '');
    // Patch 15: Auto-refresh — version poll. Browser checks /_version every 90s
    // and reloads if a new sly-app version is live, so users don't see stale UI after a deploy.
    html = html.replace(
      '</head>',
      `<meta name="sly-app-version" content="${VERSION}">\n<script>(function(){var V="${VERSION}";var notified=false;function check(){fetch("/_version?n="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d&&d.v&&d.v!==V&&!notified){notified=true;console.log("[sly-app] new version",d.v,"available, reloading...");setTimeout(function(){location.reload(true)},500)}}).catch(function(){})}setInterval(check,90000);setTimeout(check,5000);})();</script></head>`
    );
    // Patch 16: Add crossorigin="anonymous" to coach-logo-img imgs.
    // Without this, the canvas in SLY-FIX v6 is tainted (browser cache reuses no-cors response),
    // so the white-strip flood-fill silently fails and white rectangles persist.
    html = html.replace(
      '`<img src="${coach.logo_url}" class="coach-logo-img"',
      '`<img src="${coach.logo_url}" crossorigin="anonymous" class="coach-logo-img"'
    );
    // Patch 17: SLY-FIX v6's white-jersey guard bails on logos with >45% white pixels.
    // Coach-uploaded logos commonly sit on a white background that's 60-90% of the image,
    // so the guard refused to strip them and white rectangles persisted.
    // The flood-fill that follows the guard is corner-only and never touches interior content,
    // so it's safe to run unconditionally. Replace the guard with a near-100% threshold.
    html = html.replace(
      "if(wCnt/(px.length/4)>0.45){ resolve(null); return; }",
      "if(wCnt/(px.length/4)>0.985){ resolve(null); return; }"
    );
    // === End patches ===

    return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate, max-age=0'}});
  }
};
