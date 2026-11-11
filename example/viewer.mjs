import { EVENT_TYPES, selectEvents } from "./radar.mjs?v=2";

const round = document.querySelector("#round");
const types = document.querySelector("#types");
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const points = document.querySelector("#points");
const timeline = document.querySelector("#timeline");
const radar = document.querySelector("#radar-image");
const imageError = document.querySelector("#radar-error");
let events = [];
let selected = null;
const options = new Map();

radar.addEventListener("error", () => { imageError.hidden = false; });
if (radar.complete && !radar.naturalWidth) imageError.hidden = false;

for (const [type, { label, color }] of Object.entries(EVENT_TYPES)) {
  const row = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.addEventListener("change", render);
  const dot = document.createElement("span");
  dot.className = "swatch";
  dot.style.background = color;
  dot.setAttribute("aria-hidden", "true");
  row.append(input, dot, label);
  types.append(row);
  options.set(type, input);
}
round.addEventListener("change", render);

function select(item, controls) {
  selected = item.index;
  for (const control of controls) {
    control.setAttribute("aria-pressed", String(Number(control.dataset.index) === selected));
  }
  const { event } = item;
  const heading = `${EVENT_TYPES[event.type].single} · round ${event.round ?? "?"} · tick ${event.tick}`;
  details.textContent = [heading, event.weapon, event.headshot ? "Headshot" : null].filter(Boolean).join(" · ");
}

function render() {
  const enabled = new Set([...options].filter(([, input]) => input.checked).map(([type]) => type));
  const visible = selectEvents(events, round.value ? Number(round.value) : null, enabled);
  points.replaceChildren();
  timeline.replaceChildren();
  status.textContent = `${visible.length} ${visible.length === 1 ? "evento no radar" : "eventos no radar"}`;
  details.textContent = visible.length ? "Selecione um ponto ou evento para ver os detalhes." : "Nenhum evento com posição para estes filtros.";
  const controls = [];
  for (const item of visible) {
    const { event, point, index } = item;
    const type = EVENT_TYPES[event.type];
    const label = `${type.single} · round ${event.round ?? "?"} · tick ${event.tick}`;
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    for (const [name, value] of Object.entries({
      cx: point.x, cy: point.y, r: 9, fill: type.color, tabindex: 0, role: "button", "aria-label": label,
    })) marker.setAttribute(name, value);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = label;
    marker.append(title);
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(item, controls);
      }
    });
    points.append(marker);
    const entry = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    entry.append(button);
    timeline.append(entry);
    for (const control of [marker, button]) {
      controls.push(control);
      control.dataset.index = index;
      control.setAttribute("aria-pressed", "false");
      control.addEventListener("click", () => select(item, controls));
    }
  }
  const previous = visible.find(({ index }) => index === selected);
  if (previous) select(previous, controls);
  else selected = null;
}

try {
  const response = await fetch("./events.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const report = await response.json();
  if (report.map !== "de_mirage" || !Array.isArray(report.events)) throw new Error("Replay incompatível");
  events = report.events;
  const rounds = [...new Set(events.map(({ round }) => round).filter(Number.isInteger))].sort((a, b) => a - b);
  for (const number of rounds) round.add(new Option(`Round ${number}`, number));
  round.disabled = false;
  types.disabled = false;
  render();
} catch (error) {
  status.textContent = `Não foi possível abrir o replay (${error.message}).`;
}
