const $ = (id) => document.getElementById(id);
let pw = sessionStorage.getItem('adm') || '';
const data = { teams: [], players: {}, bracket: {} };
let editTeamId = null, editPlayerId = null, showTab = null;
const H = () => ({ 'x-admin-password': pw });
const empty = (cols, msg) => `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;
const q = (attr, slug) => document.querySelector(`[${attr}="${slug}"]`);

// ---------- carregar ----------
async function load() {
  try {
    data.teams = await api('/api/admin/teams', { headers: H() });          // também valida a senha
    for (const g of ADMIN.games) {
      data.bracket[g.slug] = await api(`/api/games/${g.slug}/bracket`);
      if (g.type === 'solo') data.players[g.slug] = await api(`/api/games/${g.slug}/players`);
    }
  } catch (e) {
    sessionStorage.removeItem('adm');
    $('login').hidden = false; $('panel').hidden = true;
    if (pw) toast(e.message, true);
    pw = ''; return;
  }
  $('login').hidden = true; $('panel').hidden = false;
  if (!showTab) showTab = setupTabs([...document.querySelectorAll('#atabs .tab')], [...document.querySelectorAll('#panel [data-pane]')], ADMIN.games[0].slug);
  ADMIN.games.forEach((g) => { g.type === 'team' ? renderTeams(g.slug) : renderPlayers(g.slug); renderBracket(g.slug); });
}

// ---------- desenhar ----------
function renderTeams(slug) {
  $('c-' + slug).textContent = data.teams.length;
  $('rows-' + slug).innerHTML = data.teams.length ? data.teams.map((t) => `<tr>
    <td><b>${esc(t.name)}</b></td>
    <td>${t.members.map((m) => `<small style="color:var(--text)">${esc(m.name)} <span class="tag">${m.semester}º</span></small>`).join('')}</td>
    <td>${esc(t.pin)}</td>
    <td><div class="actions"><button class="btn sm" onclick="openTeam(${t.id})">Editar</button><button class="btn danger sm" onclick="delTeam(${t.id})">Excluir</button></div></td>
  </tr>`).join('') : empty(4, 'Nenhuma equipe cadastrada ainda.');
}

function renderPlayers(slug) {
  const ps = data.players[slug];
  $('c-' + slug).textContent = ps.length;
  $('rows-' + slug).innerHTML = ps.length ? ps.map((p, i) => `<tr>
    <td>${i + 1}</td><td><b>${esc(p.name)}</b></td><td>${p.age}</td>
    <td><div class="actions"><button class="btn sm" onclick="openPlayer('${slug}',${p.id})">Editar</button><button class="btn danger sm" onclick="delPlayer('${slug}',${p.id})">Excluir</button></div></td>
  </tr>`).join('') : empty(4, 'Nenhum jogador inscrito ainda.');
}

function renderBracket(slug) {
  const b = data.bracket[slug];
  const draw = q('data-draw', slug);
  draw.textContent = b.current ? 'Sortear próxima rodada' : 'Sortear 1ª rodada';
  draw.disabled = b.current > 0 && !b.canDrawNext;
  q('data-redraw', slug).disabled = !b.current;
  q('data-reset', slug).disabled = !b.current;

  const last = b.rounds[b.rounds.length - 1];
  $('status-' + slug).textContent = !b.current ? 'Nenhum sorteio realizado ainda.'
    : b.champion ? 'Competição encerrada.'
    : b.canDrawNext ? 'Rodada concluída. Já é possível sortear a próxima.'
    : `${last.label} em andamento · ${b.progress.done}/${b.progress.total} confrontos concluídos`;

  $('draw-' + slug).innerHTML = (b.champion ? championHTML(b.champion) : '')
    + [...b.rounds].reverse().map((r) => `<h4 class="round-title">${esc(r.label)}</h4>` + matchesHTML(r.matches, { admin: true, current: b.current })).join('');
  $('done-' + slug).innerHTML = b.doneList.length ? matchesHTML(b.doneList, { admin: true, current: b.current }) : '<p class="empty">Nenhuma partida realizada ainda.</p>';
  $('done-count-' + slug).textContent = b.played;
  $('pend-count-' + slug).textContent = b.pending;
}

// ---------- login / diálogos ----------
$('fLogin').onsubmit = (e) => { e.preventDefault(); pw = $('pw').value; sessionStorage.setItem('adm', pw); load(); };
$('logout').onclick = () => { sessionStorage.removeItem('adm'); pw = ''; $('login').hidden = false; $('panel').hidden = true; };
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('dialog').close()));

// ---------- equipes (CS 1.6) ----------
window.openTeam = (id) => {
  const t = data.teams.find((x) => x.id === id); editTeamId = id;
  $('eName').value = t.name; $('ePin').value = '';
  memberFields($('eMembers'), t.members); $('dlgTeam').showModal();
};
$('fTeam').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api(`/api/admin/teams/${editTeamId}`, { method: 'PUT', headers: H(), body: JSON.stringify({ name: $('eName').value, pin: $('ePin').value, members: readMembers($('eMembers')) }) });
    $('dlgTeam').close(); toast('Equipe atualizada!'); load();
  } catch (err) { toast(err.message, true); }
};
window.delTeam = async (id) => {
  const t = data.teams.find((x) => x.id === id);
  if (!confirm(`Excluir a equipe "${t.name}" e todos os integrantes?`)) return;
  try { await api(`/api/admin/teams/${id}`, { method: 'DELETE', headers: H() }); toast('Equipe excluída.'); load(); }
  catch (err) { toast(err.message, true); }
};

// ---------- jogadores (MK1 / FIFA 26) ----------
window.openPlayer = (slug, id) => {
  const p = data.players[slug].find((x) => x.id === id); editPlayerId = id;
  $('pName').value = p.name; $('pAge').value = p.age; $('dlgPlayer').showModal();
};
$('fPlayer').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api(`/api/admin/players/${editPlayerId}`, { method: 'PUT', headers: H(), body: JSON.stringify({ name: $('pName').value, age: Number($('pAge').value) }) });
    $('dlgPlayer').close(); toast('Jogador atualizado!'); load();
  } catch (err) { toast(err.message, true); }
};
window.delPlayer = async (slug, id) => {
  const p = data.players[slug].find((x) => x.id === id);
  if (!confirm(`Excluir "${p.name}"?`)) return;
  try { await api(`/api/admin/players/${id}`, { method: 'DELETE', headers: H() }); toast('Jogador excluído.'); load(); }
  catch (err) { toast(err.message, true); }
};

// ---------- sorteio ----------
const reloadBracket = async (slug) => { data.bracket[slug] = await api(`/api/games/${slug}/bracket`); renderBracket(slug); };

document.querySelectorAll('[data-draw]').forEach((b) => (b.onclick = async () => {
  const slug = b.dataset.draw;
  try {
    data.bracket[slug] = await api(`/api/admin/games/${slug}/draw`, { method: 'POST', headers: H() });
    renderBracket(slug); toast('Oponentes sorteados!');
  } catch (err) { toast(err.message, true); }
}));
document.querySelectorAll('[data-redraw]').forEach((b) => (b.onclick = async () => {
  const slug = b.dataset.redraw;
  if (!confirm('Refazer o sorteio da rodada atual?')) return;
  try {
    data.bracket[slug] = await api(`/api/admin/games/${slug}/redraw`, { method: 'POST', headers: H() });
    renderBracket(slug); toast('Rodada sorteada novamente!');
  } catch (err) { toast(err.message, true); }
}));
document.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = async () => {
  const slug = b.dataset.reset;
  if (!confirm('Reiniciar o chaveamento deste jogo?\n\nAs partidas já realizadas continuam salvas no histórico. Confrontos pendentes e folgas serão descartados.')) return;
  try {
    await api(`/api/admin/games/${slug}/matches`, { method: 'DELETE', headers: H() });
    await reloadBracket(slug); toast('Chaveamento reiniciado. Partidas realizadas arquivadas no histórico.');
  } catch (err) { toast(err.message, true); }
}));

// registrar vencedor / reabrir / excluir um confronto
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, id, side } = b.dataset, slug = b.closest('[data-pane]').dataset.pane;
  try {
    if (act === 'del') {
      if (!confirm('Excluir este confronto? Os dois participantes ficam fora da próxima rodada.')) return;
      await api(`/api/admin/matches/${id}`, { method: 'DELETE', headers: H() });
      toast('Confronto excluído.');
    } else {
      const winner = act === 'win' ? Number(side) : null;
      await api(`/api/admin/matches/${id}`, { method: 'PATCH', headers: H(), body: JSON.stringify({ winner }) });
      toast(winner ? 'Vencedor registrado!' : 'Confronto reaberto.');
    }
    await reloadBracket(slug);
  } catch (err) { toast(err.message, true); }
});

if (pw) load();
