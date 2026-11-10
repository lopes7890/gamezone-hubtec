const $ = (id) => document.getElementById(id);
const tabs = [...document.querySelectorAll('.tab')];
const panes = [...document.querySelectorAll('[data-pane]')];

// aba inicial: #hash, se existir; senão "inscrever"
const wanted = location.hash.slice(1);
setupTabs(tabs, panes, tabs.some((t) => t.dataset.t === wanted) ? wanted : 'inscrever',
  (name) => history.replaceState(null, '', '#' + name));

const reloadAt = (hash, ms = 900) => { history.replaceState(null, '', '#' + hash); setTimeout(() => location.reload(), ms); };

// ---------- jogo individual (MK1 / FIFA 26) ----------
if ($('fSolo')) {
  $('fSolo').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/games/${GAME.slug}/players`, { method: 'POST', body: JSON.stringify({ name: $('pname').value, age: Number($('page').value) }) });
      toast('Inscrição realizada!');
      reloadAt('participantes');
    } catch (err) {
      toast(err.message, true);
      if (/^(Limite|As inscrições)/.test(err.message)) reloadAt('inscrever', 1800);
    }
  };
}

// ---------- CS 1.6 (equipes) ----------

// ---------- CS 1.6 (equipes) ----------
if ($('q')) {
  const q = $('q'), cards = [...document.querySelectorAll('#list .card')];
  q.addEventListener('input', () => {
    const t = q.value.toLowerCase();
    let shown = 0;
    cards.forEach((c) => { const ok = c.dataset.search.includes(t); c.hidden = !ok; shown += ok; });
    $('none').hidden = shown > 0;
  });
}

if ($('fNew')) { // some quando o limite de equipes é atingido
  memberFields($('mNew'));
  $('fNew').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/teams', { method: 'POST', body: JSON.stringify({ name: $('name').value, pin: $('pin').value, members: readMembers($('mNew')) }) });
      toast('Equipe inscrita!');
      reloadAt('equipes');
    } catch (err) {
      toast(err.message, true);
      if (/^(Limite|As inscrições)/.test(err.message)) reloadAt('inscrever', 1800);
    }
  };
}

if ($('fAuth')) {
  let current = null;
  $('fAuth').onsubmit = async (e) => {
    e.preventDefault();
    try {
      current = await api(`/api/teams/${$('team').value}/auth`, { method: 'POST', body: JSON.stringify({ pin: $('pinAuth').value }) });
      $('eName').textContent = current.name;
      memberFields($('mEdit'), current.members);
      $('fAuth').hidden = true; $('fEdit').hidden = false;
    } catch (err) { toast(err.message, true); }
  };
  $('fEdit').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/teams/${current.id}`, { method: 'PUT', body: JSON.stringify({ pin: $('pinAuth').value, members: readMembers($('mEdit')) }) });
      toast('Integrantes salvos!');
    } catch (err) { toast(err.message, true); }
  };
  $('out').onclick = () => { $('pinAuth').value = ''; $('fAuth').hidden = false; $('fEdit').hidden = true; };
}
