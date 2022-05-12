import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  findClosestByRange,
  getRange
} from "game/utils";
import {
  ConstructionSite,
  Creep,
  RoomPosition,
  Source,
  StructureContainer,
  StructureRampart,
  StructureSpawn,
  StructureTower
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
// import { ClassUnit } from "./spawnUnit";
/**
 * 将数组分为两边 检查哪些单位进入了特点坐标点群，如地堡
 * @param creeps
 * @param ramparts
 * @returns
 */
function splitCreepsInRamparts(creeps: Creep[], ramparts: RoomPosition[]) {
  const creepsInRamparts: Creep[] = [];
  const creepsNotInRamparts: Creep[] = [];
  for (const creep of creeps) {
    const inRampart = checkIfInRampart(creep, ramparts);

    if (inRampart) {
      creepsInRamparts.push(creep);
    } else {
      creepsNotInRamparts.push(creep);
    }
  }

  return { creepsInRamparts, creepsNotInRamparts };
}

/**
 * 检查本单位是否在某些坐标点群中
 * @param creep
 * @param ramparts
 * @returns true为是
 */
function checkIfInRampart(creep: Creep, ramparts: RoomPosition[]): boolean {
  let inRampart = false;
  for (const rampart of ramparts) {
    if (creep.x === rampart.x && creep.y === rampart.y) {
      inRampart = true;
      break;
    }
  }

  return inRampart;
}

function filterAimsInRangeAndSort<T extends RoomPosition>(pos: RoomPosition, aims: T[], range: number) {
  return aims.filter(aim => getRange(pos, aim) < range).sort((a, b) => getRange(pos, a) - getRange(pos, b));
}

/**
 * 监控一类单位是否入侵或者靠近
 * @param center 警戒单位
 * @param checkAims 关注的单位列表
 * @param range 侵入范围值（小于值才报警）
 * @returns 返回有侵入情况
 */
function alertInRange(center: RoomPosition, checkAims: RoomPosition[], range: number) {
  for (const aim of checkAims) {
    console.log(getRange(center, aim));
  }

  return checkAims.some(aim => getRange(center, aim) < range);
}

/**
 * 拉一个creep到目标地点
 * @param puller 拉的creep
 * @param bePulled  被拉的creep
 * @param targetPos   目标地点
 * @returns  true表示拉完了
 */
function pullCreepTo(puller: Creep, bePulled: Creep, targetPos: Pos): boolean {
  console.log(puller, bePulled, targetPos);
  if (getRange(bePulled, targetPos) !== 0) {
    if (getRange(puller, targetPos) !== 0) {
      puller.pull(bePulled);
      puller.moveTo(targetPos);
      bePulled.moveTo(puller);
    } else {
      puller.pull(bePulled);
      puller.moveTo(bePulled);
      bePulled.moveTo(puller);
    }
  } else {
    return true;
  }

  return false;
}

function repeatArray<T>(array: T[], times: number) {
  const result = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }

  return result;
}

export { splitCreepsInRamparts, alertInRange, pullCreepTo, repeatArray, checkIfInRampart, filterAimsInRangeAndSort };
