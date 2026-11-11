export const RADAR = {
  originX: -3230,
  originY: 1713,
  scale: 5,
  size: 1024,
};

export const EVENT_TYPES = {
  player_death: { label: "Abates", single: "Abate", color: "#ff777d" },
  bomb_planted: { label: "Bombas plantadas", single: "Bomba plantada", color: "#ffd166" },
  bomb_defused: { label: "Desarmes", single: "Desarme", color: "#61e8ba" },
};

export function projectMirage(position) {
  if (!position || ![position.x, position.y].every(Number.isFinite)) return null;
  const x = (position.x - RADAR.originX) / RADAR.scale;
  const y = (RADAR.originY - position.y) / RADAR.scale;
  return x >= 0 && y >= 0 && x <= RADAR.size && y <= RADAR.size ? { x, y } : null;
}

export function selectEvents(events, round, enabled) {
  return events.flatMap((event, index) => {
    if (!enabled.has(event.type) || (round !== null && event.round !== round)) return [];
    const point = projectMirage(event.position);
    return point ? [{ event, point, index }] : [];
  });
}
