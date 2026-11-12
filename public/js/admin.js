const $ = (id) => document.getElementById(id);
let pw = sessionStorage.getItem("adm") || "";
// const data = { teams: [], players: {}, bracket: {} };
const data = { teams: [], players: {}, bracket: {}, reg: {} };
let editTeamId = null,
  editPlayerId = null,
  showTab = null;
const H = () => ({ "x-admin-password": pw });
const empty = (cols, msg) =>
  `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;
const q = (attr, slug) => document.querySelector(`[${attr}="${slug}"]`);

// ---------- carregar ----------
async function load() {
  try {
    data.teams = await api("/api/admin/teams", { headers: H() }); // também valida a senha
    data.reg = await api("/api/settings");
    for (const g of ADMIN.games) {
      data.bracket[g.slug] = await api(`/api/games/${g.slug}/bracket`);
      if (g.type === "solo")
        data.players[g.slug] = await api(`/api/games/${g.slug}/players`);
    }
  } catch (e) {
    sessionStorage.removeItem("adm");
    $("login").hidden = false;
    $("panel").hidden = true;
    if (pw) toast(e.message, true);
    pw = "";
    return;
  }
  $("login").hidden = true;
  $("panel").hidden = false;
  if (!showTab)
    showTab = setupTabs(
      [...document.querySelectorAll("#atabs .tab")],
      [...document.querySelectorAll("#panel [data-pane]")],
      ADMIN.games[0].slug,
    );
  ADMIN.games.forEach((g) => renderReg(g.slug));
  ADMIN.games.forEach((g) => {
    g.type === "team" ? renderTeams(g.slug) : renderPlayers(g.slug);
    renderBracket(g.slug);
  });
}

// ---------- inscrições abertas/encerradas ----------
function renderReg(slug) {
  const open = data.reg[slug] !== false;
  $("reg-text-" + slug).innerHTML = open
    ? 'Inscrições <b style="color:var(--accent)">ABERTAS</b>.'
    : 'Inscrições <b style="color:var(--danger)">ENCERRADAS</b>: ninguém consegue se inscrever.';
  const b = q("data-reg", slug);
  b.textContent = open ? "Encerrar inscrições" : "Reabrir inscrições";
  b.className = "btn sm " + (open ? "danger" : "");
}

document.querySelectorAll("[data-reg]").forEach(
  (b) =>
    (b.onclick = async () => {
      const slug = b.dataset.reg,
        open = data.reg[slug] === false; // novo estado (inverte o atual)
      if (
        !open &&
        !confirm(
          "Encerrar as inscrições deste jogo? Ninguém conseguirá se inscrever até você reabrir.",
        )
      )
        return;
      try {
        await api(`/api/admin/games/${slug}/registration`, {
          method: "PUT",
          headers: H(),
          body: JSON.stringify({ open }),
        });
        data.reg[slug] = open;
        renderReg(slug);
        toast(open ? "Inscrições reabertas." : "Inscrições encerradas.");
      } catch (err) {
        toast(err.message, true);
      }
    }),
);
// ---------- desenhar ----------
function renderTeams(slug) {
  $("c-" + slug).textContent = data.teams.length;
  $("rows-" + slug).innerHTML = data.teams.length
    ? data.teams
        .map(
          (t) => `<tr>
    <td><b>${esc(t.name)}</b></td>
    <td>${t.members.map((m) => `<small style="color:var(--text)">${esc(m.name)} <span class="tag">${m.semester}º</span></small>`).join("")}</td>
    <td>${esc(t.pin)}</td>
    <td><div class="actions"><button class="btn sm" onclick="openTeam(${t.id})">Editar</button><button class="btn danger sm" onclick="delTeam(${t.id})">Excluir</button></div></td>
  </tr>`,
        )
        .join("")
    : empty(4, "Nenhuma equipe cadastrada ainda.");
}

function renderPlayers(slug) {
  const ps = data.players[slug];
  $("c-" + slug).textContent = ps.length;
  $("rows-" + slug).innerHTML = ps.length
    ? ps
        .map(
          (p, i) => `<tr>
    <td>${i + 1}</td><td><b>${esc(p.name)}</b></td><td>${p.age}</td>
    <td><div class="actions"><button class="btn sm" onclick="openPlayer('${slug}',${p.id})">Editar</button><button class="btn danger sm" onclick="delPlayer('${slug}',${p.id})">Excluir</button></div></td>
  </tr>`,
        )
        .join("")
    : empty(4, "Nenhum jogador inscrito ainda.");
}

function renderBracket(slug) {
  const b = data.bracket[slug];
  q("data-draw", slug).disabled = b.exists;
  q("data-redraw", slug).disabled = !b.canRedraw;
  q("data-reset", slug).disabled = !b.exists;
  const poster = q("data-poster", slug);
  poster.disabled = !b.exists;
  poster.title = b.exists
    ? 'Gerar imagens do chaveamento'
    : 'Gere o chaveamento primeiro.';

  $("status-" + slug).textContent = !b.exists
    ? "Nenhum sorteio realizado ainda."
    : b.champion
      ? `Competição concluída · ${b.progress.done}/${b.progress.total} partidas.`
      : `Em andamento · ${b.progress.done}/${b.progress.total} partidas concluídas.`;

  $("draw-" + slug).innerHTML =
    (b.champion ? championHTML(b.champion) : "") +
    b.rounds
      .map(
        (r) =>
          `<h4 class="round-title">${esc(r.short)}</h4>` +
          matchesHTML(r.matches, { admin: true }),
      )
      .join("");
  $("done-" + slug).innerHTML = b.doneList.length
    ? matchesHTML(b.doneList, { admin: true })
    : '<p class="empty">Nenhuma partida realizada ainda.</p>';
  $("done-count-" + slug).textContent = b.played;
  $("pend-count-" + slug).textContent = b.pending;
}

// ---------- login / diálogos ----------
$("fLogin").onsubmit = (e) => {
  e.preventDefault();
  pw = $("pw").value;
  sessionStorage.setItem("adm", pw);
  load();
};
$("logout").onclick = () => {
  sessionStorage.removeItem("adm");
  pw = "";
  $("login").hidden = false;
  $("panel").hidden = true;
};
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));

// ---------- equipes (CS 1.6) ----------
window.openTeam = (id) => {
  const t = data.teams.find((x) => x.id === id);
  editTeamId = id;
  $("eName").value = t.name;
  $("ePin").value = "";
  memberFields($("eMembers"), t.members);
  $("dlgTeam").showModal();
};
$("fTeam").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api(`/api/admin/teams/${editTeamId}`, {
      method: "PUT",
      headers: H(),
      body: JSON.stringify({
        name: $("eName").value,
        pin: $("ePin").value,
        members: readMembers($("eMembers")),
      }),
    });
    $("dlgTeam").close();
    toast("Equipe atualizada!");
    load();
  } catch (err) {
    toast(err.message, true);
  }
};
window.delTeam = async (id) => {
  const t = data.teams.find((x) => x.id === id);
  if (!confirm(`Excluir a equipe "${t.name}" e todos os integrantes?`)) return;
  try {
    await api(`/api/admin/teams/${id}`, { method: "DELETE", headers: H() });
    toast("Equipe excluída.");
    load();
  } catch (err) {
    toast(err.message, true);
  }
};

// ---------- jogadores (MK1 / FIFA 26) ----------
window.openPlayer = (slug, id) => {
  const p = data.players[slug].find((x) => x.id === id);
  editPlayerId = id;
  $("pName").value = p.name;
  $("pAge").value = p.age;
  $("dlgPlayer").showModal();
};
$("fPlayer").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api(`/api/admin/players/${editPlayerId}`, {
      method: "PUT",
      headers: H(),
      body: JSON.stringify({
        name: $("pName").value,
        age: Number($("pAge").value),
      }),
    });
    $("dlgPlayer").close();
    toast("Jogador atualizado!");
    load();
  } catch (err) {
    toast(err.message, true);
  }
};
window.delPlayer = async (slug, id) => {
  const p = data.players[slug].find((x) => x.id === id);
  if (!confirm(`Excluir "${p.name}"?`)) return;
  try {
    await api(`/api/admin/players/${id}`, { method: "DELETE", headers: H() });
    toast("Jogador excluído.");
    load();
  } catch (err) {
    toast(err.message, true);
  }
};

// ---------- sorteio ----------
const reloadBracket = async (slug) => {
  data.bracket[slug] = await api(`/api/games/${slug}/bracket`);
  renderBracket(slug);
};

document.querySelectorAll("[data-draw]").forEach(
  (b) =>
    (b.onclick = async () => {
      const slug = b.dataset.draw;
      try {
        data.bracket[slug] = await api(`/api/admin/games/${slug}/draw`, {
          method: "POST",
          headers: H(),
        });
        renderBracket(slug);
        toast("Oponentes sorteados!");
      } catch (err) {
        toast(err.message, true);
      }
    }),
);
document.querySelectorAll("[data-redraw]").forEach(
  (b) =>
    (b.onclick = async () => {
      const slug = b.dataset.redraw;
      if (
        !confirm(
          "Refazer o sorteio do chaveamento? As posições serão sorteadas novamente.",
        )
      )
        return;
      try {
        data.bracket[slug] = await api(`/api/admin/games/${slug}/redraw`, {
          method: "POST",
          headers: H(),
        });
        renderBracket(slug);
        toast("Sorteio refeito!");
      } catch (err) {
        toast(err.message, true);
      }
    }),
);
document.querySelectorAll("[data-reset]").forEach(
  (b) =>
    (b.onclick = async () => {
      const slug = b.dataset.reset;
      if (
        !confirm(
          "Reiniciar o chaveamento deste jogo?\n\nAs partidas já realizadas continuam salvas no histórico. Confrontos pendentes e folgas serão descartados.",
        )
      )
        return;
      try {
        await api(`/api/admin/games/${slug}/matches`, {
          method: "DELETE",
          headers: H(),
        });
        await reloadBracket(slug);
        toast(
          "Chaveamento reiniciado. Partidas realizadas arquivadas no histórico.",
        );
      } catch (err) {
        toast(err.message, true);
      }
    }),
);

// registrar vencedor / reabrir um confronto
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const { act, id, side } = b.dataset,
    slug = b.closest("[data-pane]").dataset.pane;
  try {
    const winner = act === "win" ? Number(side) : null;
    await api(`/api/admin/matches/${id}`, {
      method: "PATCH",
      headers: H(),
      body: JSON.stringify({ winner }),
    });
    toast(
      winner
        ? "Vencedor registrado! Ele já avançou na chave."
        : "Confronto reaberto.",
    );
    await reloadBracket(slug);
  } catch (err) {
    toast(err.message, true);
  }
});

// salvar o horário de um confronto
document.addEventListener("change", async (e) => {
  const i = e.target.closest("[data-sched]");
  if (!i) return;
  const slug = i.closest("[data-pane]").dataset.pane;
  try {
    await api(`/api/admin/matches/${i.dataset.sched}`, {
      method: "PATCH",
      headers: H(),
      body: JSON.stringify({
        scheduledAt: i.value ? new Date(i.value).toISOString() : null,
      }),
    });
    toast(i.value ? "Horário salvo." : "Horário removido.");
    await reloadBracket(slug);
  } catch (err) {
    toast(err.message, true);
  }
});

// // ---------- imagens para Instagram ----------
// const loadImg = (src) =>
//   new Promise((res) => {
//     const im = new Image();
//     im.onload = () => res(im);
//     im.onerror = () => res(null);
//     im.src = src;
//   });

// document.querySelectorAll("[data-poster]").forEach(
//   (b) =>
//     (b.onclick = async () => {
//       const slug = b.dataset.poster,
//         game = ADMIN.games.find((x) => x.slug === slug),
//         br = data.bracket[slug];
//       if (!br.champion)
//         return toast(
//           "O chaveamento só pode ser exportado depois que a competição for concluída.",
//           true,
//         );
//       b.disabled = true;
//       try {
//         await Promise.all(
//           [
//             '700 40px "Chakra Petch"',
//             '600 20px "Chakra Petch"',
//             '500 20px "Barlow"',
//           ].map((f) => document.fonts.load(f)),
//         ).catch(() => {});
//         if (
//           typeof Poster === "undefined" ||
//           typeof Poster.build !== "function"
//         ) {
//           throw new Error("Arquivo poster.js não carregado corretamente.");
//         }

//         console.log("Jogo:", game);
//         console.log("Chaveamento:", br);

//         const art = await loadImg(game.image);

//         const imgs = await Poster.build({
//           game,
//           bracket: br,
//           art,
//           site: location.host,
//         });

//         if (!imgs || !imgs.length) {
//           throw new Error(
//             "Nenhuma imagem foi gerada. Verifique se a competição foi concluída.",
//           );
//         }
//         $("posters").innerHTML = "";
//         imgs.forEach((p) => {
//           const url = p.canvas.toDataURL("image/png"),
//             fig = document.createElement("figure");
//           fig.innerHTML = `<img src="${url}" alt="${esc(p.title)}"><figcaption>${esc(p.title)}</figcaption><a class="btn sm" download="${slug}-${p.name}.png" href="${url}">Baixar PNG</a>`;
//           $("posters").appendChild(fig);
//         });
//         $("dlgPoster").showModal();
//       } catch (err) {
//         console.error(err);
//         toast("Não foi possível gerar as imagens.", true);
//       }
//       b.disabled = false;
//     }),
// );


// ---------- imagens para Instagram ----------
const loadImg = (src) => new Promise((resolve) => {
  if (!src) return resolve(null);

  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = () => {
    console.warn('Não foi possível carregar a imagem:', src);
    resolve(null);
  };

  im.src = src;
});

// Evento delegado para gerar imagens
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-poster]');
  if (!b) return;

  const slug = b.dataset.poster;

  console.log('[POSTER] Clique detectado:', slug);

  const game = ADMIN.games.find((x) => x.slug === slug);
  const br = data.bracket[slug];

  if (!game) {
    console.error('[POSTER] Jogo não encontrado:', slug);
    return toast('Modalidade não encontrada.', true);
  }

  // if (!br || !br.champion) {
  //   return toast('A competição precisa estar concluída.', true);
  // }

  if (!br || !br.exists) {
    return toast('Gere o chaveamento antes de exportar.', true);
  }

  b.disabled = true;

  try {
    // Verifica se o poster.js foi carregado
    if (typeof Poster === 'undefined' || typeof Poster.build !== 'function') {
      throw new Error('Poster.build não está disponível. Verifique o carregamento de poster.js.');
    }

    console.log('[POSTER] Preparando geração...', game, br);

    // Carrega fontes
    if (document.fonts) {
      await Promise.all([
        '700 40px "Chakra Petch"',
        '600 20px "Chakra Petch"',
        '500 20px "Barlow"'
      ].map((f) => document.fonts.load(f)));
    }

    // Carrega imagem de fundo
    const art = await loadImg(game.image);
    const logo = await loadImg('/img/logo-hubtec-26.png');

    const imgs = await Poster.build({
      game,
      bracket: br,
      art,
      logo,
      site: location.host
    });

    if (!imgs || imgs.length === 0) {
      throw new Error('Nenhuma imagem foi gerada.');
    }

    console.log('[POSTER] Imagens geradas:', imgs.length);

    // Limpa imagens anteriores
    $('posters').innerHTML = '';

    imgs.forEach((p) => {
      const url = p.canvas.toDataURL('image/png');
      const fig = document.createElement('figure');

      fig.innerHTML = `
        <img src="${url}" alt="${esc(p.title)}">
        <figcaption>${esc(p.title)}</figcaption>
        <a class="btn sm"
           download="${slug}-${p.name}.png"
           href="${url}">
          Baixar PNG
        </a>
      `;

      $('posters').appendChild(fig);
    });

    // Abre o diálogo
    $('dlgPoster').showModal();

    console.log('[POSTER] Diálogo aberto com sucesso.');

  } catch (err) {
    console.error('[POSTER] Erro ao gerar imagens:', err);
    toast(err.message || 'Não foi possível gerar as imagens.', true);

  } finally {
    b.disabled = false;
  }
});


if (pw) load();
