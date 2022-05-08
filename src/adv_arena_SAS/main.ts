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

import { withdrawClosestContainer, getWildSource } from "./miner";
import { checkAim } from "../arena_alpha_spawn_and_swamp/units/rider";
import { spawnList, ClassUnit, UNITS } from "../arena_alpha_spawn_and_swamp/units/spawnUnit";
import { remoteAttackAndRun } from "../utils/battle";
import { addAttackRangeToCreeps, addHitsLabelToCreeps, initMapRoad } from "../utils/ui";

import { getRange } from "game";

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

const workerUnit = new ClassUnit(UNITS.smallWorker, "smallWorker");

export function loop() {
  if (getTicks() === 1) {
    initMapRoad();
  }

  // const crs = getObjectsByPrototype(Creep);
  // Your code goes here
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my);
  const trueSources = getObjectsByPrototype(Source).filter(s => s.energy > 0);
  const sources = getObjectsByPrototype(StructureContainer).filter(s => s.store[RESOURCE_ENERGY] > 0);

  const enermys = getObjectsByPrototype(Creep).filter(c => !c.my);

  const enermySpawn = getObjectsByPrototype(StructureSpawn).find(c => !c.my);
  const carryers = getObjectsByPrototype(Creep).filter(
    c => c.my && c.body.some(b => b.type === "carry") && c.body.every(b => b.type !== "work")
  );

  const myUnits = getObjectsByPrototype(Creep).filter(c => c.my);
  const warriores = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "attack"));
  const archeres = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "ranged_attack"));
  const doctors = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "heal"));

  const towers = getObjectsByPrototype(StructureTower).filter(i => i.my);

  if (!mySpawn) {
    const worker = myUnits.find(c => c.my && c.body.some(b => b.type === "work"));
    if (worker) {
      if (!workerUnit.object) {
        workerUnit.object = worker;
      }

      // const path = findClosestByPath(worker, trueSources);
      getWildSource(workerUnit, trueSources, mySpawn);
    }

    return;
  }

  // 添加战斗用UI
  addAttackRangeToCreeps(unitList);
  addHitsLabelToCreeps(unitList);

  // 建塔后发起进攻
  // if (myUnits && myUnits.length > 0) {
  //     startAttack = true
  // }
  // 弓箭和治疗有数量后开始进攻
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

  // 测试使用单worker野外偷矿建extension
  const workers = unitList.filter(u => u.name === "smallWorker");
  for (const worker of workers) {
    if (worker && worker.object && worker.alive) {
      // const workerObj = worker.object;
      getWildSource(worker, trueSources, mySpawn);
    }
  }

  // 测试使用单骑兵野外骚扰和偷塔
  const riders = unitList.filter(u => u.name === "rider");
  for (const rider of riders) {
    if (rider && rider.object && rider.alive) {
      checkAim(rider);
    }
  }

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

  // 防御塔行为
  for (const tower of towers) {
    // const tower = towers[i];
    const targets = getObjectsByPrototype(Creep).filter(i => !i.my);
    if (targets.length) {
      const target = tower.findClosestByRange(targets);
      if (target) {
        console.log("tower range:", tower.getRangeTo(target));
        if (target && tower.getRangeTo(target) <= TOWER_RANGE) {
          tower.attack(target);
        }
      }
    }
  }

  // 战士行为
  for (let i = 0; i < warriores.length; i++) {
    const warrior = warriores[i];
    if (i !== 0 && i % 5 === 0) {
      if (enermySpawn && warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
        warrior.moveTo(enermySpawn);
      }

      continue;
    }

    if (enermys && enermys.length) {
      const enemy = warrior.findClosestByRange(enermys);
      if (enemy && enermySpawn) {
        // 如果离塔 足够近，则打塔
        const path = warrior.findPathTo(enemy);

        const spawnPath = warrior.findPathTo(enermySpawn);
        if (spawnPath.length < path.length) {
          if (warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
            warrior.moveTo(enermySpawn);
          }

          continue;
        }
      }

      if (enemy && warrior.attack(enemy) === ERR_NOT_IN_RANGE) {
        warrior.moveTo(enemy);
      }
    } else {
      if (!enermySpawn) {
        continue;
      }

      if (warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
        warrior.moveTo(enermySpawn);
      }
    }
  }

  // const center = getGroupCenter("atk1");

  // if (center) {
  //   const enemy = findClosestByRange(center, enermys);
  //   if (enemy && getRange(center, enemy) <= 25 && getRange(center, enemy) >= 10) {
  //     calcGourpDistance("atk1", center);
  //   }
  // }

  // 远程弓箭手行为
  for (let i = 0; i < archeres.length; i++) {
    const archer = archeres[i];

    // 准备好之前不出击
    if (!startAttack) {
      const enemy = archer.findClosestByRange(enermys);

      if (enemy) {
        const range = archer.getRangeTo(enemy);
        if (range <= 20) {
          // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)
          remoteAttackAndRun(archer, enemy, enermys);
          continue;
        }
      }

      // 否则，分两批集结
      if (i % 2 === 0) {
        archer.moveTo({ x: mySpawn.x - 4, y: mySpawn.y - 4 });
      } else {
        archer.moveTo({ x: mySpawn.x + 4, y: mySpawn.y + 4 });
      }
    } else {
      if (enermys && enermys.length) {
        let enermy = archer.findClosestByRange(enermys) as Creep;
        // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)

        let range = archer.getRangeTo(enermy);

        // 如果有偷塔行为，则防御偷塔
        const thiefEnermy = mySpawn.findClosestByRange(enermys);
        if (thiefEnermy) {
          const thiefRange = mySpawn.getRangeTo(thiefEnermy);
          if (thiefRange <= 40 && Math.abs(thiefEnermy.x - mySpawn.x) < 10) {
            console.log("检测到偷塔");
            enermy = thiefEnermy;
            range = thiefRange;
          }
        }

        if (enermySpawn) {
          const spawnRange = archer.getRangeTo(enermySpawn);
          if (spawnRange + 5 < range && spawnRange <= 20) {
            if (archer.rangedAttack(enermySpawn) === ERR_NOT_IN_RANGE) {
              archer.moveTo(enermySpawn);
            }

            continue;
          }
        }
        // 如果离塔 足够近，则打塔

        remoteAttackAndRun(archer, enermy, enermys);
      } else {
        if (enermySpawn && archer.rangedAttack(enermySpawn) === ERR_NOT_IN_RANGE) {
          archer.moveTo(enermySpawn);
        }
      }
    }
  }

  // 可能有过远导致卡住的bug
  // tofix

  function getGroupCenter(gourpName = "atk1") {
    const gourp1 = unitList.filter(u => u.group === gourpName);
    if (gourp1 && gourp1.length) {
      let xSum = 0;
      let ySum = 0;
      let count = 0;

      for (const creep of gourp1) {
        if (creep && creep.object && creep.alive) {
          // const workerObj = worker.object;
          const { x, y } = creep.object;
          xSum += x;
          ySum += y;
          count++;
        }
      }

      const xCenter = xSum / count;
      const yCenter = ySum / count;

      return { x: xCenter, y: yCenter };
    } else {
      return null;
    }
  }

  // 简易计算团体内距离，太远则聚拢
  function calcGourpDistance(gourpName = "atk1", theCenter: { x: number; y: number }) {
    if (!theCenter) {
      const centter = getGroupCenter(gourpName);
      if (!centter) {
        return;
      } else {
        theCenter = centter;
      }
    }

    const gourp1 = unitList.filter(u => u.group === gourpName);
    if (gourp1 && gourp1.length) {
      const xCenter = theCenter.x;
      const yCenter = theCenter.y;

      let totalDistance = 0;
      let maxDistance = 0;

      for (const creep of gourp1) {
        if (creep && creep.object && creep.alive) {
          // const workerObj = worker.object;
          const { x, y } = creep.object;
          const distance = Math.sqrt(Math.pow(x - xCenter, 2) + Math.pow(y - yCenter, 2));
          totalDistance += distance;
          if (distance > maxDistance) {
            maxDistance = distance;
          }
        }
      }

      if (totalDistance > 50 || maxDistance > 13) {
        console.log("队形太散，需要聚集");
        for (const creep of gourp1) {
          if (creep && creep.object && creep.alive) {
            creep.object.moveTo({ x: xCenter, y: yCenter });
          }
        }
      }
    }

    // return { xCenter, yCenter, dis };
  }

  // 医疗兵行为
  for (const doctor of doctors) {
    // const doctor = doctors[i];
    const myDamagedCreeps = getObjectsByPrototype(Creep).filter(o => o.my && o.hits < o.hitsMax);
    const battleUnits = myUnits.filter(c => c.body.some(b => b.type === "attack" || b.type === "ranged_attack"));

    // 如果自己受伤并离敌人过近，则远离敌军
    if (doctor.hits < doctor.hitsMax) {
      const enermy = doctor.findClosestByRange(enermys);
      if (!enermy) {
        continue;
      }

      const path = doctor.findPathTo(enermy);
      if (enermy.body.some(b => b.type === "attack" || b.type === "ranged_attack") && path.length <= 6) {
        // 有敌方攻击单位，风筝
        const x = doctor.x + doctor.x - enermy.x;
        const y = doctor.y + doctor.y - enermy.y;
        doctor.moveTo({ x, y });
      }
    }

    // 如果没有受伤的，就跟随最近的
    if (!myDamagedCreeps || !myDamagedCreeps.length) {
      const target = doctor.findClosestByRange(battleUnits);
      if (target) {
        doctor.moveTo(target);
      }
    } else {
      const target = doctor.findClosestByRange(myDamagedCreeps);
      if (target) {
        if (doctor.heal(target) === ERR_NOT_IN_RANGE) {
          doctor.moveTo(target);
        }
      }
    }
  }

  console.log(
    `warriors num: ${warriores.length},   doctors:${doctors.length},   archeres: ${archeres.length},   workers: ${carryers.length}. ||| base energy: ${mySpawn.store[RESOURCE_ENERGY]}, base heal: ${mySpawn.hits}`
  );
  // outputHits(warriores, "warrior");
  // outputHits(doctors, "doctor");
  // outputHits(archeres, "archer");
  // outputHits(carryers, "carryer");
}

function outputHits(creeps: Creep[], name: string) {
  for (const creep of creeps) {
    // const creep = creeps[i];
    const { hits } = creep;
    const { hitsMax } = creep;
    const hitsPercent = hits / hitsMax;
    const splitNum = Math.floor(hitsPercent * 10);
    const splitArray = new Array(10).fill("x");
    for (let j = 0; j < splitNum; j++) {
      splitArray[j] = "-";
    }

    console.log(` ${splitArray.join("")} ${name} ${creep.id} health`);
  }
}
