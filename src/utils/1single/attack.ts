import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  getRange
} from "game/utils";
import {
  ConstructionSite,
  Structure,
  OwnedStructure,
  Creep,
  Source,
  StructureContainer,
  StructureExtension,
  StructureSpawn,
  StructureTower,
  Resource,
  StructureRampart,
  RoomPosition
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
  WORK,
  BuildableStructure
} from "game/constants";

import { spawnList, ClassUnit } from "../spawnUnit";

const ATTACK_RANGE = 1;
const RANGED_ATTACK_RANGE = 3;

function findCreepsInRange(unit: ClassUnit, creeps: Creep[], range = 1): Creep[] {
  if (unit.object) {
    const obj = unit.object;
    const creepsInRange = creeps.filter(i => getRange(obj, i) <= range);
    return creepsInRange;
  } else {
    return [];
  }
}

/**
 * 找出进攻优先级
 * @param enemys 传入敌方所有单位
 * @returns
 */
function checkEnemyOrder(enemys: Creep[]) {
  if (enemys && enemys.length) {
    enemys.sort((a, b) => {
      return a.hits - b.hits;
    });
    return enemys[0];
  } else {
    return null;
  }
}

function findStructureInRange(unit: ClassUnit, structures: OwnedStructure[], range = 1): OwnedStructure[] {
  if (unit.object) {
    const obj = unit.object;
    const creepsInRange = structures.filter(i => i.my === false && getRange(obj, i) <= range);
    return creepsInRange;
  } else {
    return [];
  }
}

function checkEnemyStructsOrder(enemys: OwnedStructure[]) {
  if (enemys && enemys.length) {
    enemys.sort((a, b) => {
      return a.hits - b.hits;
    });
    return enemys[0];
  } else {
    return null;
  }
}

/**
 * 单人路过就摸。优先近战攻击，优先选定血最少单位
 * @param unit 本单位
 * @param enemys 传入敌方所有单位
 * @returns 如果攻击了敌人，就返回true
 */
function singleAttack(unit: ClassUnit, enemys: Creep[]): boolean {
  if (unit.object) {
    const obj = unit.object;
    if (obj.body && obj.body.some(b => b.type === "attack")) {
      const canHitEnemys = findCreepsInRange(unit, enemys, ATTACK_RANGE);
      const nearbyEnemy = checkEnemyOrder(canHitEnemys);
      if (nearbyEnemy) {
        obj.attack(nearbyEnemy);
        return true;
      } else {
        const structs = getObjectsByPrototype(OwnedStructure); // TODO 这里和下面有查询，看看如何优化
        const aims = findStructureInRange(unit, structs, ATTACK_RANGE);
        const aim = checkEnemyStructsOrder(aims);
        if (aim) {
          obj.attack(aim);
          return true;
        }
      }
    } else if (obj.body && obj.body.some(b => b.type === "ranged_attack")) {
      const canHitEnemys = findCreepsInRange(unit, enemys, RANGED_ATTACK_RANGE);
      const nearbyEnemy = checkEnemyOrder(canHitEnemys);
      if (nearbyEnemy) {
        obj.rangedAttack(nearbyEnemy);
        return true;
      } else {
        const structs = getObjectsByPrototype(OwnedStructure);
        const aims = findStructureInRange(unit, structs, RANGED_ATTACK_RANGE);
        const aim = checkEnemyStructsOrder(aims);
        if (aim) {
          obj.rangedAttack(aim);
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * 找出治疗优先级
 * @param creeps 传入友方所有单位
 * @returns
 */
function checkHealOrder(creeps: Creep[]) {
  if (creeps && creeps.length) {
    creeps.sort((a, b) => {
      return a.hits - b.hits;
    });
    return creeps[0];
  } else {
    return null;
  }
}

/**
 * 单人路过就奶
 * @param unit 本单位
 * @param myUnits 己方单位
 * @returns 如果奶过就返回true
 */

function singleHeal(unit: ClassUnit, myUnits: ClassUnit[]): boolean {
  if (unit.object) {
    const obj = unit.object;
    if (obj.body && obj.body.some(b => b.type === "heal")) {
      const myCreeps = myUnits.filter(i => i.object && i.object.hits < i.object.hitsMax).map(i => i.object);
      if (myCreeps && myCreeps.length) {
        // 如果范围为1内有友军，就治疗
        const canHealMelee = findCreepsInRange(unit, myCreeps as Creep[], ATTACK_RANGE);
        if (canHealMelee && canHealMelee.length) {
          const meleeHealTarget = checkHealOrder(canHealMelee);
          if (meleeHealTarget) {
            obj.heal(meleeHealTarget);
            return true;
          }
        }

        // 如果范围2-3内有友军，远程治疗
        const canHealRanged = findCreepsInRange(unit, myCreeps as Creep[], RANGED_ATTACK_RANGE);
        if (canHealRanged && canHealRanged.length) {
          const meleeHealTarget = checkHealOrder(canHealRanged);
          if (meleeHealTarget) {
            obj.rangedHeal(meleeHealTarget);
            return true;
          }
        }
      }
    }
  }

  return false;
}

function donotStayOnMyUnfinishedSite(creep: Creep) {
  const thissite = getObjectsByPrototype(ConstructionSite).find(
    i => i.x === creep.x && i.y === creep.y && i.progress < i.progressTotal && i.my
  );

  if (thissite && !(thissite.structure instanceof StructureRampart)) {
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        const pos: RoomPosition = { x: creep.x + i, y: creep.y + j };
        if (creep.moveTo(pos) === OK) {
          return;
        }
      }
    }
  }
}

export { singleAttack, singleHeal, donotStayOnMyUnfinishedSite };
