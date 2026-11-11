const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { analyze, normalize, readStamp, renderMap } = require("./analyze");

test("rejects a non-Source-2 file before parsing", () => {
  assert.throws(() => readStamp(__filename), /PBDEMS2/);
});

test("coordinates stay absent when missing or when they describe the wrong entity", () => {
  assert.equal(normalize({ event_name: "player_death", user_X: null, user_Y: 20 }).position, null);
  assert.equal(normalize({ event_name: "bomb_exploded", user_X: 10, user_Y: 20 }).position, null);
  assert.deepEqual(normalize({ event_name: "player_death", user_X: 0, user_Y: -2 }).position,
    { x: 0, y: -2, z: null });
});

test("the map renders an empty report and escapes the map name", () => {
  const svg = renderMap({ map: "<invalid>", events: [] });
  assert.match(svg, /&lt;invalid&gt;/);
  assert.match(svg, /Sem eventos com posição/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

const sample = join(__dirname, "sample.dem");
test("Mirage fixture matches the expected timeline and event locations", {
  skip: !existsSync(sample) && "Run npm run sample to download the fixture",
}, () => {
  const report = analyze(sample);
  assert.equal(report.map, "de_mirage");
  assert.equal(report.stampHex, "504244454d533200");
  assert.deepEqual(report.counts, {
    round_start: 10, round_end: 10, player_death: 73,
    bomb_planted: 7, bomb_defused: 1, bomb_exploded: 2,
  });
  assert.equal(report.events.length, 103);
  assert.ok(report.events.every((event, index, events) => !index || event.tick >= events[index - 1].tick));
  const first = report.events.find((event) => event.type === "player_death");
  assert.equal(first.tick, 3086);
  assert.equal(first.weapon, "p250");
  assert.ok(Math.abs(first.position.x - (-834.4987)) < 0.001);
  assert.match(renderMap(report), /de_mirage/);
});
