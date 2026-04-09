import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const cfg = window.TOPBRS_FIREBASE_CONFIG || {};
const app = getApps().length ? getApp() : initializeApp(cfg.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const adminEmail = String(cfg.adminEmail || '').toLowerCase();
const $ = (id) => document.getElementById(id);
const els = {
  authGate: $('authGate'), authLoader: $('authLoader'), authMessage: $('authMessage'),
  loginForm: $('loginForm'), registerForm: $('registerForm'), forgotPasswordBtn: $('forgotPasswordBtn'),
  forgotPasswordModal: $('forgotPasswordModal'), forgotPasswordForm: $('forgotPasswordForm'), forgotPasswordEmail: $('forgotPasswordEmail'), forgotPasswordMessage: $('forgotPasswordMessage'),
  profileMenuBtn: $('profileMenuBtn'), profileAvatar: $('profileAvatar'), drawerProfileSummary: $('drawerProfileSummary'),
  profilePopover: $('profilePopover'), profilePopoverHeader: $('profilePopoverHeader'), logoutBtn: $('logoutBtn'),
  changePasswordOpenBtn: $('changePasswordOpenBtn'), changePasswordModal: $('changePasswordModal'),
  changePasswordForm: $('changePasswordForm'), changePasswordMessage: $('changePasswordMessage')
};
let currentProfile = null;
document.body.classList.add('auth-booting');
function showMessage(node, text, type='error'){ if(!node) return; node.textContent=text; node.className=`auth-message ${type}`; node.classList.remove('hidden'); }
function clearMessage(node){ if(!node) return; node.textContent=''; node.className='auth-message hidden'; }
function toggleLoader(show){ els.authLoader?.classList.toggle('hidden', !show); }
function toggleAuth(show){ document.body.classList.toggle('auth-locked', show); els.authGate?.classList.toggle('hidden', !show); }
function authTab(tab){ document.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.classList.toggle('active', btn.dataset.authTab===tab)); els.loginForm?.classList.toggle('hidden', tab!=='login'); els.registerForm?.classList.toggle('hidden', tab!=='register'); clearMessage(els.authMessage); }
function roleEmoji(accessRole){ return accessRole==='admin' ? '👑' : accessRole==='editor' ? '🧑🏼‍💻' : '👤'; }

function showMenuHintOnce(uid){
  const hint = document.getElementById('menuHint');
  if(!hint || !uid) return;
  const key = `topbrs-menu-hint-${uid}`;
  try{
    if(localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
  }catch(e){}
  hint.classList.remove('hidden');
  hint.classList.add('show');
  setTimeout(()=> hint.classList.remove('show'), 5200);
}
function displayLabel(profile){ const nick = profile?.nick || profile?.name || 'Usuário'; const cargo = profile?.clanRole || 'Membro'; return `${nick} - ${cargo}`; }

function updateAccessControlledUi(accessRole='viewer'){
  const isAdmin = accessRole === 'admin';
  document.body.classList.toggle('access-admin', isAdmin);
  document.querySelectorAll('[data-view="usersView"], [data-view="vaultView"]').forEach(btn => btn.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('#usersView, #vaultView').forEach(section => section.classList.toggle('hidden', !isAdmin));
  const currentActive = document.querySelector('.view.active');
  if(!isAdmin && currentActive && (currentActive.id === 'usersView' || currentActive.id === 'vaultView')){
    document.querySelector('[data-view="arenaView"]')?.click();
  }
}
async function getProfile(uid){ const snap = await getDoc(doc(db,'members',uid)); return snap.exists() ? snap.data() : null; }
async function getBlocked(uid){ const snap = await getDoc(doc(db,'blockedUsers',uid)); return snap.exists() ? snap.data() : null; }
async function saveProfile(uid, data){ await setDoc(doc(db,'members',uid), data, {merge:true}); }
async function blockUserProfile(uid, profile){ await setDoc(doc(db,'blockedUsers',uid), {uid, email: profile?.email || '', deletedAt: serverTimestamp()}, {merge:true}); await deleteDoc(doc(db,'members',uid)); }
async function loadUsersIntoState(){ const snap = await getDocs(collection(db,'members')); const users = snap.docs.map(d=>({uid:d.id,...d.data()})).filter(user => user.accessRole !== 'deleted').sort((a,b)=>String(a.nick||a.name||'').localeCompare(String(b.nick||b.name||''))); if(window.TOPBRS_APP){ const state = window.TOPBRS_APP.getState(); state.authUsers = users; window.TOPBRS_APP.replaceState(state); } }
async function applySession(user){
  document.body.classList.remove('auth-booting');
  if(!user){ currentProfile=null; window.TOPBRS_ACCESS={accessRole:'viewer', canEdit:false}; updateAccessControlledUi('viewer'); toggleAuth(true); return; }
  const blocked = await getBlocked(user.uid);
  if(blocked){ await signOut(auth); showMessage(els.authMessage,'Seu acesso foi removido do sistema.'); updateAccessControlledUi('viewer'); toggleAuth(true); return; }
  let profile = await getProfile(user.uid);
  if(!profile){ profile = { uid:user.uid, email:user.email || '', name:user.email?.toLowerCase()===adminEmail ? 'Líder' : '', nick:user.email?.toLowerCase()===adminEmail ? 'TopBRS' : '', clanRole:user.email?.toLowerCase()===adminEmail ? 'Líder' : 'Membro', accessRole:user.email?.toLowerCase()===adminEmail ? 'admin' : 'viewer', createdAt: serverTimestamp() }; await saveProfile(user.uid, profile); }
  const accessRole = user.email?.toLowerCase()===adminEmail ? 'admin' : (profile.accessRole || 'viewer');
  currentProfile = {uid:user.uid, ...profile, accessRole};
  window.TOPBRS_ACCESS = {uid:user.uid, email:user.email, accessRole, clanRole: profile.clanRole || 'Membro', nick: profile.nick || profile.name || user.email, canEdit: accessRole==='admin' || accessRole==='editor'};
  if(els.profileAvatar) els.profileAvatar.textContent = roleEmoji(accessRole);
  if(els.drawerProfileSummary){ els.drawerProfileSummary.classList.remove('hidden'); els.drawerProfileSummary.innerHTML = `<strong>${displayLabel(window.TOPBRS_ACCESS)}</strong><small>${user.email}</small>`; }
  if(els.profilePopoverHeader) els.profilePopoverHeader.innerHTML = `<strong>${displayLabel(window.TOPBRS_ACCESS)}</strong><small>${user.email}</small>`;
  updateAccessControlledUi(accessRole);
  toggleLoader(true); setTimeout(()=>{ toggleLoader(false); toggleAuth(false); showMenuHintOnce(user.uid); },700); await loadUsersIntoState(); window.TOPBRS_APP?.render?.();
}
window.TOPBRS_AUTH_UI = {
  async saveUserProfileFromInputs(uid){

    const q = (s) => document.querySelector(s)?.value?.trim() || '';
    const name = q(`[data-user-name="${uid}"]`), nick = q(`[data-user-nick="${uid}"]`), clanRole = q(`[data-user-clan-role="${uid}"]`) || 'Membro';
    const accessRole = document.querySelector(`[data-user-access-role="${uid}"]`)?.value || 'viewer';
    await saveProfile(uid, {name, nick, clanRole, accessRole, updatedAt: serverTimestamp()});
    await loadUsersIntoState(); if(currentProfile?.uid===uid) await applySession(auth.currentUser); showToast('Perfil atualizado com sucesso.');
  },
  async deleteUser(uid){
    const profile = await getProfile(uid);
    if(!profile) return;
    await blockUserProfile(uid, profile);
    await loadUsersIntoState();
    if(currentProfile?.uid===uid){ await signOut(auth); return; }
    showToast('Usuário removido do sistema.');
    window.TOPBRS_APP?.render?.();
  }
};

document.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.addEventListener('click',()=>authTab(btn.dataset.authTab)));
els.loginForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); clearMessage(els.authMessage); try{ await signInWithEmailAndPassword(auth, $('loginEmail').value.trim(), $('loginPassword').value); }catch{ showMessage(els.authMessage, 'Não foi possível entrar. Verifique email e senha.'); } });
els.registerForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); clearMessage(els.authMessage); try{ const email=$('registerEmail').value.trim(); const password=$('registerPassword').value; const cred=await createUserWithEmailAndPassword(auth,email,password); await saveProfile(cred.user.uid,{uid:cred.user.uid,email,name:$('registerName').value.trim(),nick:$('registerNick').value.trim(),clanRole:'Membro',accessRole:'viewer',createdAt:serverTimestamp()}); await signOut(auth); authTab('login'); showMessage(els.authMessage,'Cadastro criado. Agora faça login.','success'); els.registerForm.reset(); }catch{ showMessage(els.authMessage,'Não foi possível cadastrar. Verifique os dados e tente de novo.'); } });
els.forgotPasswordBtn?.addEventListener('click', ()=> els.forgotPasswordModal?.classList.remove('hidden'));
document.querySelector('[data-close-forgot-password]')?.addEventListener('click', ()=> els.forgotPasswordModal?.classList.add('hidden'));
els.forgotPasswordForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ await sendPasswordResetEmail(auth, els.forgotPasswordEmail.value.trim()); showMessage(els.forgotPasswordMessage,'Email de recuperação enviado.','success'); }catch{ showMessage(els.forgotPasswordMessage,'Não foi possível enviar a recuperação.'); } });
els.profileMenuBtn?.addEventListener('click', ()=> els.profilePopover?.classList.toggle('hidden'));
els.profilePopover?.addEventListener('click', e=>{ if(e.target===els.profilePopover) els.profilePopover.classList.add('hidden'); });
els.changePasswordOpenBtn?.addEventListener('click', ()=>{ els.profilePopover?.classList.add('hidden'); els.changePasswordModal?.classList.remove('hidden'); });
document.querySelector('[data-close-change-password]')?.addEventListener('click', ()=> els.changePasswordModal?.classList.add('hidden'));
els.changePasswordForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const current=$('currentPasswordInput').value, next=$('newPasswordInput').value, conf=$('confirmPasswordInput').value; if(next!==conf) throw new Error('A nova senha e a confirmação não conferem.'); const user=auth.currentUser; const credential=EmailAuthProvider.credential(user.email,current); await reauthenticateWithCredential(user,credential); await updatePassword(user,next); showMessage(els.changePasswordMessage,'Senha alterada com sucesso.','success'); els.changePasswordForm.reset(); }catch(err){ showMessage(els.changePasswordMessage, err.message || 'Não foi possível alterar a senha.'); } });
els.logoutBtn?.addEventListener('click', async ()=>{ els.profilePopover?.classList.add('hidden'); await signOut(auth); });
document.addEventListener('click', e=>{ if(e.target===els.changePasswordModal) els.changePasswordModal.classList.add('hidden'); if(e.target===els.forgotPasswordModal) els.forgotPasswordModal.classList.add('hidden'); });
onAuthStateChanged(auth, applySession);
