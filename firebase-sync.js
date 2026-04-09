import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const cfg = window.TOPBRS_FIREBASE_CONFIG || {};
const stateDocPath = cfg.stateDocPath || 'live/topbrs_state';
const [colName, docId] = stateDocPath.split('/');
let appApi = null;
let db = null;
let auth = null;
let unsub = null;
let localWriteTimer = null;
let applyingRemote = false;
let currentUser = null;
let initialized = false;

function waitForApp(){
  return new Promise(resolve => {
    const tick = () => {
      if(window.TOPBRS_APP){ resolve(window.TOPBRS_APP); return; }
      setTimeout(tick, 80);
    };
    tick();
  });
}
function badge(){ return document.getElementById('firebaseSyncBadge'); }
function authBtn(){ return document.getElementById('firebaseAuthBtn'); }
function canEdit(){
  const sessionRole = String(window.TOPBRS_ACCESS?.accessRole || '').toLowerCase();
  return !!currentUser && ((!!cfg.adminEmail && String(currentUser.email || '').toLowerCase() === String(cfg.adminEmail || '').toLowerCase()) || sessionRole === 'editor' || sessionRole === 'admin');
}
function isAdmin(){ return canEdit(); }
function setBadge(text, mode='offline'){
  const el = badge();
  if(!el) return;
  el.textContent = text;
  el.classList.remove('online','viewer','offline');
  el.classList.add(mode);
}
function applyViewerMode(){
  document.body.classList.toggle('viewer-mode', !isAdmin());
  const btn = authBtn();
  if(btn) btn.textContent = canEdit() ? 'Sair líder' : 'Entrar líder';
  setBadge(!cfg.enabled ? 'Local' : (canEdit() ? 'Online edit' : 'Leitura'), canEdit() ? 'online' : (!cfg.enabled ? 'offline' : 'viewer'));
}
function attachAuthButton(){
  const btn = authBtn();
  if(!btn || btn.dataset.boundFirebase) return;
  btn.dataset.boundFirebase = '1';
  btn.addEventListener('click', async() => { if(canEdit()) await signOut(auth); });
}
function startRealtime(){
  if(unsub) unsub();
  const stateRef = doc(db, colName, docId);
  unsub = onSnapshot(stateRef, snap => {
    const payload = snap.data();
    if(!payload || !payload.state || !appApi) return;
    applyingRemote = true;
    appApi.replaceState(payload.state, { source: 'firebase' });
    applyingRemote = false;
  }, err => {
    console.error(err);
    setBadge('Erro sync', 'offline');
  });
}
function queueWrite(nextState){
  if(!cfg.enabled || !db || !canEdit() || applyingRemote) return;
  clearTimeout(localWriteTimer);
  const payload = JSON.parse(JSON.stringify(nextState));
  localWriteTimer = setTimeout(async() => {
    try{
      const stateRef = doc(db, colName, docId);
      await setDoc(stateRef, { state: payload, updatedAt: serverTimestamp(), updatedBy: currentUser?.email || 'admin' }, { merge: true });
      setBadge('Líder online', 'online');
    }catch(err){
      console.error(err);
      setBadge('Falha sync', 'offline');
      alert('Não foi possível salvar no Firebase. Confira as regras, o projeto e se você entrou como líder.');
    }
  }, 500);
}


async function refreshFromCloud(){
  if(!cfg.enabled || !db || !appApi) return {ok:false, reason:'not-configured'};
  try{
    const stateRef = doc(db, colName, docId);
    const snap = await getDoc(stateRef);
    const payload = snap.data();
    if(!payload || !payload.state) return {ok:false, reason:'empty'};
    applyingRemote = true;
    appApi.replaceState(payload.state, { source: 'firebase-manual' });
    applyingRemote = false;
    setBadge(canEdit() ? 'Líder online' : 'Leitura', canEdit() ? 'online' : 'viewer');
    return {ok:true};
  }catch(err){
    console.error(err);
    setBadge('Falha sync', 'offline');
    return {ok:false, reason:'error'};
  }
}

window.TOPBRS_REMOTE = {
  onLocalSave(nextState){ queueWrite(nextState); },
  afterRender(){ attachAuthButton(); applyViewerMode(); },
  isAdmin: canEdit,
  canEdit,
  isConfigured(){ return !!cfg.enabled; },
  async refreshNow(){ return refreshFromCloud(); }
};

(async function init(){
  appApi = await waitForApp();
  attachAuthButton();
  applyViewerMode();
  if(!cfg.enabled){
    return;
  }
  const firebaseApp = initializeApp(cfg.firebaseConfig);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
  onAuthStateChanged(auth, user => {
    currentUser = user;
    applyViewerMode();
    if(!initialized){
      startRealtime();
      initialized = true;
    }
  });
})();
