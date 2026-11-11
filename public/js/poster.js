// Exporta o chaveamento FINALIZADO como imagem (1080x1350, formato de feed do Instagram) usando <canvas>.
// Uso: const [img] = await Poster.build({ game, bracket, art, site });   // [] se a competição não terminou
const Poster = (() => {
  const W = 1080;

  const FEED_H = 1350;
  const STORY_H = 1920;

  // Área segura dos Stories
  const STORY_SAFE_TOP = 150;
  const STORY_SAFE_BOTTOM = 150;

  // Espaço reservado para rodapé e logo
  const STORY_FOOTER_SPACE = 170;
  const C = {
    bg: "#212121",
    bg2: "#181818",
    panel: "#3b3b3d",
    accent: "#0cb9a1",
    text: "#ffffff",
    muted: "#9aa8a5",
    dim: "#7b7b7b",
    line: "rgba(12,185,161,.6)",
  };
  const FONT = '"Chakra Petch", "Arial Black", Impact, sans-serif';
  const BODY = '"Barlow", Arial, sans-serif';

  // ---------- utilidades ----------
  const when = (iso) => {
    if (!iso) return null;
    const d = new Date(iso),
      o = { timeZone: "America/Sao_Paulo" };
    return {
      d: d.toLocaleDateString("pt-BR", {
        ...o,
        day: "2-digit",
        month: "2-digit",
      }),
      t: d.toLocaleTimeString("pt-BR", {
        ...o,
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };
  const font = (ctx, weight, size, family = FONT) => {
    ctx.font = `${weight} ${size}px ${family}`;
  };
  const spacing = (ctx, px) => {
    if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function rr(ctx, x, y, w, h, r) {
    // retângulo arredondado
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // reduz a fonte até caber; se ainda não couber, corta com "…". Deixa a fonte ajustada no ctx.
  function fit(ctx, text, maxW, size, weight = "700", family = FONT, min = 10) {
    let s = size;
    font(ctx, weight, s, family);
    while (ctx.measureText(text).width > maxW && s > min) {
      s -= 1;
      font(ctx, weight, s, family);
    }
    let t = String(text);
    if (ctx.measureText(t).width <= maxW) return t;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW)
      t = t.slice(0, -1);
    return t.trimEnd() + "…";
  }

  // ---------- fundo, cabeçalho e rodapé (cores do site) ----------

  
function base(ctx, { game, art, tag, site, height }) {
  const isStory = height === STORY_H;

  // Início do conteúdo dentro da área segura
  const safeTop = isStory ? STORY_SAFE_TOP : 0;
  const safeBottom = isStory ? STORY_SAFE_BOTTOM : 0;

  const artHeight = 290;
  const headerBottom = safeTop + artHeight;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, height);

  // Grade de fundo
  ctx.strokeStyle = "rgba(12,185,161,.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Arte do jogo: começa depois da margem superior
  if (art && art.width) {
    const s = Math.max(
      W / art.width,
      artHeight / art.height
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, safeTop, W, artHeight);
    ctx.clip();

    ctx.drawImage(
      art,
      (W - art.width * s) / 2,
      safeTop + (artHeight - art.height * s) / 2,
      art.width * s,
      art.height * s
    );

    ctx.restore();
  }

  // Degradê do cabeçalho
  const g = ctx.createLinearGradient(
    0,
    safeTop,
    0,
    headerBottom
  );

  g.addColorStop(0, "rgba(24,24,24,.45)");
  g.addColorStop(1, C.bg);

  ctx.fillStyle = g;
  ctx.fillRect(0, safeTop, W, artHeight);

  // Faixa superior decorativa
  ctx.fillStyle = C.accent;
  ctx.fillRect(0, safeTop, W, 10);

  // Identificação do evento
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  font(ctx, 700, 26);
  spacing(ctx, 8);

  ctx.fillStyle = C.accent;
  ctx.fillText(
    "GAME ZONE | HUBTEC'26",
    60,
    66 + safeTop
  );

  spacing(ctx, 0);

  // Nome do jogo
  ctx.fillStyle = C.text;
  ctx.shadowColor = "rgba(0,0,0,.6)";
  ctx.shadowBlur = 16;

  ctx.fillText(
    fit(ctx, game.name.toUpperCase(), W - 120, 92),
    60,
    168 + safeTop
  );

  ctx.shadowBlur = 0;

  // Identificação do chaveamento
  const label = fit(ctx, tag, W - 160, 26);

  spacing(ctx, 2);

  const tw = ctx.measureText(label).width + 44;

  rr(
    ctx,
    60,
    192 + safeTop,
    tw,
    50,
    6
  );

  ctx.fillStyle = C.accent;
  ctx.fill();

  ctx.fillStyle = "#102420";
  ctx.textBaseline = "middle";

  ctx.fillText(
    label,
    82,
    218 + safeTop
  );

  spacing(ctx, 0);

  // Rodapé dentro da área segura
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.muted;

  font(ctx, 500, 22, BODY);

  const footerOffset = isStory ? safeBottom : 0;

  ctx.fillText(
    "@fatecregistro",
    60,
    height - footerOffset - 70
  );

  ctx.fillText(
    `Inscrições e confrontos em ${site}`,
    60,
    height - footerOffset - 40
  );

  // Faixa inferior decorativa antes da margem reservada
  ctx.fillStyle = C.accent;
  ctx.fillRect(
    0,
    height - safeBottom - 12,
    W,
    12
  );
}


  function trophy(ctx, cx, bottomY, s) {
    // taça (base apoiada em bottomY)
    ctx.save();
    ctx.translate(cx, bottomY - 144 * s);
    ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, -90, 0, 144);
    g.addColorStop(0, "#ffe08a");
    g.addColorStop(1, "#c9921b");
    ctx.fillStyle = g;
    ctx.strokeStyle = g;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-70, -90);
    ctx.lineTo(70, -90);
    ctx.lineTo(70, -20);
    ctx.bezierCurveTo(70, 40, 30, 70, 0, 70);
    ctx.bezierCurveTo(-30, 70, -70, 40, -70, -20);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-70, -70);
    ctx.bezierCurveTo(-125, -70, -125, 5, -62, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(70, -70);
    ctx.bezierCurveTo(125, -70, 125, 5, 62, 12);
    ctx.stroke();
    ctx.fillRect(-13, 68, 26, 52);
    rr(ctx, -62, 118, 124, 26, 6);
    ctx.fill();
    ctx.restore();
  }

  // ---------- a árvore ----------
  function drawTree(ctx, bracket, height) {
    const R = bracket.total,
      K = bracket.rounds[0].matches.length;
    const n = R + 1; // rodadas + coluna do campeão
    const L = 46;
    const isStory = height === STORY_H;

const top = isStory ? 570 : 305;
const headH = 62;

const bottom = isStory
  ? height - STORY_SAFE_BOTTOM - STORY_FOOTER_SPACE
  : height - 80;

const A = bottom - top - headH;
    const gap = n <= 4 ? 54 : n === 5 ? 42 : 30;
    const cw = (W - 2 * L - gap * (n - 1)) / n;
    const hasWhen = bracket.rounds.some((r) =>
      r.matches.some((m) => !m.bye && m.scheduledAt),
    );
    const strip = hasWhen ? 24 : 0;
    const slot1 = A / K;
    const rowH = clamp((slot1 - 16 - strip) / 2, 14, 46);
    const cardH = rowH * 2 + strip,
      fs = clamp(rowH * 0.54, 11, 26);
    const cx = (c) => L + c * (cw + gap);
    const cy = (r, p) => top + headH + (p - 0.5) * slot1 * 2 ** (r - 1);

    // cabeçalhos das colunas
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const heads = [...bracket.rounds.map((r) => r.short), "Campeão"];
    heads.forEach((t, i) => {
      ctx.fillStyle = C.accent;
      spacing(ctx, 1);
      ctx.fillText(fit(ctx, t.toUpperCase(), cw, 21), cx(i) + cw / 2, top + 22);
      spacing(ctx, 0);
      ctx.fillStyle = "rgba(12,185,161,.45)";
      ctx.fillRect(cx(i), top + 46, cw, 2);
    });

    // linhas de ligação (por baixo dos cards)
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    bracket.rounds.forEach((rd, ri) =>
      rd.matches.forEach((m) => {
        const x = cx(ri) + cw,
          y = cy(rd.round, m.position);
        const ny =
          rd.round < R ? cy(rd.round + 1, Math.ceil(m.position / 2)) : y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + gap / 2, y);
        ctx.lineTo(x + gap / 2, ny);
        ctx.lineTo(x + gap, ny);
        ctx.stroke();
      }),
    );

    // cards das partidas
    bracket.rounds.forEach((rd, ri) =>
      rd.matches.forEach((m) => {
        const x = cx(ri),
          y = cy(rd.round, m.position) - cardH / 2;
        ctx.save();
        rr(ctx, x, y, cw, cardH, 8);
        ctx.fillStyle = C.panel;
        ctx.fill();
        rr(ctx, x, y, cw, cardH, 8);
        ctx.clip();
        const rows = [
          { p: m.p1, s: m.winner === 1 ? "win" : m.winner ? "lose" : "" },
          { p: m.p2, s: m.winner === 2 ? "win" : m.winner ? "lose" : "" },
        ];
        rows.forEach((r, i) => {
          const ry = y + i * rowH;
          if (r.s === "win") {
            ctx.fillStyle = "rgba(12,185,161,.3)";
            ctx.fillRect(x, ry, cw, rowH);
            ctx.fillStyle = C.accent;
            ctx.fillRect(x, ry, 6, rowH);
          }
          if (i === 1) {
            ctx.fillStyle = C.bg;
            ctx.fillRect(x, ry - 1, cw, 2);
          }
          const name = r.p ? r.p.name : m.bye && i === 1 ? "BYE" : "A definir";
          ctx.fillStyle =
            r.s === "lose"
              ? C.dim
              : !r.p || (m.bye && i === 1)
                ? "#858585"
                : C.text;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(
            fit(ctx, name, cw - 34, fs, r.s === "win" ? "700" : "600"),
            x + 20,
            ry + rowH / 2 + 1,
          );
        });
        if (strip) {
          ctx.fillStyle = C.bg2;
          ctx.fillRect(x, y + rowH * 2, cw, strip);
          const wh = !m.bye && when(m.scheduledAt);
          if (wh) {
            ctx.fillStyle = C.accent;
            ctx.textAlign = "center";
            font(ctx, 700, Math.round(strip * 0.58));
            ctx.fillText(
              `${wh.d} · ${wh.t}`,
              x + cw / 2,
              y + rowH * 2 + strip / 2 + 1,
            );
          }
        }
        ctx.restore();
        if (m.number) {
          // número do jogo (canto superior esquerdo)
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, 12, 0, Math.PI * 2);
          ctx.fillStyle = C.accent;
          ctx.fill();
          ctx.fillStyle = "#102420";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          font(ctx, 700, 14);
          ctx.fillText(String(m.number), x + 2, y + 3);
        }
      }),
    );

    // campeão ou status da competição
    const champ = bracket.champion;
    const ccx = cx(R);
    const ccy = cy(R, 1);
    const chH = Math.max(rowH * 1.6, 44);

    if (champ) {
      trophy(ctx, ccx + cw / 2, ccy - chH / 2 - 10, 0.2);
    }

    ctx.save();

    rr(ctx, ccx, ccy - chH / 2, cw, chH, 8);

    ctx.fillStyle = champ ? "rgba(12,185,161,.22)" : C.panel;

    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = champ ? C.accent : C.dim;
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = champ ? C.text : C.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      fit(
        ctx,
        champ ? champ.name : "A definir",
        cw - 20,
        clamp(fs * 1.15, 12, 30),
      ),
      ccx + cw / 2,
      ccy + 1,
    );
  }

  // ---------- montagem ----------
  async function build({ game, bracket, art, logo, site, createCanvas }) {
    if (!bracket.exists || !bracket.rounds?.length) return [];

    const make =
      createCanvas ||
      ((w, h) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      });

    function render(height, name, title) {
      const canvas = make(W, height);
      const ctx = canvas.getContext("2d");

      base(ctx, {
        game,
        art,
        tag: bracket.champion
          ? "CHAVEAMENTO FINALIZADO"
          : "CHAVEAMENTO EM ANDAMENTO",
        site,
        height,
      });

      drawTree(ctx, bracket, height);

      // Logo HubTec'26
      if (logo) {
       const logoWidth = 190;
const logoHeight = logoWidth * (92 / 466);

const x = W - logoWidth - 48;

const y = height === STORY_H
  ? height - STORY_SAFE_BOTTOM - logoHeight - 20
  : height - logoHeight - 48;

ctx.save();
ctx.drawImage(logo, x, y, logoWidth, logoHeight);
ctx.restore();
      }

      return { name, title, canvas };
    }

    return [
      render(FEED_H, "feed", "Feed Instagram (1080x1350)"),
      render(STORY_H, "stories", "Stories Instagram (1080x1920)"),
    ];
  }

  return { build, W, FEED_H, STORY_H };
})();

if (typeof module !== "undefined") module.exports = Poster; // (apenas para testes em Node)
