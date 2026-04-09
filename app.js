
(function(){
const seedData = window.__TOPBRS_SEED__;
const STORAGE_KEY = 'topbrs-ultra-pwa-v6-1-auth';
const LEGACY_STORAGE_KEYS = ['topbrs-ultra-pwa-v4-2-elite-arena','topbrs-ultra-pwa-v3-9-safe','topbrs-ultra-pwa-v4-0-1-real-fix','topbrs-ultra-pwa-v4-0-real-fix','topbrs-ultra-pwa-v3-7','topbrs-ultra-pwa-v3-6','topbrs-ultra-pwa-v3-5','topbrs-ultra-pwa-v3-4','topbrs-ultra-pwa-v3-3','topbrs-ultra-pwa-v3-2','topbrs-ultra-pwa-v3-1','topbrs-ultra-pwa-v3-0','topbrs-ultra-pwa-v2-9','topbrs-ultra-pwa-v2-8','topbrs-ultra-pwa-v2-7','topbrs-ultra-pwa-v2-4','topbrs-ultra-pwa-v2-3','topbrs-ultra-pwa-v2-2','topbrs-ultra-pwa-v2'];
const appVersion = '6.1';
const monthLabels = {
  JANEIRO:'Janeiro',FEVEREIRO:'Fevereiro','MARÇO':'Março',ABRIL:'Abril',MAIO:'Maio',JUNHO:'Junho',
  JULHO:'Julho',AGOSTO:'Agosto',SETEMBRO:'Setembro',OUTUBRO:'Outubro',NOVEMBRO:'Novembro',DEZEMBRO:'Dezembro'
};
const dayOrder = ['quinta','sexta','sabado','domingo'];
let deferredPrompt = null;

const state = loadState();
const ui = {
  monthSelect: $('#monthSelect'),
  weekSelect: $('#weekSelect'),
  usersBoard: $('#usersBoard'),
  monthChipBar: $('#monthChipBar'),
  weekChipBar: $('#weekChipBar'),
  kpiGrid: $('#kpiGrid'),
  podium: $('#podium'),
  goalPanel: $('#goalPanel'),
  rankingList: $('#rankingList'),
  leaderActions: $('#leaderActions'),
  annualPulse: $('#annualPulse'),
  warBoard: $('#warBoard'),
  tournamentEditor: $('#tournamentEditor'),
  tournamentBoard: $('#tournamentBoard'),
  classificationMonthSelect: $('#classificationMonthSelect'),
  classificationBoard: $('#classificationBoard'),
  eliteBoard: $('#eliteBoard'),
  historyBoard: $('#historyBoard'),
  membersGrid: $('#membersGrid'),
  memberModal: $('#memberModal'),
  memberModalBody: $('#memberModalBody'),
  userEditModal: $('#userEditModal'),
  userEditBody: $('#userEditBody'),
  createMemberModal: $('#createMemberModal'),
  createMemberForm: $('#createMemberForm'),
  createMemberNick: $('#createMemberNick'),
  createMemberRole: $('#createMemberRole'),
  goalModal: $('#goalModal'),
  vaultInsights: $('#vaultInsights'),
  heroMonth: $('#heroMonth'),
  heroClanName: $('#heroClanName'),
  heroSync: $('#heroSync'),
  installBtn: $('#installBtn'),
  manualRefreshBtn: $('#manualRefreshBtn'),
  sideDrawer: $('#sideDrawer'),
  drawerBackdrop: $('#drawerBackdrop'),
  menuToggleBtn: $('#menuToggleBtn'),
  menuHint: $('#menuHint'),
  backToTopBtn: $('#backToTopBtn'),
  currentViewBadge: $('#currentViewBadge'),
  heroSection: $('.hero'),
  weekHeroPicker: $('#weekHeroPicker'),
  vaultAccessModal: $('#vaultAccessModal'),
  vaultAccessForm: $('#vaultAccessForm'),
  vaultPasswordInput: $('#vaultPasswordInput'),
  vaultAccessError: $('#vaultAccessError'),
  vaultAccessCancelBtn: $('#vaultAccessCancelBtn')
};

let rankMode = 'elite';
let warFilter = 'all';
let touchMenuState = null;
const VAULT_PASSWORD = 'liderestopbrs';
const VAULT_SESSION_KEY = 'topbrs-vault-unlocked';
let lastNonVaultView = 'arenaView';

const viewLabels = {
  arenaView:'Arena 🏟️',
  warView:'Guerra ⚔️',
  tournamentView:'Torneio 🏆',
  classificationView:'Classificação 📊',
  eliteView:'Elite 👑',
  membersView:'Membros 👥',
  vaultView:'Cofre 🔐',
  usersView:'Usuários 🪪'
};

function updateTopbarTitle(viewId){
  if(!ui.currentViewBadge) return;
  ui.currentViewBadge.textContent = viewLabels[viewId] || 'Arena 🏟️';
}
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function readStoredState(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}
function blankWeekRecord(name, role='Membro'){
  return {
    name,
    role,
    days:{
      quinta:{attacks:[false,false,false,false],total:0,fourFour:false},
      sexta:{attacks:[false,false,false,false],total:0,fourFour:false},
      sabado:{attacks:[false,false,false,false],total:0,fourFour:false},
      domingo:{attacks:[false,false,false,false],total:0,fourFour:false}
    },
    attacksTotal:0,
    days44:0,
    clinchit:false
  };
}
function blankTournamentRecord(name){
  return {
    name,
    weeks:[1,2,3,4].map(() => ({participated:false,position:null,points:0})),
    pointsMonth:0,top3Month:0,observation:'EM CURSO'
  };
}
function mergeMonthData(baseMonth, savedMonth){
  const merged = deepClone(baseMonth || {weeks:{},tournament:{},summaryOriginal:{}});
  if(!savedMonth || typeof savedMonth !== 'object') return merged;
  merged.summaryOriginal = {...(merged.summaryOriginal||{}), ...(savedMonth.summaryOriginal||{})};
  merged.weeks ||= {};
  for(let week=1; week<=4; week++){
    const key = String(week);
    merged.weeks[key] = {...(merged.weeks[key]||{}), ...deepClone(savedMonth.weeks?.[key] || {})};
  }
  merged.tournament = {...(merged.tournament||{}), ...deepClone(savedMonth.tournament || {})};
  return merged;
}
function mergeWithSeed(saved){
  const base = deepClone(seedData);
  const imported = saved && typeof saved === 'object' ? saved : {};

  const validMonths = new Set(seedData.meta.months || []);
  base.meta = {...base.meta, ...(imported.meta || {})};
  base.meta.version = appVersion;
  base.meta.currentMonth = validMonths.has(imported.meta?.currentMonth) ? imported.meta.currentMonth : seedData.meta.currentMonth;
  base.meta.currentWeek = [1,2,3,4].includes(Number(imported.meta?.currentWeek)) ? Number(imported.meta.currentWeek) : 1;

  base.goals = {...(base.goals || {}), ...(imported.goals || {})};

  const seedMembers = Array.isArray(base.members) ? base.members : [];
  const savedMembers = Array.isArray(imported.members) ? imported.members : [];
  const savedByName = new Map(savedMembers.map(member => [member.name, member]));
  const mergedMembers = seedMembers.map(member => {
    const savedMember = savedByName.get(member.name) || {};
    return {
      ...member,
      ...savedMember,
      notes: {...(member.notes || {}), ...(savedMember.notes || {})}
    };
  });
  for(const savedMember of savedMembers){
    if(!mergedMembers.some(member => member.name === savedMember.name)){
      mergedMembers.push(savedMember);
    }
  }
  base.members = mergedMembers;

  base.months ||= {};
  const savedMonths = imported.months || {};
  for(const month of seedData.meta.months){
    base.months[month] = mergeMonthData(base.months[month], savedMonths[month]);
  }

  for(const [month, monthData] of Object.entries(savedMonths)){
    if(!base.months[month]) base.months[month] = mergeMonthData({weeks:{}, tournament:{}, summaryOriginal:{}}, monthData);
  }

  base.history = Array.isArray(imported.history) ? imported.history : [];
  base.authUsers = Array.isArray(imported.authUsers) ? imported.authUsers : (Array.isArray(state?.authUsers) ? deepClone(state.authUsers) : []);
  base.ui = {...(imported.ui || {}), lastSync: imported.ui?.lastSync || new Date().toISOString(), migratedFrom: imported.meta?.version || imported.meta?.appVersion || 'seed'};
  base.ui.classificationMonth = validMonths.has(imported.ui?.classificationMonth) ? imported.ui.classificationMonth : base.meta.currentMonth;
  base.ui.classificationRole = imported.ui?.classificationRole || 'ALL';
  base.ui.classificationQuery = imported.ui?.classificationQuery || '';
  base.ui.warQuery = imported.ui?.warQuery || '';
  base.ui.warRole = imported.ui?.warRole || 'ALL';
  base.ui.tournamentQuery = imported.ui?.tournamentQuery || '';
  base.ui.tournamentRole = imported.ui?.tournamentRole || 'ALL';
  base.ui.warCollapsed = imported.ui?.warCollapsed && typeof imported.ui.warCollapsed === 'object' ? imported.ui.warCollapsed : {};
  base.ui.tournamentCollapsed = imported.ui?.tournamentCollapsed && typeof imported.ui.tournamentCollapsed === 'object' ? imported.ui.tournamentCollapsed : {};
  return base;
}
function ensureDataCompleteness(data){
  data.meta ||= {};
  data.meta.version = appVersion;
  data.meta.currentMonth ||= seedData.meta.currentMonth;
  data.meta.currentWeek = [1,2,3,4].includes(Number(data.meta.currentWeek)) ? Number(data.meta.currentWeek) : 1;
  data.goals ||= {};
  data.members ||= [];
  data.months ||= {};
  data.history ||= [];
  data.ui ||= {lastSync:new Date().toISOString()};
  data.ui.classificationMonth ||= data.meta.currentMonth;
  data.ui.classificationRole ||= 'ALL';
  data.ui.classificationQuery ||= '';
  data.ui.warQuery ||= '';
  data.ui.warRole ||= 'ALL';
  data.ui.tournamentQuery ||= '';
  data.ui.tournamentRole ||= 'ALL';
  data.authUsers ||= [];
  data.ui.warCollapsed ||= {};
  data.ui.tournamentCollapsed ||= {};
  data.ui.localRevision = Number(data.ui.localRevision || 0);

  for(const month of seedData.meta.months){
    data.goals[month] ||= deepClone(seedData.goals?.[month] || {attacks:1200,tournament:80});
    data.months[month] ||= {weeks:{}, tournament:{}, summaryOriginal:{}};
    data.months[month].weeks ||= {};
    data.months[month].tournament ||= {};
    for(let week=1; week<=4; week++){
      const key = String(week);
      data.months[month].weeks[key] ||= {};
      for(const member of data.members){
        data.months[month].weeks[key][member.name] ||= blankWeekRecord(member.name, member.role);
      }
    }
    for(const member of data.members){
      data.months[month].tournament[member.name] ||= blankTournamentRecord(member.name);
    }
  }
  return data;
}
function loadState(){
  const current = readStoredState(STORAGE_KEY);
  if(current){
    return ensureDataCompleteness(mergeWithSeed(current));
  }
  for(const legacyKey of LEGACY_STORAGE_KEYS){
    const legacy = readStoredState(legacyKey);
    if(legacy){
      const migrated = ensureDataCompleteness(mergeWithSeed(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }
  const fresh = ensureDataCompleteness(deepClone(seedData));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}
function hydrateSeed(data){
  return ensureDataCompleteness(mergeWithSeed(data));
}
function saveState(){
  state.ui.localRevision = Number(state.ui.localRevision || 0) + 1;
  state.ui.lastSync = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if(ui.heroSync) ui.heroSync.textContent = 'salvo ' + new Date(state.ui.lastSync).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  window.TOPBRS_REMOTE?.onLocalSave?.(deepClone(state));
}

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
function esc(text){
  return String(text ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function monthLabel(m){ return monthLabels[m] || m; }
function slugify(text){
  return String(text ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}
function roleOptionsHtml(selected='ALL'){
  const roles = ['ALL', ...new Set(activeMembers().map(member => member.role || 'Membro'))];
  return roles.map(role => `<option value="${esc(role)}" ${role===selected?'selected':''}>${role==='ALL'?'Todos cargos':esc(role)}</option>`).join('');
}
function filteredSummariesForTools(ctx, mode){
  const query = ((mode === 'war' ? state.ui.warQuery : state.ui.tournamentQuery) || '').trim().toLowerCase();
  const role = mode === 'war' ? (state.ui.warRole || 'ALL') : (state.ui.tournamentRole || 'ALL');
  return ctx.summaries.filter(item => {
    const matchQuery = !query || item.member.name.toLowerCase().includes(query);
    const matchRole = role === 'ALL' || item.member.role === role;
    return matchQuery && matchRole;
  });
}
function renderToolQuickbar(mode, count){
  const query = mode === 'war' ? (state.ui.warQuery || '') : (state.ui.tournamentQuery || '');
  const role = mode === 'war' ? (state.ui.warRole || 'ALL') : (state.ui.tournamentRole || 'ALL');
  const title = mode === 'war' ? 'Filtro rápido da guerra' : 'Filtro rápido do torneio';
  const subtitle = mode === 'war' ? 'Ache um membro e marque os ataques sem rolar tudo.' : 'Ache um membro e marque a pontuação do torneio mais rápido.';
  return `
    <div class="tool-quickbar sticky-toolbar ${mode==='war' ? 'war-quickbar' : 'tournament-quickbar'}">
      <div class="tool-quickbar-copy">
        <strong>${title}</strong>
        <small>${subtitle} ${count} visível(is).</small>
      </div>
      <label class="field compact">
        <span>Buscar</span>
        <input type="search" placeholder="Digite o nome..." value="${esc(query)}" data-tool-query="${mode}">
      </label>
      <label class="field compact">
        <span>Cargo</span>
        <select data-tool-role="${mode}">${roleOptionsHtml(role)}</select>
      </label>
      <div class="tool-quickbar-actions">
        <button class="ghost small" data-tool-clear="${mode}">Limpar</button>
      </div>
    </div>
  `;
}

function applyToolFilters(mode){
  const query = ((mode === 'war' ? state.ui.warQuery : state.ui.tournamentQuery) || '').trim().toLowerCase();
  const role = mode === 'war' ? (state.ui.warRole || 'ALL') : (state.ui.tournamentRole || 'ALL');
  const container = mode === 'war' ? ui.warBoard : ui.tournamentEditor;
  if(!container) return;
  const rows = [...container.querySelectorAll(mode === 'war' ? '.war-row' : '.tour-row')];
  let visible = 0;
  rows.forEach(row => {
    const name = (row.dataset.memberName || '').toLowerCase();
    const rowRole = row.dataset.memberRole || '';
    const matchQuery = !query || name.includes(query);
    const matchRole = role === 'ALL' || rowRole === role;
    const show = matchQuery && matchRole;
    row.style.display = show ? '' : 'none';
    if(show) visible += 1;
  });
  const small = container.querySelector('.tool-quickbar-copy small');
  if(small){
    small.textContent = (mode === 'war'
      ? 'Ache um membro e marque os ataques sem rolar tudo.'
      : 'Ache um membro e marque a pontuação do torneio mais rápido.') + ` ${visible} visível(is).`;
  }
  const empty = container.querySelector(mode === 'war' ? '.war-inline-empty' : '.tour-inline-empty');
  if(empty) empty.remove();
  if(!visible){
    const div = document.createElement('div');
    div.className = mode === 'war' ? 'empty war-inline-empty' : 'empty tour-inline-empty';
    div.textContent = 'Nenhum membro encontrado nesse filtro.';
    container.appendChild(div);
  }
}

function collapseStore(mode){
  if(mode === 'war'){
    state.ui.warCollapsed ||= {};
    return state.ui.warCollapsed;
  }
  state.ui.tournamentCollapsed ||= {};
  return state.ui.tournamentCollapsed;
}
function isCollapsed(mode, memberName){
  const store = collapseStore(mode);
  return store[memberName] !== false;
}
function toggleMemberCollapse(mode, memberName){
  const store = collapseStore(mode);
  const currentlyCollapsed = isCollapsed(mode, memberName);
  store[memberName] = !currentlyCollapsed ? true : false;
  saveState();
  render();
}

function roleWeight(role){
  if(/líder/i.test(role)) return 4;
  if(/co-líder/i.test(role)) return 3;
  if(/ancião/i.test(role)) return 2;
  return 1;
}
function activeMembers(includeArchived=false){
  return state.members.filter(m => includeArchived ? true : m.status !== 'ARQUIVADO');
}
function ensureMonth(month){
  state.months[month] ||= {weeks:{},tournament:{},summaryOriginal:{}};
  state.goals[month] ||= {attacks:1200,tournament:80};
  for(let week=1;week<=4;week++){
    state.months[month].weeks[String(week)] ||= {};
  }
  return state.months[month];
}
function ensureWeekMember(month, week, name){
  const monthObj = ensureMonth(month);
  monthObj.weeks[String(week)][name] ||= {
    name,
    days:{
      quinta:{attacks:[false,false,false,false],total:0,fourFour:false},
      sexta:{attacks:[false,false,false,false],total:0,fourFour:false},
      sabado:{attacks:[false,false,false,false],total:0,fourFour:false},
      domingo:{attacks:[false,false,false,false],total:0,fourFour:false}
    },
    attacksTotal:0,
    days44:0,
    clinchit:false
  };
  return monthObj.weeks[String(week)][name];
}
function ensureTournamentMember(month, name){
  const monthObj = ensureMonth(month);
  monthObj.tournament[name] ||= {
    name,
    weeks:[1,2,3,4].map(() => ({participated:false,position:null,points:0})),
    pointsMonth:0,top3Month:0,observation:'EM CURSO'
  };
  return monthObj.tournament[name];
}
function recomputeWeekRecord(record){
  let attacksTotal = 0;
  let days44 = 0;
  for(const day of dayOrder){
    const dayRecord = record.days[day];
    dayRecord.total = dayRecord.attacks.filter(Boolean).length;
    dayRecord.fourFour = dayRecord.total === 4;
    attacksTotal += dayRecord.total;
    if(dayRecord.fourFour) days44 += 1;
  }
  record.attacksTotal = attacksTotal;
  record.days44 = days44;
  record.clinchit = attacksTotal === 16;
  return record;
}
function computeTournamentPoints(position, participated){
  const hasParticipation = !!participated || !!position;
  if(!hasParticipation) return 0;
  let points = Number(state.meta.tournamentRules.participation || 0);
  if(position === 1) points += Number(state.meta.tournamentRules.first || 0);
  else if(position === 2) points += Number(state.meta.tournamentRules.second || 0);
  else if(position === 3) points += Number(state.meta.tournamentRules.third || 0);
  return points;
}
function monthContext(month){
  const monthObj = ensureMonth(month);
  const members = activeMembers();
  const summaries = [];
  let maxWeeksStarted = 0;

  for(const member of members){
    const weekly = [1,2,3,4].map(week => recomputeWeekRecord(ensureWeekMember(month, week, member.name)));
    const tournament = ensureTournamentMember(month, member.name);
    tournament.weeks = tournament.weeks.map((item, idx) => {
      let position = item.position === '' ? null : item.position;
      if(position != null) position = Number(position);
      const participated = !!item.participated || !!position;
      return {participated, position, points: computeTournamentPoints(position, participated)};
    });
    tournament.pointsMonth = round1(tournament.weeks.reduce((acc, item) => acc + item.points, 0));
    tournament.top3Month = tournament.weeks.filter(item => item.position && item.position <= 3).length;

    const attacksByWeek = weekly.map(w => w.attacksTotal);
    const attacksMonth = attacksByWeek.reduce((a,b)=>a+b,0);
    const days44Month = weekly.reduce((acc,w)=>acc + w.days44,0);
    const perfectWeeks = weekly.filter(w => w.clinchit).length;
    const tournamentParticipationPoints = round1(tournament.weeks.reduce((acc, item) => acc + (item.participated ? Number(state.meta.tournamentRules.participation || 0) : 0), 0));
    const tournamentPlacementPoints = round1(tournament.weeks.reduce((acc, item) => {
      if(item.position === 1) return acc + Number(state.meta.tournamentRules.first || 0);
      if(item.position === 2) return acc + Number(state.meta.tournamentRules.second || 0);
      if(item.position === 3) return acc + Number(state.meta.tournamentRules.third || 0);
      return acc;
    }, 0));
    const tournamentPoints = round1(tournamentParticipationPoints + tournamentPlacementPoints);
    const clinchitPoints = perfectWeeks * 3;
    const classificationPoints = attacksMonth + tournamentPoints + clinchitPoints;
    const scoreIntegrated = attacksMonth + tournamentPoints;
    const weeksStarted = [1,2,3,4].filter((week, idx) => {
      return attacksByWeek[idx] > 0 || tournament.weeks[idx].participated || tournament.weeks[idx].position;
    }).length;
    maxWeeksStarted = Math.max(maxWeeksStarted, weeksStarted);
    const expectedAttacks = weeksStarted * 16;
    const baseWarBonus = perfectWeeks * 3 + (days44Month >= 12 ? 5 : days44Month >= 8 ? 3 : days44Month >= 4 ? 1 : 0);
    const penalty = weeksStarted >= 2 && attacksMonth === 0 && tournamentPoints === 0 ? 6 : (weeksStarted >= 1 && attacksMonth < Math.max(1, weeksStarted*8) ? 2 : 0);
    const scorePro = round1(attacksMonth * 0.6 + tournamentPoints * 0.4 + baseWarBonus - penalty);
    const scoreElite = round2(scorePro + (member.eligibleTournament ? 0.2 : 0) + tournament.top3Month*0.2 + days44Month*0.05);
    let confidence = 'BAIXA';
    if(weeksStarted === 0) confidence = 'NÃO INICIADO';
    else if(perfectWeeks === weeksStarted && tournamentPoints > 0) confidence = 'ALTA';
    else if(attacksMonth >= expectedAttacks || tournamentPoints > 0 || perfectWeeks > 0) confidence = 'MÉDIA';
    let activityStatus = (attacksMonth === 0 && tournamentPoints === 0) ? 'INATIVO' : 'ATIVO';
    let warPriority = 'BAIXA';
    if(weeksStarted === 0) warPriority = 'NÃO INICIADO';
    else if(attacksMonth < Math.max(1, weeksStarted*8)) warPriority = 'CRÍTICA';
    else if(attacksMonth < expectedAttacks) warPriority = 'ALTA';
    else if(tournamentPoints === 0) warPriority = 'MÉDIA';
    let alert = 'ESTÁVEL';
    if(weeksStarted === 0) alert = 'NÃO INICIADO';
    else if(activityStatus === 'INATIVO' && weeksStarted >= 2) alert = 'EXPULSÃO';
    else if(attacksMonth < Math.max(1, weeksStarted*8) && tournamentPoints === 0) alert = 'RISCO';
    else if(attacksMonth < expectedAttacks || tournamentPoints === 0) alert = 'OBSERVAÇÃO';
    let suggestion = suggestionFor(member, {scoreElite, scorePro, confidence, attacksMonth, weeksStarted, tournamentPoints, activityStatus});
    let progressStatus = weeksStarted === 0 ? 'AGUARDANDO INÍCIO' : attacksMonth >= expectedAttacks ? 'NO RITMO' : 'ABAIXO DO RITMO';

    summaries.push({
      member, weekly, tournament, attacksByWeek, attacksMonth, days44Month, perfectWeeks,
      tournamentPoints, tournamentParticipationPoints, tournamentPlacementPoints, clinchitPoints, classificationPoints,
      scoreIntegrated, scorePro, scoreElite, confidence, warPriority,
      alert, suggestion, activityStatus, expectedAttacks, weeksStarted, progressStatus,
      baseWarBonus, penalty
    });
  }

  summaries.sort((a,b) => (b.scoreElite - a.scoreElite) || (b.scoreIntegrated - a.scoreIntegrated) || (b.attacksMonth - a.attacksMonth) || roleWeight(b.member.role)-roleWeight(a.member.role) || a.member.name.localeCompare(b.member.name));
  summaries.forEach((item, index) => item.rankElite = index + 1);

  const attackTotalClan = summaries.reduce((acc,s) => acc + s.attacksMonth, 0);
  const tournamentTotalClan = round1(summaries.reduce((acc,s)=>acc + s.tournamentPoints, 0));
  const avgElite = summaries.length ? round1(summaries.reduce((acc,s)=>acc + s.scoreElite, 0) / summaries.length) : 0;
  const riskCount = summaries.filter(s => ['RISCO','EXPULSÃO'].includes(s.alert)).length;
  const reviewCount = summaries.filter(s => s.suggestion === 'REVISAR CARGO').length;
  const promoteCount = summaries.filter(s => s.suggestion === 'PROMOVER').length;
  const expelCount = summaries.filter(s => s.suggestion === 'EXPULSAR').length;

  return {summaries, attackTotalClan, tournamentTotalClan, avgElite, riskCount, reviewCount, promoteCount, expelCount, maxWeeksStarted};
}
function suggestionFor(member, stats){
  const role = member.role || 'Membro';
  if(/líder/i.test(role)) return 'MANTER';
  if(stats.activityStatus === 'INATIVO' && stats.weeksStarted >= 2) return 'EXPULSAR';
  if(/co-líder/i.test(role)){
    return stats.scoreElite < 11 || stats.confidence === 'BAIXA' ? 'REVISAR CARGO' : 'MANTER';
  }
  if(/ancião/i.test(role)){
    if(stats.scoreElite >= 11.5 && stats.confidence !== 'BAIXA') return 'PROMOVER';
    if(stats.scoreElite < 5 && stats.weeksStarted >= 2) return 'OBSERVAR';
    return 'MANTER';
  }
  if(stats.scoreElite >= 10 && stats.confidence !== 'BAIXA') return 'PROMOVER';
  if(stats.scoreElite < 4 && stats.weeksStarted >= 2) return 'EXPULSAR';
  return 'OBSERVAR';
}
function round1(n){ return Math.round((Number(n)||0) * 10) / 10; }
function round2(n){ return Math.round((Number(n)||0) * 100) / 100; }
function pct(current,total){
  if(!total) return 0;
  return Math.max(0, Math.min(100, Math.round((current/total)*100)));
}
function render(){
  const month = state.meta.currentMonth;
  const week = Number(state.meta.currentWeek || 1);
  const ctx = monthContext(month);
  const goals = state.goals[month] || {attacks:1200,tournament:80};

  if(ui.heroMonth) ui.heroMonth.textContent = monthLabel(month);
  if(ui.heroClanName) ui.heroClanName.textContent = state.meta.clanName || 'TOP BR’S 🇧🇷⚔️';
  if(ui.heroSync) ui.heroSync.textContent = '';

  renderKPIs(ctx, goals);
  renderPodium(ctx);
  renderGoals(ctx, goals);
  renderRanking(ctx);
  renderLeaderActions(ctx);
  renderAnnualPulse();
  renderWarBoard(ctx, week);
  renderTournamentEditor(ctx, week);
  renderTournamentBoard(ctx);
  renderClassification();
  renderEliteBoard(ctx);
  renderHistory(ctx);
  renderMembers(ctx);
  renderVault(ctx, goals);
  renderUsersView();
  const activeViewId = document.querySelector('.view.active')?.id || 'arenaView';
  if(ui.weekHeroPicker){ ui.weekHeroPicker.classList.toggle('hidden', ['arenaView','eliteView'].includes(activeViewId)); }
  updateSelectors();
  window.TOPBRS_REMOTE?.afterRender?.();
}

function updateSelectors(){
  ui.monthSelect.innerHTML = seedData.meta.months.map(m => `<option value="${m}" ${m===state.meta.currentMonth?'selected':''}>${monthLabel(m)}</option>`).join('');
  ui.weekSelect.value = String(state.meta.currentWeek || 1);
  if(ui.monthChipBar){
    ui.monthChipBar.innerHTML = seedData.meta.months.map(m => {
      const shortLabel = monthLabel(m).slice(0,3);
      return `<button class="hero-chip ${m===state.meta.currentMonth?'active':''}" type="button" data-month-chip="${m}">${shortLabel}</button>`;
    }).join('');
  }
  if(ui.weekChipBar){
    ui.weekChipBar.innerHTML = [1,2,3,4].map(week => `<button class="hero-chip ${week===Number(state.meta.currentWeek||1)?'active':''}" type="button" data-week-chip="${week}">S${week}</button>`).join('');
  }
  if(ui.classificationMonthSelect){
    const selectedMonth = state.ui.classificationMonth || state.meta.currentMonth;
    ui.classificationMonthSelect.innerHTML = seedData.meta.months.map(m => `<option value="${m}" ${m===selectedMonth?'selected':''}>${monthLabel(m)}</option>`).join('');
  }
}
function renderKPIs(ctx, goals){
  const leader = ctx.summaries[0];
  const cards = [
    {label:'Ataques do clã', value:ctx.attackTotalClan, hint:`Meta ${goals.attacks}`, tone: ctx.attackTotalClan >= goals.attacks ? 'success' : ''},
    {label:'Pontos torneio', value:ctx.tournamentTotalClan, hint:`Meta ${goals.tournament}`, tone: ctx.tournamentTotalClan >= goals.tournament ? 'success' : 'gold'},
    {label:'Média elite', value:ctx.avgElite, hint:`MVP ${leader ? esc(leader.member.name) : '-'}`, tone:'gold'},
    {label:'Riscos críticos', value:ctx.riskCount, hint:`${ctx.reviewCount} revisar • ${ctx.expelCount} expulsão`, tone: ctx.riskCount ? 'danger' : 'success'}
  ];
  ui.kpiGrid.innerHTML = cards.map(card => `
    <article class="kpi ${card.tone}">
      <div class="label">${card.label}</div>
      <div class="value">${card.value}</div>
      <div class="hint">${card.hint}</div>
    </article>
  `).join('');
}
function renderPodium(ctx){
  const top3 = ctx.summaries.slice(0,3);
  if(!top3.length){
    ui.podium.innerHTML = '<div class="empty">Sem dados no mês.</div>';
    return;
  }
  const order = [1,0,2].filter(idx => top3[idx]).map(idx => ({item:top3[idx], slot: idx===0?'first':idx===1?'second':'third'}));
  ui.podium.innerHTML = `<div class="podium">` + order.map(({item,slot}) => `
    <article class="podium-card ${slot}">
      <div class="podium-rank">${slot==='first'?'🥇':slot==='second'?'🥈':'🥉'}</div>
      <div class="podium-name">${esc(item.member.name)}</div>
      <div class="podium-role">${esc(item.member.role)}</div>
      <div class="podium-score">${item.scoreElite}</div>
      <div class="chips">
        <span class="chip blue">${item.attacksMonth} ataques</span>
        <span class="chip ${item.confidence==='ALTA'?'good':item.confidence==='MÉDIA'?'warn':'bad'}">${item.confidence}</span>
      </div>
    </article>
  `).join('') + `</div>`;
}
function renderGoals(ctx, goals){
  const attackPct = pct(ctx.attackTotalClan, goals.attacks || 0);
  const tournamentPct = pct(ctx.tournamentTotalClan, goals.tournament || 0);
  ui.goalPanel.innerHTML = `
    <div class="goal-grid">
      <div class="goal-stat">
        <div class="goal-row"><span>Ataques</span><span>${ctx.attackTotalClan} / ${goals.attacks}</span></div>
        <div class="progress"><span style="width:${attackPct}%"></span></div>
        <strong>${attackPct}%</strong>
      </div>
      <div class="goal-stat">
        <div class="goal-row"><span>Torneio</span><span>${ctx.tournamentTotalClan} / ${goals.tournament}</span></div>
        <div class="progress"><span style="width:${tournamentPct}%"></span></div>
        <strong>${tournamentPct}%</strong>
      </div>
    </div>
  `;
}
function renderRanking(ctx){
  const items = [...ctx.summaries];
  items.sort((a,b) => rankMode === 'elite'
    ? (b.scoreElite - a.scoreElite) || (b.scoreIntegrated - a.scoreIntegrated)
    : (b.scoreIntegrated - a.scoreIntegrated) || (b.scoreElite - a.scoreElite));
  const scoreLabel = rankMode === 'elite' ? 'Score ELITE' : 'Score Integrado';
  const scoreKey = rankMode === 'elite' ? 'scoreElite' : 'scoreIntegrated';
  const leader = items[0];
  ui.rankingList.innerHTML = `
    <div class="classification-wrap football-style tournament-style replicated-ranking-table">
      ${leader ? `
      <div class="classification-leader-card tournament-leader-card">
        <div class="leader-crown">${rankMode === 'elite' ? '👑' : '📊'}</div>
        <div class="leader-copy">
          <span class="leader-label">${scoreLabel}</span>
          <strong>${esc(leader.member.name)}</strong>
          <small>${esc(leader.member.role)} • ${leader.attacksMonth} ataques • ${leader.tournamentPoints} torneio</small>
        </div>
        <div class="leader-points-box">
          <span>PTS</span>
          <strong>${leader[scoreKey]}</strong>
        </div>
      </div>` : ''}
      <div class="classification-table tournament-table-shell">
        <div class="classification-grid tournament-grid compact-grid ranking-grid-table">
          <div class="classification-head tournament-head compact-head ranking-head-table">
            <div>#</div>
            <div>Membro</div>
            <div>PTS</div>
            <div>ATQ</div>
            <div>TOR</div>
            <div>CL</div>
            <div>STS</div>
          </div>
          ${items.slice(0,8).map((item,idx) => {
            const topClass = idx < 5 ? 'top5' : idx < 8 ? 'top10' : '';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1);
            const tone = item.alert === 'EXPULSÃO' ? 'bad' : item.alert === 'RISCO' ? 'warn' : 'good';
            return `
              <div class="classification-row tournament-row compact-row ranking-table-row ${topClass} ${idx===0?'leader-row':''}">
                <div class="classification-rank"><span class="classification-badge">${medal}</span></div>
                <div class="classification-name tournament-name-cell ranking-name-cell">
                  <strong>${esc(item.member.name)}</strong>
                  <span>${esc(item.member.role)} • ${scoreLabel}</span>
                </div>
                <div class="classification-cell points">${item[scoreKey]}</div>
                <div class="classification-cell standings-cell">${item.attacksMonth}</div>
                <div class="classification-cell standings-cell">${item.tournamentPoints}</div>
                <div class="classification-cell standings-cell">${item.clinchitPoints}</div>
                <div class="classification-cell standings-cell status"><span class="mini-chip ${tone}">${item.alert}</span></div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
function renderLeaderActions(ctx){
  const actions = [
    ['🚀 Promover', ctx.summaries.filter(s => s.suggestion === 'PROMOVER')],
    ['⚔️ Revisar cargo', ctx.summaries.filter(s => s.suggestion === 'REVISAR CARGO')],
    ['❌ Expulsar', ctx.summaries.filter(s => s.suggestion === 'EXPULSAR')],
    ['👑 MVP', ctx.summaries.slice(0,1)]
  ];
  ui.leaderActions.innerHTML = actions.map(([title, list]) => `
    <article class="leader-card">
      <div class="leader-top">
        <strong>${title}</strong>
        <span class="chip ${title.includes('Expuls')?'bad':title.includes('Promover')?'good':'warn'}">${list.length}</span>
      </div>
      <div class="chips">
        ${list.length ? list.slice(0,4).map(item => `<span class="chip blue">${esc(item.member.name)}</span>`).join('') : '<span class="mini">Nenhum nome agora.</span>'}
      </div>
    </article>
  `).join('');
}
function annualSummary(){
  const members = activeMembers();
  const rows = members.map(member => {
    let attacksYear = 0, tournamentYear = 0, days44Year = 0, perfectWeeks = 0, eliteTotal = 0;
    for(const month of seedData.meta.months){
      const summary = monthContext(month).summaries.find(s => s.member.name === member.name);
      if(summary){
        attacksYear += summary.attacksMonth;
        tournamentYear += summary.tournamentPoints;
        days44Year += summary.days44Month;
        perfectWeeks += summary.perfectWeeks;
        eliteTotal += summary.scoreElite;
      }
    }
    return {member, attacksYear, tournamentYear, days44Year, perfectWeeks, eliteTotal: round1(eliteTotal)};
  }).sort((a,b) => (b.eliteTotal - a.eliteTotal) || (b.attacksYear - a.attacksYear));
  rows.forEach((row,idx) => row.rank = idx+1);
  return rows;
}
function renderAnnualPulse(){
  const rows = annualSummary().slice(0,5);
  ui.annualPulse.innerHTML = rows.map(row => `
    <article class="pulse-card">
      <div class="pulse-top">
        <strong>${row.rank}. ${esc(row.member.name)}</strong>
        <span class="chip ${row.rank===1?'good':'blue'}">${row.eliteTotal} elite ano</span>
      </div>
      <div class="chips">
        <span class="chip">${row.attacksYear} ataques</span>
        <span class="chip">${row.tournamentYear} torneio</span>
        <span class="chip">${row.days44Year} dias 4/4</span>
      </div>
    </article>
  `).join('');
}
function renderWarBoard(ctx, week){
  let filtered = filteredSummariesForTools(ctx, 'war').filter(item => {
    if(warFilter === 'risk') return ['RISCO','EXPULSÃO'].includes(item.alert);
    if(warFilter === 'safe') return item.alert === 'OK';
    return true;
  });
  const quickbar = renderToolQuickbar('war', filtered.length);
  if(!filtered.length){
    ui.warBoard.innerHTML = quickbar + '<div class="empty">Nenhum membro encontrado nesse filtro.</div>';
    return;
  }
  ui.warBoard.innerHTML = quickbar + filtered.map(item => {
    const weekData = item.weekly[week-1];
    const collapsed = isCollapsed('war', item.member.name);
    const memberKey = slugify(item.member.name);
    return `
      <article class="war-row ${collapsed?'collapsed':''}" id="war-${memberKey}" data-member-name="${esc(item.member.name)}" data-member-role="${esc(item.member.role)}">
        <div class="war-top">
          <div>
            <strong>${esc(item.member.name)}</strong>
            <small>${esc(item.member.role)} • ${weekData.attacksTotal} ataques • ${weekData.days44} dias 4/4</small>
          </div>
          <div class="war-stats">
            <span class="chip ${weekData.clinchit?'good':'warn'}">${weekData.clinchit?'CLINCHIT':'SEM FECHAR'}</span>
            <span class="chip ${item.alert==='EXPULSÃO'?'bad':item.alert==='RISCO'?'warn':'blue'}">${item.alert}</span>
            <button class="collapse-toggle" type="button" data-collapse-member="war|${encodeURIComponent(item.member.name)}" aria-expanded="${collapsed?'false':'true'}">${collapsed?'Expandir':'Recolher'}</button>
          </div>
        </div>
        <div class="member-collapsible ${collapsed?'is-collapsed':''}">
          <div class="day-grid">
            ${dayOrder.map(day => `
              <div class="day-card">
                <div class="day-title">${day}</div>
                <div class="attack-grid">
                  ${weekData.days[day].attacks.map((on, idx) => `<button class="attack-btn ${on?'on':'off'}" data-toggle-attack="${encodeURIComponent(item.member.name)}|${week}|${day}|${idx}">${on?'✅':'—'}</button>`).join('')}
                </div>
                <div class="chips"><span class="chip ${weekData.days[day].fourFour?'good':'warn'}">${weekData.days[day].total}/4</span></div>
              </div>
            `).join('')}
          </div>
        </div>
      </article>
    `;
  }).join('');
}
function renderTournamentEditor(ctx, week){
  const filtered = filteredSummariesForTools(ctx, 'tournament');
  const quickbar = renderToolQuickbar('tournament', filtered.length);
  ui.tournamentEditor.innerHTML = quickbar + filtered.map(item => {
    const tw = item.tournament.weeks[week-1];
    const payload = `${encodeURIComponent(item.member.name)}|${week}`;
    const collapsed = isCollapsed('tournament', item.member.name);
    const memberKey = slugify(item.member.name);
    return `
      <article class="tour-row compact ${collapsed?'collapsed':''}" id="tour-${memberKey}" data-member-name="${esc(item.member.name)}" data-member-role="${esc(item.member.role)}">
        <div class="tour-main">
          <div class="tour-identity">
            <strong>${esc(item.member.name)}</strong>
            <span class="chip blue">${esc(item.member.role)}</span>
          </div>
          <div class="tour-main-actions">
            <div class="tour-points-inline"><span class="chip ${tw.points>=6?'good':tw.points>0?'blue':'warn'}">${tw.points} pts</span></div>
            <button class="collapse-toggle" type="button" data-collapse-member="tournament|${encodeURIComponent(item.member.name)}" aria-expanded="${collapsed?'false':'true'}">${collapsed?'Expandir':'Recolher'}</button>
          </div>
        </div>
        <div class="member-collapsible ${collapsed?'is-collapsed':''}">
          <div class="tour-actions-grid">
            <button class="toggle ${tw.participated?'on':''}" data-toggle-participation="${payload}">${tw.participated?'Participou':'Participar'}</button>
            <div class="tour-medals">
              <button class="mini-medal ${tw.position===1?'active gold':''}" data-quick-position="${payload}" data-position-value="1">🥇</button>
              <button class="mini-medal ${tw.position===2?'active silver':''}" data-quick-position="${payload}" data-position-value="2">🥈</button>
              <button class="mini-medal ${tw.position===3?'active bronze':''}" data-quick-position="${payload}" data-position-value="3">🥉</button>
            </div>
            <label class="tour-position-field">
              <span>Posição</span>
              <input type="number" min="1" max="${activeMembers().length}" value="${tw.position ?? ''}" data-position-input="${payload}" placeholder="#">
            </label>
          </div>
        </div>
      </article>
    `;
  }).join('') + (!filtered.length ? '<div class="empty">Nenhum membro encontrado nesse filtro.</div>' : '');
}
function renderTournamentBoard(ctx){
  const rows = [...ctx.summaries].sort((a,b) => (b.tournamentPoints - a.tournamentPoints) || (b.scoreElite - a.scoreElite) || a.member.name.localeCompare(b.member.name));
  const leader = rows[0];
  ui.tournamentBoard.innerHTML = `
    <div class="classification-wrap football-style tournament-style">
      ${leader ? `
      <div class="classification-leader-card tournament-leader-card">
        <div class="leader-crown">🏆</div>
        <div class="leader-copy">
          <span class="leader-label">Líder do torneio</span>
          <strong>${esc(leader.member.name)}</strong>
          <small>${esc(leader.member.role)} • ${leader.tournament.top3Month} top 3 no mês</small>
        </div>
        <div class="leader-points-box">
          <span>PTS</span>
          <strong>${leader.tournamentPoints}</strong>
        </div>
      </div>` : ''}
      <div class="classification-table tournament-table-shell">
        <div class="classification-grid tournament-grid compact-grid">
          <div class="classification-head tournament-head compact-head">
            <div>#</div>
            <div>Membro</div>
            <div>PTS</div>
            <div>S1</div>
            <div>S2</div>
            <div>S3</div>
            <div>S4</div>
          </div>
          ${rows.map((item,idx) => {
            const topClass = idx < 5 ? 'top5' : idx < 10 ? 'top10' : '';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1);
            return `
              <div class="classification-row tournament-row compact-row ${topClass}">
                <div class="classification-rank"><span class="classification-badge">${medal}</span></div>
                <div class="classification-name tournament-name-cell">
                  <strong>${esc(item.member.name)}</strong>
                  <span>${esc(item.member.role)} • Top 3: ${item.tournament.top3Month}</span>
                </div>
                <div class="classification-cell points">${item.tournamentPoints}</div>
                ${item.tournament.weeks.map(w=>`<div class="classification-cell standings-cell"><span class="week-mini ${w.participated?'played':''}">${w.points}</span></div>`).join('')}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}
function previousMonth(month){
  const idx = seedData.meta.months.indexOf(month);
  return idx > 0 ? seedData.meta.months[idx - 1] : null;
}
function classificationRows(month){
  const ctx = monthContext(month);
  const rows = [...ctx.summaries].sort((a,b) =>
    (b.classificationPoints - a.classificationPoints) ||
    (b.attacksMonth - a.attacksMonth) ||
    (b.tournamentPoints - a.tournamentPoints) ||
    (b.perfectWeeks - a.perfectWeeks) ||
    a.member.name.localeCompare(b.member.name)
  );
  rows.forEach((item, idx) => {
    item.classificationRank = idx + 1;
  });
  return rows;
}
function movementMeta(month, name, currentRank){
  const prevMonth = previousMonth(month);
  if(!prevMonth) return {icon:'—', cls:'flat', label:'Sem mês anterior'};
  const prevRows = classificationRows(prevMonth);
  const prevRank = prevRows.findIndex(item => item.member.name === name);
  if(prevRank === -1) return {icon:'★', cls:'new', label:'Novo na tabela'};
  const delta = (prevRank + 1) - currentRank;
  if(delta > 0) return {icon:'↑', cls:'up', label:`Subiu ${delta}`};
  if(delta < 0) return {icon:'↓', cls:'down', label:`Caiu ${Math.abs(delta)}`};
  return {icon:'→', cls:'flat', label:'Sem mudança'};
}

function renderClassification(){
  const month = state.ui.classificationMonth || state.meta.currentMonth;
  const allRows = classificationRows(month);
  const query = (state.ui.classificationQuery || '').trim().toLowerCase();
  const roleFilter = state.ui.classificationRole || 'ALL';
  const filteredRows = allRows.filter(item => {
    const roleOk = roleFilter === 'ALL' ? true : item.member.role === roleFilter;
    const searchOk = !query ? true : item.member.name.toLowerCase().includes(query);
    return roleOk && searchOk;
  });
  const rows = filteredRows.map(item => ({
    ...item,
    movement: movementMeta(month, item.member.name, item.classificationRank)
  }));
  const top5Points = allRows.slice(0,5).reduce((acc,item) => acc + item.classificationPoints, 0);
  const perfectWeeks = allRows.reduce((acc,item) => acc + item.perfectWeeks, 0);
  const totalPoints = allRows.reduce((acc,item) => acc + item.classificationPoints, 0);
  const totalAttacks = allRows.reduce((acc,item) => acc + item.attacksMonth, 0);
  const leader = allRows[0];
  const leaderGap = allRows.length > 1 ? Math.max(0, leader.classificationPoints - allRows[1].classificationPoints) : (leader?.classificationPoints || 0);
  const roles = ['ALL', ...new Set(state.members.filter(m => m.status !== 'ARQUIVADO').map(m => m.role))];
  const monthButtons = seedData.meta.months.map(m => `<button class="month-chip ${m === month ? 'active' : ''}" data-classification-month="${m}">${monthLabel(m).slice(0,3)}</button>`).join('');
  const medalFor = rank => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

  ui.classificationBoard.innerHTML = `
    <div class="classification-wrap football-standings">
      <div class="classification-topbar">
        <div class="classification-topbar-copy">
          <span class="classification-kicker">Tabela mensal estilo campeonato</span>
          <strong>${monthLabel(month)} • ranking por pontuação total</strong>
          <small>${rows.length === allRows.length ? 'Todos os membros exibidos' : `Filtro ativo: ${rows.length} membro(s)`}</small>
        </div>
        <div class="classification-topbar-stats">
          <div><span>Pontos</span><strong>${totalPoints}</strong></div>
          <div><span>Ataques</span><strong>${totalAttacks}</strong></div>
          <div><span>Top 5</span><strong>${top5Points}</strong></div>
        </div>
      </div>

      <div class="classification-month-strip">
        ${monthButtons}
      </div>

      <div class="classification-toolbar football-toolbar compact">
        <label class="field search-field">
          <span>Buscar membro</span>
          <input id="classificationQueryInput" type="search" placeholder="Digite um nome..." value="${esc(state.ui.classificationQuery || '')}">
        </label>
        <label class="field role-field">
          <span>Filtro por cargo</span>
          <select id="classificationRoleSelect">
            ${roles.map(role => `<option value="${esc(role)}" ${role === roleFilter ? 'selected' : ''}>${role === 'ALL' ? 'Todos os cargos' : esc(role)}</option>`).join('')}
          </select>
        </label>
      </div>

      ${leader ? `
      <div class="classification-highlight-row">
        <article class="classification-highlight-card leader">
          <span class="classification-highlight-label">Líder do mês</span>
          <strong>👑 ${esc(leader.member.name)}</strong>
          <small>${leader.classificationPoints} pts • ${leader.attacksMonth} ataques • ${leaderGap} pts de vantagem</small>
        </article>
        <article class="classification-highlight-card month formula">
          <span class="classification-highlight-label">Fórmula</span>
          <strong>ATQ + PAR + TOR + CL</strong>
          <small>ATQ = 1 ponto por ataque • PAR = participação • TOR = posição no torneio • CL = 3 por semana 16/16</small>
        </article>
      </div>` : ''}

      <div class="classification-table football-board football-standings-board upgraded">
        <div class="classification-grid standings-grid upgraded">
          <div class="classification-head standings-head upgraded">
            <div>#</div>
            <div>Membro</div>
            <div>PTS</div>
            <div>ATQ</div>
            <div>PAR</div>
            <div>TOR</div>
            <div>CL</div>
          </div>
          ${rows.length ? rows.map(item => `
            <div class="classification-row standings-row upgraded ${item.classificationRank <= 5 ? 'zone-green' : 'zone-blue'} ${item.classificationRank<=3 ? 'podium-row' : ''} ${item.classificationRank===1 ? 'leader-row' : ''}">
              <div class="classification-rank standings-rank">
                <span class="classification-badge standings-badge ${item.classificationRank <= 5 ? 'green' : 'blue'}">${item.classificationRank}</span>
              </div>
              <div class="classification-name standings-name upgraded">
                <strong>${item.classificationRank <= 3 ? `<span class="standings-medal">${medalFor(item.classificationRank)}</span>` : ''}${esc(item.member.name)}</strong>
                <span>${esc(item.member.role)} • ${item.movement.icon} ${item.movement.label}</span>
                <div class="classification-inline-tags">
                  <span class="inline-tag points">${item.classificationPoints} pts total</span>
                  <span class="inline-tag attacks">${item.attacksMonth} ataques</span>
                </div>
              </div>
              <div class="classification-cell standings-cell points primary">${item.classificationPoints}</div>
              <div class="classification-cell standings-cell attacks">${item.attacksMonth}</div>
              <div class="classification-cell standings-cell">${item.tournamentParticipationPoints}</div>
              <div class="classification-cell standings-cell">${item.tournamentPlacementPoints}</div>
              <div class="classification-cell standings-cell">${item.clinchitPoints}</div>
            </div>
          `).join('') : `<div class="empty classification-empty">Nenhum membro encontrado com esse filtro.</div>`}
        </div>
      </div>

      <div class="classification-footnote-grid">
        <div class="classification-note strong">Top 5 em verde, demais colocados em azul • medalhas no top 3 • animação aplicada ao líder do mês</div>
        <div class="classification-note">Clinchit = 3 pontos para cada semana fechada com 16/16 ataques.</div>
      </div>
    </div>
  `;
}

function renderEliteBoard(ctx){
  const rows = [...ctx.summaries].sort((a,b)=>(b.scoreElite-a.scoreElite) || (b.classificationPoints-a.classificationPoints) || a.member.name.localeCompare(b.member.name));
  const leader = rows[0];
  ui.eliteBoard.innerHTML = `
    <div class="classification-wrap football-style tournament-style elite-selection-table">
      ${leader ? `
      <div class="classification-leader-card tournament-leader-card">
        <div class="leader-crown">👑</div>
        <div class="leader-copy">
          <span class="leader-label">Seleção elite</span>
          <strong>${esc(leader.member.name)}</strong>
          <small>${esc(leader.member.role)} • confiança ${leader.confidence} • ${leader.warPriority}</small>
        </div>
        <div class="leader-points-box">
          <span>ELT</span>
          <strong>${leader.scoreElite}</strong>
        </div>
      </div>` : ''}
      <div class="classification-table tournament-table-shell">
        <div class="classification-grid tournament-grid compact-grid elite-grid-table">
          <div class="classification-head tournament-head compact-head elite-head-table">
            <div>#</div>
            <div>Membro</div>
            <div>ELT</div>
            <div>ATQ</div>
            <div>TOR</div>
            <div>PRI</div>
            <div>CF</div>
          </div>
          ${rows.slice(0,12).map((item,idx) => {
            const topClass = idx < 5 ? 'top5' : idx < 10 ? 'top10' : '';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1);
            return `
              <div class="classification-row tournament-row compact-row elite-table-row ${topClass} ${idx===0?'leader-row':''}">
                <div class="classification-rank"><span class="classification-badge">${medal}</span></div>
                <div class="classification-name tournament-name-cell ranking-name-cell">
                  <strong>${esc(item.member.name)}</strong>
                  <span>${esc(item.member.role)} • ${item.suggestion}</span>
                </div>
                <div class="classification-cell points">${item.scoreElite}</div>
                <div class="classification-cell standings-cell">${item.attacksMonth}</div>
                <div class="classification-cell standings-cell">${item.tournamentPoints}</div>
                <div class="classification-cell standings-cell"><span class="mini-chip ${item.warPriority==='CRÍTICA'?'bad':item.warPriority==='ALTA'?'warn':'good'}">${item.warPriority.slice(0,3)}</span></div>
                <div class="classification-cell standings-cell"><span class="mini-chip ${item.confidence==='ALTA'?'good':item.confidence==='MÉDIA'?'warn':'bad'}">${item.confidence.slice(0,1)}</span></div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}
function renderHistory(ctx){
  const month = state.meta.currentMonth;
  const history = state.history.filter(item => normalizeMonth(item.month) === month).slice(0,12);
  const rows = history.length ? history : ctx.summaries.slice(0,12).map(item => ({
    name:item.member.name, month:monthLabel(month), suggestion:item.suggestion, confidence:item.confidence, priority:item.warPriority, alert:item.alert, observation:item.progressStatus
  }));
  ui.historyBoard.innerHTML = rows.map(item => `
    <article class="history-card">
      <strong>${esc(item.name)}</strong>
      <div class="chips">
        <span class="chip blue">${esc(item.suggestion || '-')}</span>
        <span class="chip ${item.confidence==='ALTA'?'good':item.confidence==='MÉDIA'?'warn':'bad'}">${esc(item.confidence || '—')}</span>
      </div>
      <small>${esc(item.observation || '')}</small>
    </article>
  `).join('');
}
function normalizeMonth(label){
  if(!label) return '';
  const cleaned = label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  return Object.keys(monthLabels).find(key => key.normalize('NFD').replace(/[\u0300-\u036f]/g,'') === cleaned) || cleaned;
}
function renderMembers(ctx){
  const summaries = Object.fromEntries(ctx.summaries.map(s => [s.member.name, s]));
  ui.membersGrid.innerHTML = state.members.map(member => {
    const summary = summaries[member.name];
    const elite = summary ? summary.scoreElite : 0;
    const tone = member.status === 'ARQUIVADO' ? 'bad' : summary?.alert === 'EXPULSÃO' ? 'bad' : summary?.alert === 'RISCO' ? 'warn' : 'good';
    return `
      <article class="member-card">
        <div class="member-top">
          <div>
            <strong>${esc(member.name)}</strong>
            <div class="mini">${esc(member.role)} • ${member.eligibleTournament ? 'Elegível torneio' : 'Sem torneio'}</div>
          </div>
          <span class="chip ${tone}">${member.status}</span>
        </div>
        <div class="chips">
          <span class="chip blue">ELITE ${elite || 0}</span>
          <span class="chip">${summary ? summary.suggestion : 'Sem mês ativo'}</span>
        </div>
        <div class="actions">
          <button class="ghost small" data-open-member="${esc(member.name)}">Perfil</button>
          <button class="ghost small" data-toggle-archive="${esc(member.name)}">${member.status === 'ARQUIVADO' ? 'Reativar' : 'Arquivar'}</button>
        </div>
      </article>
    `;
  }).join('');
}


function renderUsersView(){
  if(!ui.usersBoard) return;
  const users = Array.isArray(state.authUsers) ? state.authUsers : [];
  if(!users.length){
    ui.usersBoard.innerHTML = '<div class="empty">Nenhum usuário cadastrado ainda.</div>';
    return;
  }
  ui.usersBoard.innerHTML = `
    <div class="users-compact-list">
      ${users.map(user => `
        <button class="user-compact-item" type="button" data-open-user-edit="${esc(user.uid)}">
          <span class="user-compact-main">
            <strong>${esc(user.nick || user.name || user.email)}</strong>
            <small>${esc(user.clanRole || 'Membro')} • ${esc(user.accessRole || 'viewer')}</small>
          </span>
          <span class="user-compact-email">${esc(user.email || '')}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function openUserEdit(uid){
  if(!ui.userEditModal || !ui.userEditBody) return;
  const users = Array.isArray(state.authUsers) ? state.authUsers : [];
  const user = users.find(item => String(item.uid) === String(uid));
  if(!user) return;
  ui.userEditBody.innerHTML = `
    <div class="profile-popover-header user-edit-header">
      <strong>${esc(user.nick || user.name || user.email)}</strong>
      <small>${esc(user.email || '')}</small>
    </div>
    <div class="user-edit-grid compact-popup">
      <label class="field compact"><span>Nome</span><input type="text" value="${esc(user.name || '')}" data-user-name="${esc(user.uid)}"></label>
      <label class="field compact"><span>Nick</span><input type="text" value="${esc(user.nick || '')}" data-user-nick="${esc(user.uid)}"></label>
      <label class="field compact"><span>Cargo</span><input type="text" value="${esc(user.clanRole || 'Membro')}" data-user-clan-role="${esc(user.uid)}"></label>
      <label class="field compact"><span>Acesso</span><select data-user-access-role="${esc(user.uid)}"><option value="viewer" ${user.accessRole==='viewer'?'selected':''}>Leitura</option><option value="editor" ${user.accessRole==='editor'?'selected':''}>Editor</option><option value="admin" ${user.accessRole==='admin'?'selected':''}>Líder</option></select></label>
    </div>
    <div class="actions user-edit-actions">
      <button class="primary" data-save-user-profile="${esc(user.uid)}">Salvar</button>
      <button class="ghost danger" data-delete-user-profile="${esc(user.uid)}">Excluir usuário</button>
    </div>
    <p class="helper">A exclusão remove o usuário do sistema e bloqueia novo acesso com essa conta.</p>
  `;
  ui.userEditModal.classList.remove('hidden');
}
function closeUserEdit(){ ui.userEditModal?.classList.add('hidden'); }

function renderVault(ctx, goals){
  const annual = annualSummary();
  const archived = state.members.filter(m => m.status === 'ARQUIVADO').length;
  const currentTop = ctx.summaries[0];
  ui.vaultInsights.innerHTML = `
    <article class="insight-card">
      <div class="insight-top">
        <strong>Resumo rápido</strong>
        <span class="chip blue">${monthLabel(state.meta.currentMonth)}</span>
      </div>
      <div class="chips">
        <span class="chip">${activeMembers().length} ativos</span>
        <span class="chip">${archived} arquivados</span>
        <span class="chip">${ctx.maxWeeksStarted} semanas com atividade</span>
      </div>
    </article>
    <article class="insight-card">
      <div class="insight-top">
        <strong>Melhor do mês</strong>
        <span class="chip good">${currentTop ? currentTop.scoreElite : 0}</span>
      </div>
      <small>${currentTop ? esc(currentTop.member.name) + ' • ' + esc(currentTop.member.role) : 'Sem dados'}</small>
    </article>
    <article class="insight-card">
      <div class="insight-top">
        <strong>Topo anual</strong>
        <span class="chip gold">${annual[0] ? annual[0].eliteTotal : 0}</span>
      </div>
      <small>${annual[0] ? esc(annual[0].member.name) + ' lidera a temporada.' : 'Sem dados'}</small>
    </article>
    <article class="insight-card">
      <div class="insight-top">
        <strong>Metas</strong>
        <span class="chip">${goals.attacks}/${goals.tournament}</span>
      </div>
      <small>Ajuste as metas conforme o ritmo real da temporada.</small>
    </article>
  `;
}
function openMember(name){
  const member = state.members.find(m => m.name === name);
  if(!member) return;
  const annual = annualSummary().find(row => row.member.name === name);
  const bars = seedData.meta.months.map(month => {
    const summary = monthContext(month).summaries.find(s => s.member.name === name);
    const val = summary ? summary.scoreElite : 0;
    return {month, val};
  });
  const current = monthContext(state.meta.currentMonth).summaries.find(s => s.member.name === name);
  ui.memberModalBody.innerHTML = `
    <div class="profile-head">
      <div>
        <p class="eyebrow">Perfil mítico</p>
        <h3>${esc(member.name)}</h3>
        <div class="mini">${esc(member.role)} • ${member.status}</div>
      </div>
      <div class="chips">
        <span class="chip ${member.eligibleTournament ? 'good' : 'warn'}">${member.eligibleTournament ? 'Elegível torneio' : 'Não elegível'}</span>
        <span class="chip blue">Mês ${monthLabel(state.meta.currentMonth)}</span>
      </div>
    </div>
    <div class="meter-row">
      <div class="goal-row"><span>Score ELITE atual</span><strong>${current ? current.scoreElite : 0}</strong></div>
      <div class="goal-row"><span>Ataques mês</span><strong>${current ? current.attacksMonth : 0}</strong></div>
      <div class="goal-row"><span>Pontos torneio</span><strong>${current ? current.tournamentPoints : 0}</strong></div>
    </div>
    <div class="chips">
      <span class="chip ${current?.confidence === 'ALTA' ? 'good' : current?.confidence === 'MÉDIA' ? 'warn' : 'bad'}">${current?.confidence || 'Sem confiança'}</span>
      <span class="chip">${current?.suggestion || 'Sem sugestão'}</span>
      <span class="chip ${current?.alert === 'EXPULSÃO' ? 'bad' : current?.alert === 'RISCO' ? 'warn' : 'good'}">${current?.alert || 'Sem alerta'}</span>
    </div>
    <div style="margin:18px 0 10px" class="mini">Evolução do score elite por mês</div>
    <div class="month-bars">
      ${bars.map(item => `
        <div class="month-bar">
          <span class="mini">${monthLabel(item.month).slice(0,3)}</span>
          <div class="progress"><span style="width:${pct(item.val, 20)}%"></span></div>
          <strong>${item.val}</strong>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:18px" class="stack">
      <label class="field">
        <span>Nota do líder</span>
        <input type="text" value="${esc(member.notes?.leaderNote || member.notes?.manualNote || '')}" data-member-note="${esc(member.name)}">
      </label>
      <button class="primary" data-save-member-note="${esc(member.name)}">Salvar nota</button>
    </div>
    <div class="chips" style="margin-top:18px">
      <span class="chip blue">Ano ${annual ? annual.eliteTotal : 0} elite</span>
      <span class="chip">${annual ? annual.attacksYear : 0} ataques ano</span>
      <span class="chip">${annual ? annual.tournamentYear : 0} torneio ano</span>
    </div>
  `;
  ui.memberModal.classList.remove('hidden');
}
function closeMember(){ ui.memberModal.classList.add('hidden'); }
function openGoals(){
  const goals = state.goals[state.meta.currentMonth] || {attacks:1200,tournament:80};
  $('#goalAttacksInput').value = goals.attacks;
  $('#goalTournamentInput').value = goals.tournament;
  ui.goalModal.classList.remove('hidden');
}
function closeGoals(){ ui.goalModal.classList.add('hidden'); }

function openCreateMemberModal(){
  if(!ui.createMemberModal) return;
  ui.createMemberModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => ui.createMemberNick?.focus());
}
function closeCreateMemberModal(){
  if(!ui.createMemberModal) return;
  ui.createMemberModal.classList.add('hidden');
  if(ui.createMemberForm) ui.createMemberForm.reset();
  document.body.style.overflow = '';
}
function exportBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `topbrs-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const imported = hydrateSeed(JSON.parse(reader.result));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      location.reload();
    }catch(e){
      alert('Backup inválido ou incompatível com a versão atual.');
    }
  };
  reader.readAsText(file);
}
function toggleArchive(name){
  const member = state.members.find(m => m.name === name);
  if(!member) return;
  if(member.status === 'ARQUIVADO'){
    member.status = 'ATIVO';
    member.exitDate = null;
    member.exitReason = null;
  }else{
    member.status = 'ARQUIVADO';
    member.exitDate = new Date().toISOString().slice(0,10);
    member.exitReason = 'Arquivado pelo app';
  }
  saveState();
  render();
}
function addMember(){
  openCreateMemberModal();
}
function createMemberFromModal(){
  const name = (ui.createMemberNick?.value || '').trim();
  if(!name) return;
  const role = (ui.createMemberRole?.value || 'Ancião').trim() || 'Ancião';
  state.members.unshift({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    name, role, eligibleTournament:true, observation:'', status:'ATIVO',
    exitDate:null, exitReason:null, exitObservation:null, notes:{}
  });
  for(const month of seedData.meta.months){
    for(let week=1;week<=4;week++) ensureWeekMember(month, week, name);
    ensureTournamentMember(month, name);
  }
  saveState();
  closeCreateMemberModal();
  render();
}
function toggleAttack(payload){
  const [name, week, day, idx] = decodeURIComponent(payload).split('|');
  const record = ensureWeekMember(state.meta.currentMonth, Number(week), name);
  record.days[day].attacks[Number(idx)] = !record.days[day].attacks[Number(idx)];
  recomputeWeekRecord(record);
  saveState();
  render();
}
function toggleParticipation(payload){
  const [name, week] = decodeURIComponent(payload).split('|');
  const record = ensureTournamentMember(state.meta.currentMonth, name);
  const row = record.weeks[Number(week)-1];
  row.participated = !row.participated;
  row.points = computeTournamentPoints(row.position, row.participated);
  saveState();
  render();
}
function setTournamentPosition(payload, value){
  const [name, week] = decodeURIComponent(payload).split('|');
  const record = ensureTournamentMember(state.meta.currentMonth, name);
  const row = record.weeks[Number(week)-1];
  const position = value ? Number(value) : null;
  row.position = position;
  row.participated = !!position || row.participated;
  row.points = computeTournamentPoints(row.position, row.participated);
  saveState();
  render();
}
function updatePosition(payload, value){
  const [name, week] = decodeURIComponent(payload).split('|');
  const record = ensureTournamentMember(state.meta.currentMonth, name);
  const row = record.weeks[Number(week)-1];
  row.position = value ? Number(value) : null;
  if(row.position) row.participated = true;
  row.points = computeTournamentPoints(row.position, row.participated);
  saveState();
  render();
}
function saveMemberNote(name){
  const input = document.querySelector(`[data-member-note="${CSS.escape(name)}"]`);
  if(!input) return;
  const member = state.members.find(m => m.name === name);
  member.notes ||= {};
  member.notes.leaderNote = input.value;
  saveState();
  closeMember();
  render();
}
function openShareCard(){
  const ctx = monthContext(state.meta.currentMonth);
  const top = ctx.summaries.slice(0,5);
  const canvas = $('#shareCanvas');
  const c = canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);
  const grad = c.createLinearGradient(0,0,canvas.width,canvas.height);
  grad.addColorStop(0,'#0d1532');
  grad.addColorStop(.5,'#131f46');
  grad.addColorStop(1,'#24120c');
  c.fillStyle = grad;
  c.fillRect(0,0,canvas.width,canvas.height);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.beginPath(); c.arc(930,120,180,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(120,1180,220,0,Math.PI*2); c.fill();
  c.fillStyle = '#ffca55';
  c.font = '700 34px -apple-system, sans-serif';
  c.fillText("SISTEMA AUTOMÁTICO TOP BRS' 🇧🇷", 72, 96);
  c.fillStyle = '#ffffff';
  c.font = '900 74px -apple-system, sans-serif';
  c.fillText('Ranking Elite', 72, 176);
  c.font = '500 30px -apple-system, sans-serif';
  c.fillStyle = '#d9e4ff';
  c.fillText(monthLabel(state.meta.currentMonth) + ' • modo mito ativo', 72, 226);

  top.forEach((item, idx) => {
    const y = 292 + idx*184;
    c.fillStyle = 'rgba(10,16,34,0.72)';
    roundRect(c,72,y,936,144,28,true,false);
    c.fillStyle = idx===0 ? '#ffca55' : idx===1 ? '#d7e0ff' : idx===2 ? '#ffb26a' : '#53a2ff';
    roundRect(c,92,y+24,86,96,24,true,false);
    c.fillStyle = '#08101f';
    c.font = '900 44px -apple-system, sans-serif';
    c.fillText(String(idx+1), 124, y+84);
    c.fillStyle = '#ffffff';
    c.font = '800 40px -apple-system, sans-serif';
    c.fillText(item.member.name.slice(0,24), 204, y+68);
    c.fillStyle = '#aebee5';
    c.font = '500 26px -apple-system, sans-serif';
    c.fillText(`${item.member.role} • ${item.attacksMonth} ataques • ${item.tournamentPoints} torneio`, 204, y+106);
    c.fillStyle = '#ffffff';
    c.font = '900 50px -apple-system, sans-serif';
    c.fillText(String(item.scoreElite), 888, y+88);
    c.fillStyle = item.confidence === 'ALTA' ? '#7dffc7' : item.confidence === 'MÉDIA' ? '#ffe08f' : '#ff9ba7';
    c.font = '700 24px -apple-system, sans-serif';
    c.fillText(item.confidence, 834, y+116);
  });
  c.fillStyle = '#aebee5';
  c.font = '500 24px -apple-system, sans-serif';
  c.fillText('Gerado pelo Ultra PWA • offline • pronto para compartilhar', 72, 1290);

  canvas.toBlob(async blob => {
    const file = new File([blob], 'topbrs-ranking.png', {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:"TOP BRS' Ranking"});
    }else{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'topbrs-ranking.png';
      a.click();
    }
  });
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}


function scrollToTopSmooth(){
  try{
    window.scrollTo({top:0, behavior:'smooth'});
  }catch(e){
    window.scrollTo(0,0);
  }
}
function updateBackToTopVisibility(){
  if(!ui.backToTopBtn) return;
  const show = (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) > 320;
  ui.backToTopBtn.classList.toggle('visible', show);
}

function setActiveView(viewId){
  $all('.view').forEach(v => v.classList.toggle('active', v.id === viewId));
  $all('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  updateTopbarTitle(viewId);
  if(ui.heroSection){ ui.heroSection.classList.toggle('hidden', ['classificationView','vaultView','membersView','usersView'].includes(viewId)); }
  if(ui.weekHeroPicker){ ui.weekHeroPicker.classList.toggle('hidden', ['arenaView','eliteView'].includes(viewId)); }
  if(viewId !== 'vaultView') lastNonVaultView = viewId;
  closeDrawer();
  window.scrollTo({top:0, behavior:'smooth'});
}
function openDrawer(){
  ui.sideDrawer.classList.add('drawer-open');
  ui.drawerBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeDrawer(){
  ui.sideDrawer.classList.remove('drawer-open');
  ui.drawerBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleTouchStart(e){
  if(e.touches.length !== 1) return;
  const target = e.target;
  if(target.closest('input, textarea, select, button, .drawer-panel, .modal-card')) return;
  const t = e.touches[0];
  touchMenuState = {x:t.clientX, y:t.clientY, handled:false};
}
function handleTouchMove(e){
  if(!touchMenuState || touchMenuState.handled || e.touches.length !== 1) return;
  const t = e.touches[0];
  const dx = t.clientX - touchMenuState.x;
  const dy = t.clientY - touchMenuState.y;
  if(Math.abs(dx) < 70 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
  if(dx < 0 && !ui.sideDrawer.classList.contains('drawer-open')){
    openDrawer();
    touchMenuState.handled = true;
  }else if(dx > 0 && ui.sideDrawer.classList.contains('drawer-open')){
    closeDrawer();
    touchMenuState.handled = true;
  }
}
function handleTouchEnd(){
  touchMenuState = null;
}

function isVaultUnlocked(){
  try{
    return sessionStorage.getItem(VAULT_SESSION_KEY) === '1';
  }catch(e){
    return false;
  }
}
function unlockVaultSession(){
  try{ sessionStorage.setItem(VAULT_SESSION_KEY, '1'); }catch(e){}
}
function closeVaultPrompt(){
  if(!ui.vaultAccessModal) return;
  ui.vaultAccessModal.classList.add('hidden');
  ui.vaultAccessModal.setAttribute('aria-hidden','true');
  ui.vaultAccessError?.classList.add('hidden');
  if(ui.vaultPasswordInput) ui.vaultPasswordInput.value = '';
  document.body.style.overflow = '';
}
function openVaultPrompt(){
  if(!ui.vaultAccessModal) return;
  ui.vaultAccessModal.classList.remove('hidden');
  ui.vaultAccessModal.setAttribute('aria-hidden','false');
  ui.vaultAccessError?.classList.add('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => ui.vaultPasswordInput?.focus());
}
function signalVaultError(){
  const card = ui.vaultAccessModal?.querySelector('.vault-lock-card');
  ui.vaultAccessError?.classList.remove('hidden');
  if(card){
    card.classList.remove('error');
    void card.offsetWidth;
    card.classList.add('error');
  }
}
function requestVaultAccess(){
  if(isVaultUnlocked()){
    setActiveView('vaultView');
    return;
  }
  openVaultPrompt();
}


function showSyncToast(message, tone='default'){
  const old = document.querySelector('.sync-toast');
  if(old) old.remove();
  const toast = document.createElement('div');
  toast.className = `sync-toast ${tone}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 280); }, 1900);
}
async function handleManualRefresh(){
  const btn = ui.manualRefreshBtn;
  btn?.classList.add('spinning');
  const result = await window.TOPBRS_REMOTE?.refreshNow?.();
  btn?.classList.remove('spinning');
  if(result?.ok) showSyncToast('Sistema atualizado 🔄', 'success');
  else if(result?.reason === 'empty') showSyncToast('Nenhum dado online encontrado', 'warn');
  else if(result?.reason === 'not-configured') showSyncToast('Sync online indisponível', 'warn');
  else showSyncToast('Erro ao atualizar ❌', 'error');
}

function bind(){
  ui.monthSelect.addEventListener('change', e => { state.meta.currentMonth = e.target.value; state.ui.classificationMonth = e.target.value; saveState(); render(); });
  ui.classificationMonthSelect?.addEventListener('change', e => { state.ui.classificationMonth = e.target.value; saveState(); render(); });
  ui.weekSelect.addEventListener('change', e => { state.meta.currentWeek = Number(e.target.value); saveState(); render(); });
  document.body.addEventListener('click', e => {
    const viewBtn = e.target.closest('[data-view]');
    if(viewBtn){
      if(viewBtn.dataset.view === 'vaultView'){
        requestVaultAccess();
      }else{
        setActiveView(viewBtn.dataset.view);
      }
    }
    const rankBtn = e.target.closest('[data-rank-mode]');
    if(rankBtn){
      rankMode = rankBtn.dataset.rankMode;
      $all('[data-rank-mode]').forEach(btn => btn.classList.toggle('active', btn === rankBtn));
      render();
    }
    const warBtn = e.target.closest('[data-war-filter]');
    if(warBtn){
      warFilter = warBtn.dataset.warFilter;
      $all('[data-war-filter]').forEach(btn => btn.classList.toggle('active', btn === warBtn));
      render();
    }
    const collapseBtn = e.target.closest('[data-collapse-member]');
    if(collapseBtn){
      const [mode, encodedName] = collapseBtn.dataset.collapseMember.split('|');
      toggleMemberCollapse(mode, decodeURIComponent(encodedName || ''));
      return;
    }
    const attackBtn = e.target.closest('[data-toggle-attack]');
    if(attackBtn) toggleAttack(attackBtn.dataset.toggleAttack);
    const partBtn = e.target.closest('[data-toggle-participation]');
    if(partBtn) toggleParticipation(partBtn.dataset.toggleParticipation);
    const quickPosBtn = e.target.closest('[data-quick-position]');
    if(quickPosBtn) setTournamentPosition(quickPosBtn.dataset.quickPosition, quickPosBtn.dataset.positionValue);
    const monthChip = e.target.closest('[data-classification-month]');
    if(monthChip){
      state.ui.classificationMonth = monthChip.dataset.classificationMonth;
      saveState();
      renderClassification();
      if(ui.classificationMonthSelect) ui.classificationMonthSelect.value = state.ui.classificationMonth;
    }
    const heroMonthChip = e.target.closest('[data-month-chip]');
    if(heroMonthChip){
      state.meta.currentMonth = heroMonthChip.dataset.monthChip;
      state.ui.classificationMonth = state.meta.currentMonth;
      saveState();
      render();
    }
    const heroWeekChip = e.target.closest('[data-week-chip]');
    if(heroWeekChip){
      state.meta.currentWeek = Number(heroWeekChip.dataset.weekChip || 1);
      saveState();
      render();
    }
    const openUserBtn = e.target.closest('[data-open-user-edit]');
    if(openUserBtn){ openUserEdit(openUserBtn.dataset.openUserEdit); return; }
    const saveUserBtn = e.target.closest('[data-save-user-profile]');
    if(saveUserBtn && window.TOPBRS_AUTH_UI?.saveUserProfileFromInputs){
      window.TOPBRS_AUTH_UI.saveUserProfileFromInputs(saveUserBtn.dataset.saveUserProfile);
      closeUserEdit();
      return;
    }
    const deleteUserBtn = e.target.closest('[data-delete-user-profile]');
    if(deleteUserBtn && window.TOPBRS_AUTH_UI?.deleteUser){
      if(confirm('Remover este usuário do sistema?')){
        window.TOPBRS_AUTH_UI.deleteUser(deleteUserBtn.dataset.deleteUserProfile);
        closeUserEdit();
      }
      return;
    }
    const memberOpen = e.target.closest('[data-open-member]');
    if(memberOpen) openMember(memberOpen.dataset.openMember);
    const toggleArchiveBtn = e.target.closest('[data-toggle-archive]');
    if(toggleArchiveBtn) toggleArchive(toggleArchiveBtn.dataset.toggleArchive);
    const saveNoteBtn = e.target.closest('[data-save-member-note]');
    if(saveNoteBtn) saveMemberNote(saveNoteBtn.dataset.saveMemberNote);
    if(e.target.matches('[data-close-modal]') || e.target === ui.memberModal) closeMember();
    if(e.target.matches('[data-close-user-edit]') || e.target === ui.userEditModal) closeUserEdit();
    if(e.target.matches('[data-open-goals]')) openGoals();
    if(e.target.matches('[data-close-goal]') || e.target === ui.goalModal) closeGoals();
    if(e.target.matches('[data-close-create-member]') || e.target === ui.createMemberModal) closeCreateMemberModal();
    if(e.target === ui.vaultAccessModal || e.target === ui.vaultAccessCancelBtn) { closeVaultPrompt(); setActiveView(lastNonVaultView || 'arenaView'); }
    if(e.target.closest('[data-scroll-top]') || e.target === ui.backToTopBtn) scrollToTopSmooth();
    const clearBtn = e.target.closest('[data-tool-clear]');
    if(clearBtn){
      const mode = clearBtn.dataset.toolClear;
      if(mode === 'war'){ state.ui.warQuery = ''; state.ui.warRole = 'ALL'; }
      if(mode === 'tournament'){ state.ui.tournamentQuery = ''; state.ui.tournamentRole = 'ALL'; }
      saveState();
      render();
    }
  });
  ui.menuToggleBtn?.addEventListener('click', openDrawer);
  ui.drawerBackdrop.addEventListener('click', closeDrawer);
  document.body.addEventListener('change', e => {
    if(e.target.matches('[data-position-input]')){
      updatePosition(e.target.dataset.positionInput, e.target.value);
    }
    if(e.target.matches('#classificationRoleSelect')){
      state.ui.classificationRole = e.target.value || 'ALL';
      saveState();
      renderClassification();
    }
    if(e.target.matches('[data-tool-role="war"]')){
      state.ui.warRole = e.target.value || 'ALL';
      saveState();
      render();
    }
    if(e.target.matches('[data-tool-role="tournament"]')){
      state.ui.tournamentRole = e.target.value || 'ALL';
      saveState();
      render();
    }
  });
  document.body.addEventListener('input', e => {
    if(e.target.matches('#classificationQueryInput')){
      state.ui.classificationQuery = e.target.value || '';
      saveState();
      renderClassification();
    }
    if(e.target.matches('[data-tool-query="war"]')){
      state.ui.warQuery = e.target.value || '';
      saveState();
      applyToolFilters('war');
    }
    if(e.target.matches('[data-tool-query="tournament"]')){
      state.ui.tournamentQuery = e.target.value || '';
      saveState();
      applyToolFilters('tournament');
    }
  });
  $('#goalForm').addEventListener('submit', e => {
    e.preventDefault();
    const month = state.meta.currentMonth;
    state.goals[month] = {
      attacks: Number($('#goalAttacksInput').value || 0),
      tournament: Number($('#goalTournamentInput').value || 0)
    };
    saveState();
    closeGoals();
    render();
  });
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', e => e.target.files[0] && importBackup(e.target.files[0]));
  $('#restoreSeedBtn').addEventListener('click', () => {
    if(confirm('Restaurar agora a base original da V5.5.10 e ignorar o cache antigo?')){
      const restored = ensureDataCompleteness(deepClone(seedData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      location.reload();
    }
  });
  $('#resetBtn').addEventListener('click', () => {
    if(confirm('Limpar o app e apagar também a cópia migrada das versões anteriores?')){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
  ui.vaultAccessForm?.addEventListener('submit', e => {
    e.preventDefault();
    const value = (ui.vaultPasswordInput?.value || '').trim();
    if(value === VAULT_PASSWORD){
      unlockVaultSession();
      closeVaultPrompt();
      setActiveView('vaultView');
    }else{
      signalVaultError();
      if(ui.vaultPasswordInput){
        ui.vaultPasswordInput.focus();
        ui.vaultPasswordInput.select?.();
      }
    }
  });
  $('#addMemberBtn').addEventListener('click', addMember);
  ui.createMemberForm?.addEventListener('submit', e => { e.preventDefault(); createMemberFromModal(); });
  ui.backToTopBtn?.addEventListener('click', scrollToTopSmooth);
  window.addEventListener('scroll', updateBackToTopVisibility, {passive:true});
  document.addEventListener('touchstart', handleTouchStart, {passive:true});
  document.addEventListener('touchmove', handleTouchMove, {passive:true});
  document.addEventListener('touchend', handleTouchEnd, {passive:true});
  document.addEventListener('touchcancel', handleTouchEnd, {passive:true});
  updateBackToTopVisibility();
  $('#shareRankingBtn').addEventListener('click', openShareCard);

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    ui.installBtn.classList.remove('hidden');
  });
  ui.installBtn.addEventListener('click', async() => {
    if(deferredPrompt){
      deferredPrompt.prompt();
      deferredPrompt = null;
      ui.installBtn.classList.add('hidden');
    }else{
      alert('No iPhone: abra no Safari > Compartilhar > Adicionar à Tela de Início.');
    }
  });
  ui.manualRefreshBtn?.addEventListener('click', handleManualRefresh);
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js?v=6.1-auth');
  }
}
window.TOPBRS_APP = {
  getState(){ return deepClone(state); },
  replaceState(nextState){
    const incoming = nextState && typeof nextState === 'object' ? deepClone(nextState) : {};
    if(!Array.isArray(incoming.authUsers) && Array.isArray(state.authUsers)){
      incoming.authUsers = deepClone(state.authUsers);
    }
    const hydrated = ensureDataCompleteness(mergeWithSeed(incoming));
    for(const key of Object.keys(state)){ delete state[key]; }
    Object.assign(state, hydrated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  },
  saveState,
  render,
  monthLabel
};
bind();
updateTopbarTitle(document.querySelector('.view.active')?.id || 'arenaView');
render();
})();
