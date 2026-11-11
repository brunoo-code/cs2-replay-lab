import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EVENT_TYPES, projectMirage, selectEvents } from "./radar.mjs";

const { events } = JSON.parse(readFileSync(new URL("events.json", import.meta.url)));

test("Mirage projection respects origin, scale, and inverted Y", () => {
  assert.deepEqual(projectMirage({ x: -3230, y: 1713 }), { x: 0, y: 0 });
  assert.deepEqual(projectMirage({ x: -2730, y: 1213 }), { x: 100, y: 100 });
  assert.equal(projectMirage({ x: -3231, y: 1713 }), null);
});

test("filters replay markers by round and event type", () => {
  assert.equal(selectEvents(events, null, new Set(Object.keys(EVENT_TYPES))).length, 81);
  const deaths = selectEvents(events, 1, new Set(["player_death"]));
  assert.ok(deaths.length > 0);
  assert.ok(deaths.every(({ event }) => event.round === 1 && event.type === "player_death"));
  assert.equal(selectEvents(events, null, new Set(["bomb_planted"])).length, 7);
  assert.equal(selectEvents(events, null, new Set(["bomb_defused"])).length, 1);
  assert.deepEqual(selectEvents(events, null, new Set()), []);
});
