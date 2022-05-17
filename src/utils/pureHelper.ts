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
  WORK,
  BODYPART_HITS
} from "game/constants";
// import { ClassUnit } from "./spawnUnit";

// 各部件成本
const COST_HASH = {
  attack: 80,
  ranged_attack: 150,
  heal: 250,
  work: 100,
  carry: 50,
  move: 50,
  tough: 10,
  claim: 600
};

// 模拟战力表，第一版
const BATTLE_HASH = {
  attack: 30 * 0.2, // 近战经常打不到
  ranged_attack: 10,
  heal: 12 * 0.4, // 治疗权重放弱
  work: 0,
  carry: 0,
  move: 4,
  tough: 2,
  claim: 0
};

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
 * 根据最大距离连接并拆为分组
 * @param creeps 带分组列表
 * @param range 最大拆分距离，默认10
 * @returns
 */
function splitCreepByPosition(creeps: Creep[], range = 10) {
  const flatGroups = [];

  // 粗聚类，将creep在range范围内各自聚类
  for (let i = 0; i < creeps.length; i++) {
    const creepsGroup: Creep[] = [];
    const element = creeps[i];
    creepsGroup.push(element);
    for (let j = 0; j < creeps.length; j++) {
      const other = creeps[j];
      if (i === j) {
        continue;
      }

      if (getRange(element, other) <= range) {
        if (!creepsGroup.includes(element)) {
          creepsGroup.push(element);
        }

        creepsGroup.push(other);
      }
    }

    flatGroups.push(creepsGroup);
  }

  // 将各聚类按距离连接成大聚类，并去重
  const results: Creep[][] = [];
  for (const group of flatGroups) {
    let pushed = false;
    for (const result of results) {
      if (result.some(creep => group.includes(creep))) {
        for (const creep of group) {
          if (!result.includes(creep)) {
            result.push(creep);
          }
        }

        pushed = true;
        break;
      }
    }

    if (!pushed) {
      results.push(group);
    }
  }

  console.log(`Units groups: ${results.length}`);

  // 计算每个聚类的中心坐标
  const centers = [];
  const costs = [];
  const battleValues = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const pos = calculateCenterOfCreeps(result);
    const { cost, battleValue } = calcCostAndBattleValue(result);
    console.log(
      `---Group ${i} has creeps: ${result.length},battle value: ${battleValue}, cost: ${cost}  center:${pos.x}, ${pos.y}`
    );
    centers.push(pos);
    costs.push(cost);
    battleValues.push(battleValue);
  }

  console.log("---------------------------");
  return { groups: results, centers, costs, battleValues };
}

/**
 * 返回小队的中心坐标
 * @param creeps 待计算单位列表
 * @returns RoomPosition:{x,y}
 */
function calculateCenterOfCreeps(creeps: Creep[]): RoomPosition {
  const x = toFixedNumber(creeps.reduce((sum, creep) => sum + creep.x, 0) / creeps.length);
  const y = toFixedNumber(creeps.reduce((sum, creep) => sum + creep.y, 0) / creeps.length);

  return { x, y };
}

export function hasBattleParts(creep: Creep) {
  return creep.body.some(b => b.type === "attack" || b.type === "ranged_attack" || b.type === "heal");
}

/**
 * 计算一组单位的成本和战力
 * @param creeps 单位组或者单个单位
 * @returns cost:单位总建造成本 battlevalue:单位总战斗力
 */
export function calcCostAndBattleValue(creeps: Creep | Creep[]) {
  if (!Array.isArray(creeps)) {
    creeps = [creeps];
  }

  let cost = 0;
  let leftCost = 0;
  let battleValue = 0;

  for (const creep of creeps) {
    for (const bodyPart of creep.body) {
      const { type, hits } = bodyPart;

      cost += COST_HASH[type];
      if (hits) {
        battleValue += (BATTLE_HASH[type] * hits) / BODYPART_HITS;
        leftCost += (COST_HASH[type] * hits) / BODYPART_HITS;
      }
    }
  }

  return { cost, battleValue: toFixedNumber(battleValue), leftCost: toFixedNumber(leftCost) };
}

/**
 * 保留几位小数
 * @param num
 * @param times 位数，默认保留1位
 * @returns
 */
export function toFixedNumber(num: number, times = 1): number {
  const temp = 10 ** times;
  return Math.round(num * temp) / temp;
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
  const alert = checkAims.some(aim => getRange(center, aim) < range);

  if (alert) {
    console.log(`单位入侵警告，到${center.x},${center.y}距离${range}之内遇敌`);
  }

  return alert;
}

/**
 * 拉一个creep到目标地点
 * @param puller 拉的creep
 * @param bePulled  被拉的creep
 * @param targetPos   目标地点
 * @returns  true表示拉完了
 */
function pullCreepTo(puller: Creep, bePulled: Creep, targetPos: Pos): boolean {
  // console.log(puller, bePulled, targetPos);
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

export {
  splitCreepsInRamparts,
  alertInRange,
  pullCreepTo,
  repeatArray,
  checkIfInRampart,
  filterAimsInRangeAndSort,
  splitCreepByPosition,
  calculateCenterOfCreeps
};
