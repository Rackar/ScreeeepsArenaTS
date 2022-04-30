import { Visual } from "game/visual";
import { CostMatrix } from "game/path-finder";
import { createConstructionSite, findClosestByPath, getObjectsByPrototype, getTicks, getObjectById } from "game/utils";
import {
  ConstructionSite,
  Creep,
  Source,
  StructureContainer,
  StructureExtension,
  StructureSpawn,
  StructureTower,
  Resource
} from "game/prototypes";
import {
  ATTACK,
  CARRY,
  ERR_NOT_IN_RANGE,
  HEAL,
  MOVE,
  OK,
  RANGED_ATTACK,
  RESOURCE_ENERGY,
  TOUGH,
  TOWER_RANGE,
  WORK
} from "game/constants";
interface CreepWithVisual extends Creep {
  hitsVisual?: Visual;
  attackRangeVisual?: Visual;
}
function addHitsLabelToCreeps(creeps: CreepWithVisual[]) {
  for (const creep of creeps) {
    if (!creep.hitsVisual) {
      creep.hitsVisual = new Visual(10, true);
    }

    creep.hitsVisual.clear().text(
      creep.hits.toString(),
      { x: creep.x, y: creep.y - 0.5 }, // above the creep
      {
        font: "0.5",
        opacity: 0.7,
        backgroundColor: "#808080",
        backgroundPadding: 0.03
      }
    );
  }
}

function addAttackRangeToCreeps(creeps: CreepWithVisual[]) {
  for (const creep of creeps) {
    let mAttack = false;
    let rAttack = false;
    if (!creep.attackRangeVisual) {
      creep.attackRangeVisual = new Visual(9, true);
    } else {
      creep.attackRangeVisual?.clear();
    }

    if (creep.body.some(i => i.type === ATTACK)) {
      mAttack = true;
    }

    if (creep.body.some(i => i.type === RANGED_ATTACK)) {
      rAttack = true;
    }

    if (mAttack) {
      creep.attackRangeVisual.rect({ x: creep.x - 1, y: creep.y - 1 }, 3, 3, {
        stroke: "#ff0000",
        opacity: 0.4,
        lineStyle: "dashed"
      });
    }

    if (rAttack) {
      creep.attackRangeVisual.rect({ x: creep.x - 3, y: creep.y - 3 }, 7, 7, {
        stroke: "#0000DD",
        opacity: 0.3,
        lineStyle: "dashed"
      });
    }
  }
}

function initMapRoad() {
  const costs = new CostMatrix();
}

export { addHitsLabelToCreeps, addAttackRangeToCreeps };
