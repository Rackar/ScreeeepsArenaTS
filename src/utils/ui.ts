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

import { ClassUnit } from "./spawnUnit";

function addHitsLabelToCreeps(creepUnits: ClassUnit[]) {
  for (const creepUnit of creepUnits) {
    const creep = creepUnit.object;
    if (creep) {
      if (!creep.exists || !creep.hits) {
        console.log("本单位已死亡");
        if (creepUnit.hitsVisual) {
          creepUnit.hitsVisual.clear();
          creepUnit.hitsVisual = undefined;
        }

        continue;
      }

      showHealthBar(creep);

      // if (!creepUnit.hitsVisual) {
      //   creepUnit.hitsVisual = new Visual(10, true);
      // }

      // creepUnit.hitsVisual.clear().text(
      //   creep.hits.toString(),
      //   { x: creep.x, y: creep.y - 0.5 }, // above the creep
      //   {
      //     font: "0.5",
      //     opacity: 0.7,
      //     backgroundColor: "#808080",
      //     backgroundPadding: 0.03
      //   }
      // );
    }
  }
}

const VISUAL_LAYER = 6;

/**
 * 在creep头上显示一个血条，长度为一格，支持不同根据血量切换颜色
 * @param {import("game/prototypes").Creep} obj
 * @author UndefinedCpp
 * @version 1.0
 */
export function showHealthBar(obj: Creep) {
  const visbase = new Visual(VISUAL_LAYER, false);
  // 打底色
  visbase.line(
    { x: obj.x - 0.5, y: obj.y - 0.5 },
    { x: obj.x + 0.5, y: obj.y - 0.5 },
    { color: "#727272", opacity: 0.4 }
  );
  // 算比例
  const ratio = obj.hits / obj.hitsMax;
  // 撸颜色
  const colorScheme = {
    low: "#ff0000",
    mid: "#ffff00",
    high: "#00ff00"
  };
  const colorCode = ratio >= 0.8 ? colorScheme.high : ratio >= 0.3 ? colorScheme.mid : colorScheme.low;
  // 打颜色
  const vis = new Visual(VISUAL_LAYER + 1, false);
  vis.line(
    { x: obj.x - 0.5, y: obj.y - 0.5 },
    { x: obj.x - 0.5 + ratio, y: obj.y - 0.5 },
    { color: colorCode, opacity: 0.8 }
  );
}

function addAttackRangeToCreeps(creepUNits: ClassUnit[]) {
  for (const creepUnit of creepUNits) {
    const creep = creepUnit.object;
    if (creep) {
      let mAttack = false;
      let rAttack = false;
      if (!creep.exists || !creep.hits) {
        if (creepUnit.attackRangeVisual) {
          creepUnit.attackRangeVisual.clear();
          creepUnit.attackRangeVisual = undefined;
        }

        continue;
      }

      if (!creepUnit.attackRangeVisual) {
        creepUnit.attackRangeVisual = new Visual(9, true);
      } else {
        creepUnit.attackRangeVisual?.clear();
      }

      if (creep.body.some(i => i.type === ATTACK)) {
        mAttack = true;
      }

      if (creep.body.some(i => i.type === RANGED_ATTACK)) {
        rAttack = true;
      }

      if (mAttack) {
        creepUnit.attackRangeVisual.rect({ x: creep.x - 1, y: creep.y - 1 }, 2, 2, {
          stroke: "#DD0000",
          opacity: 0.1,
          lineStyle: "solid",
          fill: "#AAAAAA"
        });
      }

      if (rAttack) {
        creepUnit.attackRangeVisual.rect({ x: creep.x - 3, y: creep.y - 3 }, 6, 6, {
          stroke: "#0000DD",
          opacity: 0.1,
          lineStyle: "solid",
          fill: "#AAAAAA"
        });
      }
    }
  }
}

/**
 * @description: 创建一个地图损失数组
 *
 */

function initMapRoad(): void {
  const costs = new CostMatrix();
  console.log(costs.serialize());
}

export { addHitsLabelToCreeps, addAttackRangeToCreeps, initMapRoad };
