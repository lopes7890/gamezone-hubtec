const api = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo deu errado.');
  return d;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, err = false) {
  let box = document.getElementById('toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

// 5 linhas de integrante (nome + semestre)
function memberFields(container, members = []) {
  const opts = Array.from({ length: 6 }, (_, i) => `<option value="${i + 1}">${i + 1}º sem.</option>`).join('');
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const m = members[i] || {};
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `<input placeholder="Jogador ${i + 1}" maxlength="60" value="${esc(m.name || '')}" required aria-label="Nome do jogador ${i + 1}">
      <select aria-label="Semestre do jogador ${i + 1}">${opts}</select>`;
    row.querySelector('select').value = m.semester || 1;
    container.appendChild(row);
  }
}

const readMembers = (container) =>
  [...container.querySelectorAll('.member-row')].map((r) => ({
    name: r.querySelector('input').value.trim(),
    semester: Number(r.querySelector('select').value),
  }));

// HTML dos confrontos (painel admin; a página pública usa os partials EJS).
// opts.admin + opts.current: mostra botões nos confrontos da rodada atual.
function matchesHTML(ms, opts = {}) {
  const { admin = false, current = 0 } = opts;
  const btn = (act, id, label, cls = '', side = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}" data-side="${side}">${label}</button>`;
  const when = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cls = (m, side) => (m.winner === side ? 'win' : m.winner ? 'lose' : '');
  return '<div class="matches">' + ms.map((m, i) => {
    const done = m.status === 'done', bye = !m.p2;
    let actions = '';
    if (admin && m.round === current) {
      actions = '<div class="actions">' + (bye ? '' : done ? btn('reopen', m.id, 'Reabrir', 'ghost')
        : btn('win', m.id, `Venceu: ${esc(m.p1.name)}`, '', 1) + btn('win', m.id, `Venceu: ${esc(m.p2.name)}`, '', 2))
        + (!done || bye ? btn('del', m.id, 'Excluir', 'danger') : '') + '</div>';
    }
    return `<div class="match ${done ? 'done' : ''}" style="--i:${i}">
      <span class="p ${cls(m, 1)}">${esc(m.p1.name)} <small>${esc(m.p1.sub || '')}</small></span>
      ${bye ? '<b class="vs">—</b><span class="p bye">folga: avança direto</span>'
            : `<b class="vs">VS</b><span class="p ${cls(m, 2)}">${esc(m.p2.name)} <small>${esc(m.p2.sub || '')}</small></span>`}
      ${!bye && done ? `<span class="meta">✔ Concluído · ${when(m.finishedAt)}${m.winner ? ' · Vencedor: ' + esc(m.winner === 1 ? m.p1.name : m.p2.name) : ''}</span>` : ''}
      ${actions}
    </div>`;
  }).join('') + '</div>';
}

const championHTML = (c) => `<div class="champion"><span class="trophy">🏆</span><div><small>Campeão</small><b>${esc(c.name)}</b><span>${esc(c.sub || '')}</span></div></div>`;

// abas: mostra o painel [data-pane] correspondente ao botão .tab[data-t]
function setupTabs(tabs, panes, first, onShow) {
  const show = (name) => {
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.t === name));
    panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
    if (onShow) onShow(name);
  };
  tabs.forEach((t) => (t.onclick = () => show(t.dataset.t)));
  show(first);
  return show;
}
