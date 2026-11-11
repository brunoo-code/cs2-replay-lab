const { openSync, readSync, closeSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { parseHeader, parseEvents } = require("@laihoe/demoparser2");

const types = ["round_start", "round_end", "player_death", "bomb_planted", "bomb_defused", "bomb_exploded"];
const markers = {
  player_death: ["Abates (posição da vítima)", "#ff777d"],
  bomb_planted: ["Bomba plantada", "#ffd166"],
  bomb_defused: ["Desarme (posição do jogador)", "#61e8ba"],
};

function readStamp(file) {
  const descriptor = openSync(file, "r");
  try {
    const stamp = Buffer.alloc(8);
    if (readSync(descriptor, stamp) !== 8 || stamp.toString("ascii") !== "PBDEMS2\0") {
      throw new Error("Arquivo inválido ou replay fora do formato PBDEMS2.");
    }
    return stamp.toString("hex");
  } finally {
    closeSync(descriptor);
  }
}

function normalize(row) {
  const type = row.event_name;
  const located = Object.hasOwn(markers, type) && [row.user_X, row.user_Y].every(Number.isFinite);
  return {
    type,
    tick: row.tick,
    round: Number.isInteger(row.total_rounds_played) ? row.total_rounds_played + 1 : null,
    position: located ? { x: row.user_X, y: row.user_Y, z: Number.isFinite(row.user_Z) ? row.user_Z : null } : null,
    weapon: type === "player_death" ? row.weapon ?? null : null,
    headshot: type === "player_death" ? row.headshot ?? null : null,
    siteId: Number.isInteger(row.site) ? row.site : null,
  };
}

function analyze(file) {
  const stampHex = readStamp(file);
  const header = parseHeader(file);
  const events = parseEvents(file, types, ["X", "Y", "Z"], ["total_rounds_played"])
    .map(normalize)
    .sort((a, b) => a.tick - b.tick);
  const counts = Object.fromEntries(types.map((type) => [type, 0]));
  for (const event of events) counts[event.type]++;
  return { map: header.map_name, stampHex, counts, events };
}

const xml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[char]);

function renderMap(report) {
  const points = report.events.filter((event) => event.position);
  const bounds = points.reduce(({ minX, minY, maxX, maxY }, { position: { x, y } }) => ({
    minX: Math.min(x, minX), minY: Math.min(y, minY),
    maxX: Math.max(x, maxX), maxY: Math.max(y, maxY),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
  const scale = 390 / span;
  const dots = points.map(({ type, tick, round, position: { x, y } }) =>
    `<circle cx="${(270 + (x - (bounds.minX + bounds.maxX) / 2) * scale).toFixed(2)}" cy="${(301 - (y - (bounds.minY + bounds.maxY) / 2) * scale).toFixed(2)}" r="${type === "player_death" ? 4 : 7}" fill="${markers[type][1]}" fill-opacity=".87"><title>${type} · round ${round ?? "?"} · tick ${tick}</title></circle>`
  ).join("\n");
  const legend = Object.entries(markers).map(([type, [name, color]], index) => {
    const y = 203 + index * 46;
    return `<circle cx="545" cy="${y - 5}" r="5" fill="${color}"/><text x="561" y="${y}" fill="#e7edf5" font-size="15">${name}</text><text x="814" y="${y}" text-anchor="end" fill="${color}" font-size="16">${points.filter((event) => event.type === type).length}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 560" role="img" aria-labelledby="title">
<title id="title">Mapa de eventos de ${xml(report.map)}</title>
<defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#273649" stroke-width="1"/></pattern></defs>
<rect width="850" height="560" rx="14" fill="#111a28"/>
<g font-family="system-ui, sans-serif">
<text x="28" y="43" fill="#f3f6fb" font-size="26" font-weight="700">CS2 Replay Lab</text>
<text x="29" y="67" fill="#a5b5cb" font-size="15">${xml(report.map)} · projeção XY dos eventos</text>
<rect x="26" y="84" width="488" height="438" rx="8" fill="url(#grid)" stroke="#36475e"/>
${dots}
${points.length ? "" : '<text x="270" y="301" text-anchor="middle" fill="#a5b5cb">Sem eventos com posição</text>'}
<text x="538" y="124" fill="#f3f6fb" font-size="20" font-weight="650">${points.length} pontos no mapa</text>
<text x="538" y="152" fill="#a5b5cb" font-size="14">${report.events.length} eventos na linha do tempo</text>
${legend}
<text x="538" y="378" fill="#a5b5cb" font-size="13">Escala uniforme. +X à direita, +Y para cima.</text>
<text x="538" y="401" fill="#a5b5cb" font-size="13">Alturas sobrepostas, sem planta do cenário.</text>
</g></svg>\n`;
}

if (require.main === module) {
  const [file, output = "reports"] = process.argv.slice(2);
  try {
    if (!file) throw new Error("Uso: npm run analyze -- <replay.dem> [pasta-de-saída]");
    const report = analyze(file);
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, "events.json"), JSON.stringify(report, null, 2) + "\n");
    writeFileSync(join(output, "map.svg"), renderMap(report));
    console.log(`${report.map}: ${report.events.length} eventos. Relatórios em ${output}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { analyze, normalize, readStamp, renderMap };
