import { getTicks } from "game/utils";

import { Visual } from "game/visual";

import { ClassUnit } from "./spawnUnit";

function ticktok(value: number, wave: number, ticks = 10) {
  const time = getTicks() % ticks;
  const harf = time / (ticks / 2);
  return value * (1 - time / ticks);
}

function addPeopleUi(unit: ClassUnit) {
  const creep = unit.object;
  if (!creep) {
    return;
  }

  if (!unit.vis) {
    unit.vis = new Visual(10, true);
  }

  const { vis } = unit;

  const pos = {
    x: creep.x,
    y: creep.y
  };

  vis.clear();
  // head
  vis.circle(
    { x: pos.x, y: pos.y - 0.7 },
    {
      radius: 0.3,
      fill: "#aa0000",
      opacity: 0.5
    }
  );
  // body
  // vis.rect({ x: pos.x, y: pos.y }, 0.2, 0.2, { fill: "#00bb00", opacity: 0.5 });
  // left arm
  vis.line(
    { x: pos.x - 0.4, y: pos.y - 0.1 },
    { x: pos.x - 0.6, y: pos.y + 0.1 },
    { color: "#0000ff", opacity: 0.7, width: 0.2 }
  );
  // right arm
  vis.line(
    { x: pos.x + 0.4, y: pos.y - 0.1 },
    { x: pos.x + 0.6, y: pos.y + 0.1 },
    { color: "#0000ff", opacity: 0.7, width: 0.2 }
  );
  // left leg
  vis.line(
    { x: pos.x - 0.25, y: pos.y + 0.4 },
    { x: pos.x - 0.2, y: pos.y + 0.7 },
    { color: "#0000ff", opacity: 0.7, width: 0.2 }
  );
  // right leg
  vis.line(
    { x: pos.x + 0.25, y: pos.y + 0.4 },
    { x: pos.x + 0.2, y: pos.y + 0.7 },
    { color: "#0000ff", opacity: 0.7, width: 0.2 }
  );
}

export { addPeopleUi };
