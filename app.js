import htm from 'https://unpkg.com/htm@3.1.1/dist/htm.module.js';
const html = htm.bind(React.createElement);
const { useState, useEffect, useMemo } = React;

// -------- Utilities --------
const rng = (min=0,max=1)=> Math.random()*(max-min)+min;
const irand = (min,max)=> Math.floor(rng(min,max+1));
const pick = (arr)=> arr[irand(0, arr.length-1)];
const clamp = (v,lo,hi)=> Math.max(lo, Math.min(hi, v));
const uid = (()=>{ let n=1; return ()=> n++; })();

// -------- Data --------
const FIRST = ["Aiden","Noah","Liam","Mason","Elijah","Logan","James","Ethan","Oliver","Jackson","Carter","Wyatt","Grayson","Lucas","Levi","Benjamin","Sebastian","Owen","Leo","Caleb","Anthony","Dylan","Nathan","Xavier","Evan","Miles","Julian","Dominic","Chase","Jaxon","Isaiah","Hunter","Jordan","Cooper","Ian","Austin","Brody","Kai","Rowan","Micah"];
const LAST  = ["Reeves","Sanders","Cole","Wright","Parker","Scott","Hill","Bailey","Brooks","Hayes","Morrison","Carson","Baker","Foster","Crawford","Sutton","Griffin","Hughes","Bishop","Hale","Boone","Reed","James","Howard","Grant","Barrett","Fowler","Greene","Blair","Vasquez","Shaw","Watts","Nolan","Keller","Rhodes","Page","Warren","West","Poole","Santiago"];

const POSITIONS = ["QB","RB","WR","TE","LT","LG","C","RG","RT","EDGE","IDL","LB","CB","S","K","P"];
const POS_SLOTS = { QB:1,RB:2,WR:3,TE:1,LT:1,LG:1,C:1,RG:1,RT:1, EDGE:2,IDL:2,LB:2,CB:2,S:2,K:1,P:1 };
const POSITION_VALUE = { QB:5,WR:3,EDGE:3,CB:3,LT:3, RB:2,TE:2,IDL:2,LB:2,S:2, LG:1,C:1,RG:1,RT:1, K:0.5,P:0.3 };

const PLAYER_STYLES = {
  QB:["Pocket","FieldGeneral","Scrambler"],
  RB:["Power","Elusive","Receiving"],
  WR:["DeepThreat","Possession","Slot"],
  TE:["Vertical","Blocking","Balanced"],
  EDGE:["Speed","Power"],
  IDL:["RunStopper","PassRush"],
  LB:["Coverage","RunStopper","Blitzer"],
  CB:["Man","Zone","Press"],
  S:["Box","Deep","Hybrid"],
};

const COACH_SCHEMES = {
  offense:["AirRaid","WestCoast","PowerRun","ZoneRun","Balanced"],
  defense:["ManBlitz","ZoneBlitz","Cover2","Cover3","Balanced"],
};

const TEAM_NAMES = [
  "Arizona Jackals","Boston Tritons","Carolina Phantoms","Chicago Comets","Cincinnati Blades",
  "Cleveland Arrows","Dallas Outriders","Denver Peaks","Detroit Forge","Houston Fireflies",
  "Jacksonville Armada","Kansas City Monarchs","Las Vegas Vipers","Los Angeles Guardians",
  "Miami Cyclones","Minnesota Northstars","Nashville Rails","New Orleans Spirit","New York Sentinels",
  "Philadelphia Liberty","Pittsburgh Iron","San Francisco Waves","Seattle Orcas","Tampa Bay Storm",
  "Washington Capitols","Utah Wranglers","Portland Pioneers","St. Louis Stallions","San Antonio Suns",
  "Columbus Voyageurs","Baltimore Kings","Memphis Mudcats","Oklahoma City Bison"
];

const BASE_CAP = 200_000_000;
const CAP_GROWTH = 0.08;
const LEAGUE_SIZE = 32;

// -------- Contracts & Cap --------
function newContract({years, basePerYear, signingBonus}){
  const base = basePerYear.slice(0, years);
  return { years, yearLeft: years, base, signingBonus, signingBonusLeft: signingBonus };
}
const capHitForYear = (c)=> !c ? 0 : Math.round((c.base[c.years - c.yearLeft] || 0) + (c.signingBonus||0)/c.years);
const advanceContractYear = (c)=> { if (c) c.yearLeft = Math.max(0, c.yearLeft - 1); };
function extendContract(c, addYears, newBasePerYear, convertToBonus = 0) {
  const idx = c.years - c.yearLeft;
  if (c.base[idx] !== undefined) {
    const convert = Math.min(convertToBonus, c.base[idx]);
    c.base[idx] -= convert; c.signingBonus += convert;
  }
  c.base = c.base.concat(newBasePerYear.slice(0, addYears));
  c.years += addYears; c.yearLeft += addYears;
}
const teamCapSpace = (team, cap)=> Math.round(cap - team.roster.reduce((s,p)=> s + capHitForYear(p.contract), 0));

// -------- Entities --------
function makePlayer(ageRange=[21,31], pos){
  const id = uid();
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const age = irand(ageRange[0], ageRange[1]);
  const position = pos || pick(POSITIONS);
  const potential = clamp(Math.round(rng(50,99)), 40, 99);
  const dev = pick(["Slow","Average","Quick","Star"]);
  const durability = clamp(Math.round(rng(60, 99)), 50, 99);
  const style = pick(PLAYER_STYLES[position] || ["Balanced"]);
  const baseOVR = clamp(Math.round(rng(40,80) + (POSITION_VALUE[position]||1)*rng(0,6)), 35, 92);
  const years = irand(1,4);
  const basePerYear = Array.from({length:years},(_,i)=> Math.round((baseOVR**1.55)*15_000 + rng(0,500_000)*(1+i*0.1)));
  const signingBonus = Math.round(rng(0.05,0.25) * basePerYear.reduce((a,b)=>a+b,0));
  return { id, name, age, position, style, overall: baseOVR, potential, dev, durability, morale:50,
    contract: newContract({years, basePerYear, signingBonus}), stats:{games:0,value:0}, trainingFocus:null, trueTalent:baseOVR, scoutedGrade:null };
}
function makeTeam(name){
  const roster = [];
  const template = { QB:3,RB:4,WR:7,TE:3,LT:2,LG:2,C:2,RG:2,RT:2,EDGE:5,IDL:5,LB:5,CB:5,S:4,K:1,P:1 };
  Object.entries(template).forEach(([pos,count])=>{ for(let i=0;i<count;i++) roster.push(makePlayer([22,32], pos)); });
  return { id: uid(), name, roster,
    wins:0, losses:0, ties:0, pointsFor:0, pointsAgainst:0,
    coach:{ name:`${pick(FIRST)} ${pick(LAST)}`, offense:irand(55,95), defense:irand(55,95), schemeO:pick(COACH_SCHEMES.offense), schemeD:pick(COACH_SCHEMES.defense)},
    coordinators:{ OC:{name:`${pick(FIRST)} ${pick(LAST)}`, rating:irand(55,95), scheme:pick(COACH_SCHEMES.offense)},
                   DC:{name:`${pick(FIRST)} ${pick(LAST)}`, rating:irand(55,95), scheme:pick(COACH_SCHEMES.defense)},
                   ST:{name:`${pick(FIRST)} ${pick(LAST)}`, rating:irand(55,95)} },
    scouting:{level:irand(1,3), points:0}, owner:{patience:irand(40,90), ambition:irand(40,95), market:irand(40,90)},
    jobSecurity:70, trophies:0, goals:[] };
}
function schemeFitBonus(coord, player){
  if(!coord) return 0;
  const map = {
    AirRaid:{ QB:"FieldGeneral", WR:"DeepThreat", TE:"Vertical" },
    WestCoast:{ QB:"FieldGeneral", WR:"Slot", TE:"Balanced", RB:"Receiving" },
    PowerRun:{ RB:"Power" }, ZoneRun:{ RB:"Elusive" },
    ManBlitz:{ EDGE:"Speed", CB:"Press" }, ZoneBlitz:{ LB:"Blitzer" },
    Cover2:{ CB:"Zone", S:"Deep" }, Cover3:{ CB:"Zone", S:"Deep" }, Balanced:{}
  };
  const pref = map[coord.scheme]?.[player.position];
  return pref && player.style===pref ? coord.rating/20 : 0;
}
function teamOverall(roster, team=null){
  const needed = { ...POS_SLOTS }; const starters=[]; const bench=[];
  const sorted = [...roster].sort((a,b)=> b.overall-a.overall);
  for(const p of sorted){ if(needed[p.position]>0){ starters.push(p); needed[p.position]--; } else bench.push(p); }
  let val = starters.reduce((s,p)=> s + p.overall*(1+(POSITION_VALUE[p.position]||1)*0.15),0) + bench.reduce((s,p)=> s + p.overall*0.25,0);
  if(team){ const oc=team.coordinators?.OC, dc=team.coordinators?.DC;
    const oBonus = starters.filter(p=>["QB","RB","WR","TE","LT","LG","C","RG","RT"].includes(p.position)).reduce((s,p)=> s + schemeFitBonus(oc,p),0);
    const dBonus = starters.filter(p=>["EDGE","IDL","LB","CB","S"].includes(p.position)).reduce((s,p)=> s + schemeFitBonus(dc,p),0);
    val += (oBonus+dBonus)*0.6; }
  const maxStarters = Object.values(POS_SLOTS).reduce((a,b)=>a+b,0);
  const scale = maxStarters * 100 * 1.5;
  return clamp(Math.round((val/scale)*100), 30, 98);
}

// -------- League --------
function makeSchedule(teamIds){
  const weeks=[]; const n=teamIds.length; const ids=[...teamIds]; if(n%2===1) ids.push(null);
  const rounds=n-1; const half=n/2; let left=ids.slice(0,half); let right=ids.slice(half).reverse();
  for(let r=0;r<rounds;r++){ const week=[]; for(let i=0;i<half;i++){ const a=left[i], b=right[i]; if(a!==null&&b!==null) week.push({home:a,away:b}); } weeks.push(week);
    const fixed=left[0]; const moved=left.splice(1).concat(right.splice(0,1)); left=[fixed,...moved]; right.push(right.shift()); }
  const extra = weeks[0].map(g=>({home:g.away, away:g.home})); return [...weeks, extra].slice(0,18);
}
function makeLeague(){
  const teams = TEAM_NAMES.slice(0, LEAGUE_SIZE).map(makeTeam);
  const schedule = makeSchedule(teams.map(t=>t.id));
  return { year:2025, week:1, phase:"REG", teams, schedule, games:[], playoffs:null, freeAgents:[], draftOrder:[], capBase:BASE_CAP,
    userTeamId: teams[irand(0,teams.length-1)].id, tradeDifficulty:1.0, fired:false, unemployedWeeks:0, history:[] };
}

// -------- Sim --------
function simGame(home, away, cap){
  const hStrength = teamOverall(home.roster, home) + (home.coach.offense+home.coach.defense)/40 + 2;
  const aStrength = teamOverall(away.roster, away) + (away.coach.offense+away.coach.defense)/40;
  const spread = (hStrength - aStrength)/3 + rng(-3,3);
  const base = 20 + rng(-5,5);
  const hScore = Math.max(0, Math.round(base + spread + rng(0,14)));
  const aScore = Math.max(0, Math.round(base - spread + rng(0,14)));
  const result = { homeId:home.id, awayId:away.id, hScore, aScore };
  home.pointsFor += hScore; home.pointsAgainst += aScore; away.pointsFor += aScore; away.pointsAgainst += hScore;
  if(hScore>aScore) home.wins++; else if(aScore>hScore) away.wins++; else { home.ties++; away.ties++; }
  home.roster.forEach(p=> p.stats.value += rng(0,1)); away.roster.forEach(p=> p.stats.value += rng(0,1));
  return result;
}
function applyWeeklyTraining(team){
  const focus = team.roster.find(p=>p.trainingFocus); if(!focus) return;
  const devMul = { Slow:0.2, Average:0.5, Quick:0.9, Star:1.2 }[focus.dev]||0.5;
  const coach = (team.coach.offense + team.coach.defense)/200;
  const gain = rng(0.1,0.6) * devMul * (1+coach);
  focus.overall = clamp(Math.round(focus.overall + gain), 30, focus.potential);
  focus.morale = clamp(focus.morale + 1, 0, 100); focus.trainingFocus = null;
  team.roster.forEach(p=>{ if(p.age>29 && Math.random()<0.1) p.overall = Math.max(30, p.overall-1); });
}

// -------- Trades --------
const playerValue = (p)=> (p.overall**2) * (p.age<25?1.15:p.age<=28?1.0:p.age<=31?0.9:0.8) * ({Slow:0.9,Average:1.0,Quick:1.1,Star:1.25}[p.dev]||1.0) * (POSITION_VALUE[p.position]||1);
function teamNeeds(team){ const counts={}; team.roster.forEach(p=> counts[p.position]=(counts[p.position]||0)+1); const needs={}; Object.keys(POS_SLOTS).forEach(pos=> needs[pos]=(POS_SLOTS[pos]*2)-(counts[pos]||0)); return needs; }
function evaluateTrade(offer, userTeam, aiTeam, difficulty){
  const sendVal = offer.send.reduce((s,p)=>s+playerValue(p),0);
  const recvVal = offer.receive.reduce((s,p)=>s+playerValue(p),0);
  const need = teamNeeds(aiTeam);
  const needBonus = offer.receive.reduce((s,p)=> s + Math.max(0, (need[p.position]||0))*500,0) - offer.send.reduce((s,p)=> s + Math.max(0, (need[p.position]||0))*300,0);
  const pickValue = (r)=>[3000,1200,600,300,150,70,30][r-1]||10;
  const aiPickIn = (offer.picks?.ai||[]).reduce((s,r)=>s+pickValue(r),0);
  const aiPickOut= (offer.picks?.user||[]).reduce((s,r)=>s+pickValue(r),0);
  const net = (recvVal - sendVal) + needBonus + aiPickIn - aiPickOut;
  const threshold = (Math.random()*4000 - 2000) * difficulty;
  return net > threshold;
}
function tradeFinder(league, userTeam, targetPos){
  const partners = league.teams.filter(t=>t.id!==userTeam.id);
  const ranked = partners.map(t=>({team:t, need:teamNeeds(t)})).sort((a,b)=> (a.need[targetPos]||0)-(b.need[targetPos]||0));
  const best = ranked[0]?.team; if(!best) return null;
  const candidates = best.roster.filter(p=>p.position===targetPos).sort((a,b)=> a.overall-b.overall);
  const target = candidates[0]||null; if(!target) return null;
  const surplusPos = Object.keys(teamNeeds(userTeam)).sort((a,b)=> teamNeeds(userTeam)[a]-teamNeeds(userTeam)[b]).pop();
  const surplus = userTeam.roster.filter(p=>p.position===surplusPos).sort((a,b)=> b.overall-a.overall)[0];
  return { partnerId: best.id, targetId: target.id, ask: surplus ? { players:[surplus.id], picks:[3] } : { players:[], picks:[2] } };
}

// -------- FA & Draft --------
function startOffseason(league){
  league.phase="OFFSEASON"; const FA=[];
  league.teams.forEach(t=>{ const keep=[]; t.roster.forEach(p=>{ advanceContractYear(p.contract); if(p.contract.yearLeft<=0 && Math.random()<0.7){ p.contract=null; FA.push(p);} else keep.push(p); }); t.roster=keep; });
  league.freeAgents=FA;
  league.draftOrder = [...league.teams].sort((a,b)=> (a.wins-b.wins) || (a.pointsFor-b.pointsFor) || (Math.random()-0.5)).map(t=>t.id);
}
function runDraft(league){
  league.phase="DRAFT";
  const pool = Array.from({length:7*LEAGUE_SIZE+40}, ()=>{ const pos=pick(POSITIONS); const p=makePlayer([20,24], pos);
    p.trueTalent = clamp(Math.round(rng(50,88)+(POSITION_VALUE[pos]||1)*rng(0,4)), 45, 95); p.overall=p.trueTalent; p.scoutedGrade=null; p.contract=null; return p; });
  league.prospects = pool;
}
function scoutedGradeFor(team, prospect){
  const lvl = team.scouting.level; const noise = ({1:irand(6,14),2:irand(5,10),3:irand(4,8),4:irand(3,6),5:irand(2,4)}[lvl]) || irand(6,12);
  return clamp(prospect.trueTalent + irand(-noise, noise), 40, 95);
}
function draftOne(team, league, round){
  const needs = teamNeeds(team);
  const sortedPool = league.prospects.sort((a,b)=> (b.scoutedGrade ?? b.trueTalent) - (a.scoutedGrade ?? a.trueTalent));
  const pickIdx = sortedPool.findIndex(p=> (needs[p.position]||0) > -1);
  const prospect = sortedPool.splice(Math.max(0,pickIdx),1)[0];
  const salary = Math.round((90 - round*5) * 100_000);
  prospect.contract = newContract({years:4, basePerYear:[salary, salary*1.05, salary*1.1, salary*1.15], signingBonus:Math.round(salary*1.2)});
  team.roster.push(prospect);
}
function executeDraft(league){
  if(!league.prospects) runDraft(league);
  for(let r=1;r<=7;r++){ for(const id of league.draftOrder){ const t=league.teams.find(x=>x.id===id);
    league.prospects.forEach(p=> { if(!p.scoutedGrades) p.scoutedGrades={}; if(!(t.id in p.scoutedGrades)) p.scoutedGrades[t.id]= scoutedGradeFor(t,p); });
    league.prospects.forEach(p=> p.scoutedGrade = p.scoutedGrades[t.id]); draftOne(t, league, r); } }
  league.phase="OFFSEASON"; delete league.prospects;
}
function signFreeAgent(league, team, player, cap){
  const idx = league.freeAgents.findIndex(p=>p.id===player.id); if(idx===-1) return false;
  const ask = Math.round(playerValue(player)/40) + irand(500_000, 2_000_000);
  const years = irand(1,3); const base = Array.from({length:years},(_,i)=> Math.round(ask*(1+0.05*i))); const bonus = Math.round(ask*rng(0.2,0.5));
  const offer = newContract({years, basePerYear:base, signingBonus:bonus}); const capHit = capHitForYear(offer);
  if(teamCapSpace(team, cap) < capHit) return false;
  player.contract = offer; team.roster.push(player); league.freeAgents.splice(idx,1); return true;
}

// -------- Playoffs & Jobs --------
function seedPlayoffs(league){
  const byC={A:[],B:[]}; league.teams.forEach((t,i)=> byC[i%2===0?"A":"B"].push(t));
  const seeds={}; Object.entries(byC).forEach(([conf,arr])=>{ const s=[...arr].sort((a,b)=> (b.wins-a.wins) || (b.pointsFor-b.pointsFor)); seeds[conf]=s.slice(0,7).map(t=>t.id); });
  league.playoffs = {seeds};
}
function simPlayoffs(league, cap){
  if(!league.playoffs) seedPlayoffs(league);
  const duel = (ids)=>{ let arr=[...ids]; while(arr.length>1){ const a=league.teams.find(t=>t.id===arr.shift()); const b=league.teams.find(t=>t.id===arr.pop()); const g=simGame(a,b,cap); arr.push(g.hScore>=g.aScore?a.id:b.id); } return arr[0]; };
  const a=duel(league.playoffs.seeds.A), b=duel(league.playoffs.seeds.B);
  const A=league.teams.find(t=>t.id===a), B=league.teams.find(t=>t.id===b);
  const g=simGame(A,B,cap); const champ=g.hScore>=g.aScore?A:B; champ.trophies+=1; league.history.push({year:league.year, champion:champ.name});
}
const rankTeam = (league, team, metric)=> [...league.teams].sort((a,b)=> metric(b)-metric(a)).findIndex(t=>t.id===team.id)+1;
function evaluateJobSecurity(team){
  const rec=team.wins-team.losses; const perf=rec*4 + (team.pointsFor-team.pointsAgainst)/50; const goalsScore=(team.goals||[]).reduce((s,g)=> s + (g.completed?5:-3),0);
  team.jobSecurity = clamp(Math.round(70 + perf + goalsScore - (Math.random()*10)), 0, 100);
}
function rollOwnerGoals(team, year){
  const options=[
    { key:"make_playoffs", text:"Make the playoffs" },
    { key:"top_offense", text:"Finish top ten in points for" },
    { key:"beat_rival", text:"Finish ahead of your division rival" },
    { key:"develop_qb", text:"Increase starting QB by 2 overall" },
    { key:"win_record", text:"Finish with a winning record" },
  ];
  team.goals = Array.from({length:2}, ()=> ({ ...pick(options), year, completed:false }));
}
function evaluateGoalsEndOfSeason(league){
  league.teams.forEach(t=>{ (t.goals||[]).forEach(g=>{
    if(g.key==="make_playoffs") g.completed = t.wins>=10;
    if(g.key==="top_offense") g.completed = rankTeam(league,t,x=>x.pointsFor)<=10;
    if(g.key==="win_record") g.completed = t.wins>t.losses;
    if(g.key==="develop_qb") g.completed = true;
    if(g.key==="beat_rival") g.completed = true;
  }); });
}
function maybeFireUser(league){
  const team = league.teams.find(t=>t.id===league.userTeamId);
  evaluateJobSecurity(team);
  const patience = team.owner.patience;
  if(team.jobSecurity < Math.max(20, patience*0.4) && Math.random()<0.35){ league.fired=true; league.unemployedWeeks=0; }
}
function maybeHireUser(league){
  if(!league.fired) return; league.unemployedWeeks++;
  if(league.unemployedWeeks>3 && Math.random()<0.5){ const candidates = league.teams.filter(t=>t.wins<6); if(candidates.length){ league.userTeamId = pick(candidates).id; league.fired=false; } }
}

// -------- Persistence --------
const STORAGE_KEY = "nfl_gm_sim_state_strict";
const saveLeague = (league)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(league));
const loadLeague = ()=> { try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } };

// -------- UI --------
const Money = ({n})=> html`<span>$${(n/1_000_000).toFixed(1)}M</span>`;
const Panel = ({title, children})=> html`<div class="card"><div class="hstack" style="justify-content:space-between;"><div style="font-weight:700">${title}</div></div>${children}</div>`;

function RosterTable({ team, onSetTraining, selectPlayer, selectedIds }){
  const roster=[...team.roster].sort((a,b)=> b.overall-a.overall);
  return html`<div class="scroll">
    <table class="table">
      <thead><tr><th>Sel</th><th>Name</th><th>Pos</th><th>Style</th><th>OVR</th><th>Pot</th><th>Dev</th><th>Age</th><th>Cap Hit</th><th>Train</th></tr></thead>
      <tbody>
        ${roster.map(p=> html`<tr key=${p.id}>
          <td><input type="checkbox" checked=${selectedIds?.has?.(p.id)||false} onChange=${(e)=> selectPlayer?.(p, e.target.checked)} /></td>
          <td>${p.name}</td><td>${p.position}</td><td>${p.style}</td><td>${p.overall}</td><td>${p.potential}</td><td>${p.dev}</td><td>${p.age}</td>
          <td>${p.contract ? html`<${Money} n=${capHitForYear(p.contract)} />` : "FA"}</td>
          <td><button class="btn primary" onClick=${()=> onSetTraining?.(p)}>Focus</button></td>
        </tr>`)}
      </tbody>
    </table>
  </div>`;
}

function ScheduleView({ league, cap, onSimWeek }){
  const weekIdx = league.week - 1;
  const weekGames = Array.isArray(league.schedule[weekIdx]) ? league.schedule[weekIdx] : [];
  return html`<div>
    <div class="hstack" style="margin-bottom:8px"><div>Year ${league.year} Week ${league.week} Phase ${league.phase}</div><span class="spacer"></span><button class="btn success" onClick=${onSimWeek}>Advance</button></div>
    <div class="grid col2">
      ${weekGames.map((g,i)=>{ const home=league.teams.find(t=>t.id===g.home); const away=league.teams.find(t=>t.id===g.away);
        return html`<div class="card"><div style="font-weight:600">${away.name} at ${home.name}</div></div>`; })}
    </div>
  </div>`;
}

function Standings({ league }){
  const rows=[...league.teams].sort((a,b)=> (b.wins-a.wins) || (b.pointsFor-a.pointsFor));
  return html`<div class="scroll"><table class="table">
    <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th><th>JobSec</th></tr></thead>
    <tbody>${rows.map(t=> html`<tr key=${t.id}><td>${t.name}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.ties}</td><td>${t.pointsFor}</td><td>${t.pointsAgainst}</td><td>${t.jobSecurity}</td></tr>`)}</tbody>
  </table></div>`;
}

function TradeCenter({ league, userTeam, onTradeCompleted }){
  const [partnerId, setPartnerId] = useState(league.teams.find(t=>t.id!==userTeam.id)?.id);
  const partner = league.teams.find(t=>t.id===Number(partnerId));
  const [userSel, setUserSel] = useState(new Set());
  const [aiSel, setAiSel] = useState(new Set());
  const [msg, setMsg] = useState("");

  const selectUser = (p, checked)=> { const s=new Set(userSel); checked?s.add(p.id):s.delete(p.id); setUserSel(s); };
  const selectAi = (p, checked)=> { const s=new Set(aiSel); checked?s.add(p.id):s.delete(p.id); setAiSel(s); };

  const tryTrade = ()=> {
    const offer = { send: userTeam.roster.filter(p=>userSel.has(p.id)), receive: partner.roster.filter(p=>aiSel.has(p.id)), picks:{user:[],ai:[]} };
    const ok = evaluateTrade(offer, userTeam, partner, league.tradeDifficulty);
    if(ok){ offer.send.forEach(p=> { partner.roster.push(p); userTeam.roster = userTeam.roster.filter(q=>q.id!==p.id); });
            offer.receive.forEach(p=> { userTeam.roster.push(p); partner.roster = partner.roster.filter(q=>q.id!==p.id); });
            setMsg("Accepted"); setUserSel(new Set()); setAiSel(new Set()); onTradeCompleted(); }
    else setMsg("Rejected. Sweeten the deal or match needs.");
  };

  const [finderPos, setFinderPos] = useState("WR");
  const suggest = ()=> { const s=tradeFinder(league, userTeam, finderPos); if(!s){ setMsg("No reasonable suggestions."); return; } setPartnerId(s.partnerId); setMsg(`Suggested deal for ${finderPos}: ask picks ${s.ask.picks.join(',')}`); };

  return html`<div class="grid col2">
    <div><div class="small" style="font-weight:600;margin-bottom:6px">Your roster</div><${RosterTable} team=${userTeam} onSetTraining=${()=>{}} selectPlayer=${selectUser} selectedIds=${userSel} /></div>
    <div>
      <div class="hstack" style="margin-bottom:6px"><div class="small" style="font-weight:600">Trade with</div>
        <select value=${partnerId} onChange=${(e)=> setPartnerId(Number(e.target.value))}>${league.teams.filter(t=>t.id!==userTeam.id).map(t=> html`<option value=${t.id}>${t.name}</option>`)}</select>
      </div>
      <${RosterTable} team=${partner} onSetTraining=${()=>{}} selectPlayer=${selectAi} selectedIds=${aiSel} />
    </div>
    <div class="hstack" style="grid-column:1/-1">
      <button class="btn primary" onClick=${tryTrade}>Propose Trade</button>
      <select value=${finderPos} onChange=${(e)=> setFinderPos(e.target.value)}>${Object.keys(POS_SLOTS).map(p=> html`<option value=${p}>${p}</option>`)}</select>
      <button class="btn" onClick=${suggest}>Trade Finder</button>
      <span class="small">${msg}</span>
    </div>
  </div>`;
}

function FreeAgency({ league, cap, onSign }){
  const [filter, setFilter] = useState("");
  const list = (league.freeAgents||[]).filter(p=> p.name.toLowerCase().includes(filter.toLowerCase()));
  const team = league.teams.find(t=>t.id===league.userTeamId);
  const space = teamCapSpace(team, cap);
  return html`<div>
    <div class="hstack" style="margin-bottom:8px">
      <input placeholder="Search" value=${filter} onInput=${(e)=> setFilter(e.target.value)} />
      <span class="spacer"></span><div class="small">Cap Space <${Money} n=${space} /></div>
    </div>
    <div class="scroll"><table class="table">
      <thead><tr><th>Name</th><th>Pos</th><th>OVR</th><th>Ask</th><th>Action</th></tr></thead>
      <tbody>${list.map(p=>{ const ask = Math.round(playerValue(p)/40) + 800_000; return html`<tr key=${p.id}>
        <td>${p.name}</td><td>${p.position}</td><td>${p.overall}</td><td><${Money} n=${ask} /></td><td><button class="btn primary" onClick=${()=> onSign(p)}>Sign</button></td>
      </tr>`; })}</tbody>
    </table></div>
  </div>`;
}

function CapDesk({ league, cap, onExtend }){
  const team = league.teams.find(t=>t.id===league.userTeamId);
  const space = teamCapSpace(team, cap);
  const [sel, setSel] = useState(null);
  return html`<div>
    <div class="hstack" style="margin-bottom:8px"><div>Year Cap <${Money} n=${cap} /> Space <${Money} n=${space} /></div></div>
    <div class="grid col2">
      <div>
        <div class="small" style="font-weight:600;margin-bottom:6px">Roster Cap Hits</div>
        <div class="scroll card">
          <table class="table">
            <thead><tr><th>Name</th><th>Pos</th><th>Cap Hit</th></tr></thead>
            <tbody>
              ${[...team.roster].sort((a,b)=> capHitForYear(b.contract)-capHitForYear(a.contract)).map(p=> html`<tr key=${p.id} class=${sel?.id===p.id ? 'selected' : ''} onClick=${()=> setSel(p)}>
                <td>${p.name}</td><td>${p.position}</td><td><${Money} n=${capHitForYear(p.contract)} /></td>
              </tr>`)}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="small" style="font-weight:600;margin-bottom:6px">Extensions And Restructures</div>
        ${sel ? html`<div class="vstack">
          <div>${sel.name} OVR ${sel.overall}</div>
          <button class="btn" onClick=${()=> onExtend(sel, 2, 0.2)}>Add 2 years and convert 20 percent</button>
          <div class="small">Converts part of current salary to bonus to push cap forward, then adds years.</div>
        </div>` : html`<div class="small">Select a player to manage cap.</div>`}
      </div>
    </div>
  </div>`;
}

function ScoutingBoard({ league }){
  const team = league.teams.find(t=>t.id===league.userTeamId);
  const [filter, setFilter] = useState("");
  const prospects = league.prospects || [];
  const list = prospects.filter(p=> p.name.toLowerCase().includes(filter.toLowerCase()));
  const scout = (p)=> { if(!p.scoutedGrades) p.scoutedGrades={}; p.scoutedGrades[team.id] = scoutedGradeFor(team, p); p.scoutedGrade = p.scoutedGrades[team.id]; team.scouting.points = Math.max(0, team.scouting.points-1); };
  return html`<div>
    <div class="hstack" style="margin-bottom:8px">
      <input placeholder="Find prospect" value=${filter} onInput=${(e)=> setFilter(e.target.value)} />
      <span class="spacer"></span><div class="small">Scout level ${team.scouting.level} Points ${team.scouting.points}</div>
    </div>
    <div class="scroll"><table class="table">
      <thead><tr><th>Name</th><th>Pos</th><th>Style</th><th>Scouted</th><th>Action</th></tr></thead>
      <tbody>${list.map(p=> html`<tr key=${p.id}><td>${p.name}</td><td>${p.position}</td><td>${p.style||'Balanced'}</td><td>${p.scoutedGrade ?? "?"}</td>
        <td><button class="btn success" onClick=${()=> scout(p)}>Scout</button></td></tr>` )}</tbody>
    </table></div>
  </div>`;
}

// -------- App --------
function App(){
  const [league, setLeague] = useState(()=> loadLeague() || makeLeague());
  const userTeam = useMemo(()=> league.teams.find(t=>t.id===league.userTeamId), [league]);
  const [tab, setTab] = useState("Roster");
  const [toast, setToast] = useState("");

  useEffect(()=> { saveLeague(league); }, [league]);

  const cap = Math.round(league.capBase * (1 + CAP_GROWTH * Math.max(0, league.year - 2025)));

  const setTraining = (p)=> { const t=userTeam; t.roster.forEach(x=> x.trainingFocus=false); const me=t.roster.find(x=>x.id===p.id); me.trainingFocus=true; setLeague({...league}); setToast(`Training focus set to ${p.name}`); };

  const simWeek = ()=> {
    if(league.phase==="REG"){
      const idx=league.week-1; const games=league.schedule[idx]||[]; const results=[];
      for(const g of games){ const home=league.teams.find(t=>t.id===g.home); const away=league.teams.find(t=>t.id===g.away); results.push(simGame(home, away, cap)); }
      applyWeeklyTraining(userTeam); maybeFireUser(league); league.games.push(...results); league.week += 1;
      if(league.week>18){ league.phase="PLAYOFFS"; seedPlayoffs(league); } setLeague({...league});
    }else if(league.phase==="PLAYOFFS"){
      simPlayoffs(league, cap); evaluateGoalsEndOfSeason(league); startOffseason(league); league.teams.forEach(t=> rollOwnerGoals(t, league.year+1)); setLeague({...league});
    }else if(league.phase==="OFFSEASON"){
      runDraft(league); league.teams.forEach(t=> t.scouting.points = 20 + t.scouting.level*5); setTab("Scouting"); setLeague({...league});
    }else if(league.phase==="DRAFT"){
      executeDraft(league); league.year+=1; league.week=1; league.phase="REG"; league.teams.forEach(t=> { t.wins=t.losses=t.ties=0; t.pointsFor=t.pointsAgainst=0; });
      league.schedule = makeSchedule(league.teams.map(t=>t.id)); maybeHireUser(league); setLeague({...league});
    }
  };

  const signFA = (p)=> { const team=userTeam; const ok=signFreeAgent(league, team, p, cap); setToast(ok?`Signed ${p.name}`:"Cap space insufficient or failed"); setLeague({...league}); };
  const resetLeague = ()=> { if(!confirm("Start a new league. This clears your save.")) return; setLeague(makeLeague()); };
  const onExtend = (player, addYears, convertPct)=> { if(!player.contract) return; const idx=player.contract.years-player.contract.yearLeft; const currentBase=player.contract.base[idx]||0;
    const convert=Math.round(currentBase*convertPct); extendContract(player.contract, addYears, Array.from({length:addYears},()=> currentBase), convert); setToast(`Extended ${player.name}`); setLeague({...league}); };

  return html`<div class="container vstack">
    <div class="header">
      <div style="font-size:22px;font-weight:800">NFL GM Simulator</div>
      <span class="badge">Year ${league.year}</span>
      <span class="badge">Your Team: ${userTeam.name}</span>
      ${league.fired ? html`<span class="badge" style="background:#ef4444;color:#fff">Unemployed weeks ${league.unemployedWeeks}</span>` : null}
      <span class="spacer"></span>
      <button class="btn" onClick=${resetLeague}>New League</button>
    </div>

    <div class="tabs">
      ${["Roster","Schedule","Standings","Trades","Free Agency","Cap","Scouting"].map(x=> html`<button class="btn ${tab===x?'primary':''}" onClick=${()=> setTab(x)}>${x}</button>`)}
    </div>

    ${tab==="Roster" && html`<${Panel} title="Your Roster And Training">
      <${RosterTable} team=${userTeam} onSetTraining=${(p)=> setTraining(p)} selectPlayer=${()=>{}} selectedIds=${new Set()} />
      <div class="small">Click Focus to set the one weekly training target. Training applies when you advance the week.</div>
    </${Panel}>`}

    ${tab==="Schedule" && html`<${Panel} title="Schedule And Advance">
      <${ScheduleView} league=${league} cap=${cap} onSimWeek=${simWeek} />
    </${Panel}>`}

    ${tab==="Standings" && html`<${Panel} title="League Standings">
      <${Standings} league=${league} />
    </${Panel}>`}

    ${tab==="Trades" && html`<${Panel} title="Trade Center With Finder">
      <${TradeCenter} league=${league} userTeam=${userTeam} onTradeCompleted=${()=> setLeague({...league})} />
      <div class="small">Evaluator considers team needs and pick value. Difficulty slider in Controls.</div>
    </${Panel}>`}

    ${tab==="Free Agency" && html`<${Panel} title="Free Agency With Cap Checks">
      <${FreeAgency} league=${league} cap=${cap} onSign=${signFA} />
      <div class="small">FA and the draft occur in the offseason. Cap increases each year by 8 percent.</div>
    </${Panel}>`}

    ${tab==="Cap" && html`<${Panel} title="Cap Desk And Extensions">
      <${CapDesk} league=${league} cap=${cap} onExtend=${onExtend} />
    </${Panel}>`}

    ${tab==="Scouting" && html`<${Panel} title="Draft Board And Scouting">
      ${league.prospects ? html`<${ScoutingBoard} league=${league} />` : html`<div class="small">Advance to the offseason to open scouting.</div>`}
    </${Panel}>`}

    <${Panel} title="Controls">
      <div class="hstack">
        <div>Phase <b>${league.phase}</b></div>
        <div>Week <b>${league.week}</b></div>
        <button class="btn success" onClick=${simWeek}>${league.phase==="REG"?"Advance Week":league.phase==="PLAYOFFS"?"Sim Playoffs":league.phase==="OFFSEASON"?"Open Draft":"Start New Season"}</button>
        <button class="btn warn" onClick=${()=> { league.tradeDifficulty = clamp(Number(prompt("Trade difficulty 0.8 easy 1.0 normal 1.2 hard", String(league.tradeDifficulty)))||1.0, 0.5, 1.5); setLeague({...league}); }}>Trade Difficulty</button>
      </div>
    </${Panel}>

    ${toast && html`<div class="toast" onClick=${()=> setToast("")}>${toast}</div>`}
  </div>`;
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
