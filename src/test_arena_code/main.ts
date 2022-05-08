import {
  createConstructionSite,
  findClosestByPath,
  findClosestByRange,
  getObjectsByPrototype,
  getTicks,
  getObjectById
} from "game/utils";
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

import { withdrawClosestContainer, getWildSource } from "../arena_alpha_spawn_and_swamp/units/miner";
import { checkAim } from "../arena_alpha_spawn_and_swamp/units/rider";
import { spawnList, ClassUnit, UNITS } from "../arena_alpha_spawn_and_swamp/units/spawnUnit";
import { remoteAttackAndRun } from "../utils/battle";
import { addAttackRangeToCreeps, addHitsLabelToCreeps, initMapRoad } from "../utils/ui";

import { getRange } from "game";
import { singleAttack, singleHeal } from "../utils/1single/attack";

// 本版本ok
// 坑1 Spawn初始化store为500，然后tick1变为300
// 坑2 spawnCreep需要花费时间，所以不能按照不存在为判断条件来反复执行，只能以存在的else

let canBuildFlag = true;
const AllowBuildTower = false; // t开启建塔 f关闭建塔

let startAttack = false;
let startAtkDelay = -1;
let totalKilled = 0;
let lastEnemyNumber = 0;

const unitList: ClassUnit[] = [
  new ClassUnit(UNITS.smallCarryer, "smallCarryer"),
  new ClassUnit(UNITS.smallCarryer, "smallCarryer"), // 2c2w 460tick出动
  new ClassUnit(UNITS.smallCarryer, "smallCarryer"), // 3c2w 340tick出动 刚好用尽资源
  // new ClassUnit(UNITS.smallCarryer, "smallCarryer"), // 4c2w 430tick出动
  new ClassUnit(UNITS.smallWorker, "smallWorker"),
  new ClassUnit(UNITS.rider, "rider"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallHealer, "smallHealer", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1"),
  new ClassUnit(UNITS.smallArcher, "smallArcher", "atk1", true),
  new ClassUnit(UNITS.smallHealer, "smallHealer", "atk1")
];

export function loop() {
  if (getTicks() === 1) {
    initMapRoad();
  }

  // const crs = getObjectsByPrototype(Creep);
  // Your code goes here
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my) as StructureSpawn;
  // const source = getObjectsByPrototype(Source).find(s => s.energy > 0)
  const sources = getObjectsByPrototype(StructureContainer).filter(s => s.store[RESOURCE_ENERGY] > 0);

  const enermys = getObjectsByPrototype(Creep).filter(c => !c.my);

  const enermySpawn = getObjectsByPrototype(StructureSpawn).find(c => !c.my) as StructureSpawn;
  const carryers = getObjectsByPrototype(Creep).filter(
    c => c.my && c.body.some(b => b.type === "carry") && c.body.every(b => b.type !== "work")
  );

  const myUnits = getObjectsByPrototype(Creep).filter(c => c.my);
  const warriores = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "attack"));
  const archeres = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "ranged_attack"));
  const doctors = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "heal"));

  const towers = getObjectsByPrototype(StructureTower).filter(i => i.my);

  if (archeres && archeres.length > 7 && doctors && doctors.length > 1 && startAttack === false) {
    if (startAtkDelay === -1) {
      startAtkDelay = getTicks();
    } else if (getTicks() - startAtkDelay >= 30) {
      startAttack = true;
    }
  }

  // 判断如果造兵数量不足 但是战力足够已消灭部分敌人，则发起进攻
  if (totalKilled > 5) {
    startAttack = true;
  }

  if (enermys.length < lastEnemyNumber) {
    totalKilled += lastEnemyNumber - enermys.length;
    console.log(`${getTicks()} enermys:${enermys.length} killed:${totalKilled}`);
  }

  lastEnemyNumber = enermys.length;

  spawnList(mySpawn, unitList);

  // 采集工人行为
  for (let i = 0; i < carryers.length; i++) {
    const miner = carryers[i];
    const constructionSite = getObjectsByPrototype(ConstructionSite).find(o => o.my);

    // 判断是否需要建塔
    if (
      getTicks() >= 200 &&
      (!constructionSite || constructionSite.progress < constructionSite.progressTotal) &&
      canBuildFlag &&
      AllowBuildTower
    ) {
      console.log("建塔流程");
      if (mySpawn.store[RESOURCE_ENERGY] < 20 || towers.length) {
        canBuildFlag = false;
      }

      if (!miner.store[RESOURCE_ENERGY]) {
        const source = miner.findClosestByPath(sources);
        if (source && miner.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          miner.moveTo(source);
        }
      } else {
        // 工人建造
        if (!constructionSite) {
          console.log("准备建塔");
          if (i === 0) {
            // 去除同一个tick多个site建立
            const { x, y } = mySpawn;
            console.log(x, y);
            createConstructionSite({ x, y: y + 2 }, StructureTower);
          } else {
            withdrawClosestContainer(miner, sources, mySpawn);
          }
        } else {
          if (miner.build(constructionSite) === ERR_NOT_IN_RANGE) {
            miner.moveTo(constructionSite);
          }
        }
      }
    } else {
      // console.log("采集流程")
      // 如果有库存能量，就进建造循环
      if (!canBuildFlag && mySpawn.store[RESOURCE_ENERGY] > 200 && towers.length === 0) {
        canBuildFlag = true;
      }

      // 如果塔已经建好，但是能量为0，则运送能量
      if (towers.length) {
        const tower = towers[0];
        const energy1 = tower.store.getFreeCapacity(RESOURCE_ENERGY) as number;
        // console.log(energy1)
        // 为塔补充能量
        if (energy1 > 30 && miner.store[RESOURCE_ENERGY] > 40) {
          if (miner.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            miner.moveTo(tower);
          }

          continue; // 为了避免多次调用moveTo，这里增加一个跳出循环
        }
      }

      withdrawClosestContainer(miner, sources, mySpawn);
    }
  }

  console.log(
    `warriors num: ${warriores.length},   doctors:${doctors.length},   archeres: ${archeres.length},   workers: ${carryers.length}. ||| base energy: ${mySpawn.store[RESOURCE_ENERGY]}, base heal: ${mySpawn.hits}`
  );
}
