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
  ERR_NOT_OWNER,
  ERR_INVALID_TARGET,
  HEAL,
  MOVE,
  OK,
  RANGED_ATTACK,
  RESOURCE_ENERGY,
  TOUGH,
  TOWER_RANGE,
  WORK
} from "game/constants";
import { ScoreCollector, RESOURCE_SCORE } from "arena";

import { withdrawClosestContainer } from "../arena_alpha_spawn_and_swamp/units/miner";
import { spawnList, ClassUnit, DEFUALT_UNITS, IQueueItem } from "../utils/spawnUnit";
import { remoteAttackAndRun } from "../utils/battle";
import { splitCreepsInRamparts, alertInRange, pullCreepTo, repeatArray } from "../utils/pureHelper";
import { singleAttack, singleHeal } from "../utils/1single/attack";

let attacker: Creep | undefined;

const unitList: ClassUnit[] = [
  new ClassUnit(DEFUALT_UNITS.smallCarryer, "puller"),
  new ClassUnit(DEFUALT_UNITS.carryCreep, "carryCreep1"),
  new ClassUnit(DEFUALT_UNITS.carryCreep, "carryCreep2"),
  new ClassUnit(DEFUALT_UNITS.tinyFootMan, "tinyFootMan"),
  new ClassUnit(DEFUALT_UNITS.smallCarryer, "scoreCarryer"),
  new ClassUnit(DEFUALT_UNITS.tinyArcher, "denfenerOfSource"),
  new ClassUnit(DEFUALT_UNITS.tinyArcher, "denfenerOfSource"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer"),
  // new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfSource"),
  // new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfSource"),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.smallHealer, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer"),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1", true),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "smallArcher")
];

/**
 * 单位出生检查
 * @param unit
 * @returns 出生返回true
 */
function checkSpawned(unit: ClassUnit) {
  return unit && unit.object && unit.alive && unit.spawned;
}

export function loop(): void {
  // const crs = getObjectsByPrototype(Creep);
  // Your code goes here
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my) as StructureSpawn;
  // const source = getObjectsByPrototype(Source).find(s => s.energy > 0)
  const sources = getObjectsByPrototype(Source).filter(s => s.energy > 0);

  const collector = getObjectsByPrototype(ScoreCollector)[0];

  const enemys = getObjectsByPrototype(Creep).filter(c => !c.my);
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(c => !c.my) as StructureSpawn;
  const enemyRamparts = getObjectsByPrototype(StructureRampart).filter(c => !c.my);

  const { creepsInRamparts: enemysInRam, creepsNotInRamparts: enemysNotInRam } = splitCreepsInRamparts(
    enemys,
    enemyRamparts
  );

  // console.log(`enemysInRam:`, enemysInRam, `enemysNotInRam:`, enemysNotInRam);

  const workers = unitList.filter(e => e.name === "carryCreep" || e.name === "puller");
  const mySource = findClosestByRange(mySpawn, getObjectsByPrototype(Source));
  const spawnLeft = { x: mySpawn.x - 1, y: mySpawn.y };
  const sourceRight = { x: mySource.x + 1, y: mySource.y };
  const sourceOuter = { x: mySource.x + 1, y: mySource.y < 50 ? mySource.y - 1 : mySource.y + 1 };

  const puller = unitList.find(e => e.name === "puller");
  const carryCreep1 = unitList.find(e => e.name === "carryCreep1");
  const carryCreep2 = unitList.find(e => e.name === "carryCreep2");
  const tinyFootMan = unitList.find(e => e.name === "tinyFootMan");

  // 造兵逻辑
  spawnList(mySpawn, unitList);
  // 给所有可能的战斗单位添加单人攻击和奶的逻辑件
  for (const myUnit of unitList) {
    singleAttack(myUnit, enemys);
    singleHeal(myUnit, unitList);
  }

  // 火车挖矿逻辑
  if (puller && checkSpawned(puller)) {
    puller.initQueues(
      [
        { flag: "moveToPosByRange", aim: spawnLeft, range: 1 },
        { flag: "staySomeTime", stayTime: 12 }, // 等待造carryCreep 12ticks
        {
          // 一旦造好就拉去矿点1
          comment: "to pos 1",
          flag: "callback",
          stopFunction: () => {
            console.log("check stop func", carryCreep1);
            if (puller && puller.object && carryCreep1 && carryCreep1.object && checkSpawned(carryCreep1)) {
              return pullCreepTo(puller.object, carryCreep1.object, sourceRight);
            } else {
              return false;
            }
          }
        },
        {
          // 等待第二个旷工造好
          flag: "callback",
          comment: "wait carryer2",
          jobFunction: () => {
            if (puller && puller.object) {
              puller.object.transfer(mySpawn, RESOURCE_ENERGY);
            }
          },
          stopFunction: () => {
            if (puller && puller.object && carryCreep2 && checkSpawned(carryCreep2)) {
              return true;
            } else {
              return false;
            }
          }
        },
        {
          // 拉走第二个
          flag: "callback",
          comment: "pull carryer2",
          stopFunction: () => {
            if (puller && puller.object && carryCreep2 && carryCreep2.object) {
              return pullCreepTo(puller.object, carryCreep2.object, sourceOuter);
            } else {
              return false;
            }
          }
        },
        {
          // 持续传资源
          flag: "callback",
          comment: "transfer",
          jobFunction: () => {
            if (puller && puller.object) {
              puller.object.transfer(mySpawn, RESOURCE_ENERGY);
            }
          },
          stopFunction: () => {
            if (mySource.energy <= 20) {
              return true;
            }

            return false;
          }
        },
        {
          // 开始拉人去分矿
          flag: "callback",
          comment: "pull carryer2",
          stopFunction: () => {
            if (puller && puller.object && carryCreep1 && carryCreep1.object && carryCreep2 && carryCreep2.object) {
              return (
                pullCreepTo(puller.object, carryCreep2.object, { x: 99 - sourceOuter.x, y: sourceOuter.y }) &&
                pullCreepTo(carryCreep2.object, carryCreep1.object, { x: 99 - sourceRight.x, y: sourceRight.y })
              );
            } else {
              return false;
            }
          }
        }
      ],
      `${puller.name}0`
    );
    puller.runQueue();
  }

  if (carryCreep1 && carryCreep1.object && checkSpawned(carryCreep1)) {
    const worker = carryCreep1.object;
    carryCreep1.initQueues(
      [
        {
          flag: "callback",
          comment: "harvest",
          jobFunction: () => {
            worker.harvest(mySource);
            if (puller && puller.object) {
              worker.transfer(puller.object, RESOURCE_ENERGY);
            }
          },
          stopFunction: () => {
            if (mySource.energy <= 20) {
              return true;
            }

            return false;
          }
        }
      ],
      `${carryCreep1.name}0`
    );
    carryCreep1.runQueue();
  }

  if (carryCreep2 && carryCreep2.object && checkSpawned(carryCreep2)) {
    const worker = carryCreep2.object;
    carryCreep2.initQueues(
      [
        {
          flag: "callback",
          comment: "harvest",
          jobFunction: () => {
            worker.harvest(mySource);
            if (puller && puller.object) {
              worker.transfer(puller.object, RESOURCE_ENERGY);
            }
          },
          stopFunction: () => {
            if (mySource.energy <= 20) {
              return true;
            }

            return false;
          }
        }
      ],
      `${carryCreep2.name}0`
    );
    carryCreep2.runQueue();
  }

  // 骚扰单位逻辑
  if (tinyFootMan && checkSpawned(tinyFootMan)) {
    const tinyFootManObj = tinyFootMan.object;
    tinyFootMan.initQueues(
      [
        {
          flag: "moveToPosByRange",
          aim: enemySpawn,
          range: 9
        },
        ...repeatArray(
          [
            {
              // 驻守杀农民，如果对方出兵则进入下一个队列
              flag: "callback",
              comment: "findAndKillCarryer",
              jobFunction: () => {
                if (tinyFootMan && tinyFootManObj) {
                  const enemyss = getObjectsByPrototype(Creep).filter(c => !c.my);
                  const { creepsNotInRamparts } = splitCreepsInRamparts(enemyss, enemyRamparts);
                  const enemyCarryersOutside = creepsNotInRamparts.filter(
                    e => e.body && e.body.some(b => b.type === "carry")
                  );
                  console.log("enemyCarryersOutside", enemyCarryersOutside.length);
                  if (enemyCarryersOutside.length > 0) {
                    const aim = findClosestByRange(tinyFootManObj, enemyCarryersOutside);
                    tinyFootManObj.moveTo(aim);
                    tinyFootManObj.attack(aim);
                  }
                }
              },
              stopFunction: () => {
                const enemyss = getObjectsByPrototype(Creep).filter(c => !c.my);
                const enemyAtks = enemyss.filter(
                  e => e.body && (e.body.some(b => b.type === "attack") || e.body.some(b => b.type === "ranged_attack"))
                );
                console.log("enemyAtks", enemyAtks.length);
                if (enemyAtks.length && tinyFootManObj) {
                  console.log("find some atk enemy");
                  if (alertInRange(tinyFootManObj, enemyAtks, 7)) {
                    console.log(`${tinyFootMan.name} enemy nearby. run away`);
                    return true;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }
            } as IQueueItem,
            {
              flag: "moveToPosByRange",
              aim: mySpawn,
              range: 4
            } as IQueueItem,
            {
              flag: "staySomeTime",
              stayTime: 30
            } as IQueueItem
          ],
          10
        )
      ],
      `${tinyFootMan.name}0`
    );
    tinyFootMan.runQueue();
  }

  // 守矿小队
  const denfeneresOfSource = unitList.filter(e => e.name === "denfenerOfSource");
  for (const denfenerOfSource of denfeneresOfSource) {
    if (denfenerOfSource && checkSpawned(denfenerOfSource)) {
      denfenerOfSource.initQueues(
        [
          {
            flag: "moveToPosByRange",
            aim: collector,
            range: 3
          },
          {
            flag: "denfenseAimWithRange",
            aim: collector,
            range: 15,
            stayInRampart: true
          }
        ],
        `${denfenerOfSource.name}0`
      );
      denfenerOfSource.runQueue();
    }
  }

  // 守家大队
  const denfeneresOfBase = unitList.filter(e => e.name === "denfenerOfBase");
  for (const denfenerOfBase of denfeneresOfBase) {
    if (denfenerOfBase && checkSpawned(denfenerOfBase)) {
      denfenerOfBase.initQueues(
        [
          {
            flag: "denfenseAimWithRange",
            aim: mySpawn,
            range: 15,
            stayInRampart: true,
            stopFunction: () => {
              const unitCount = denfeneresOfBase.filter(e => checkSpawned(e));
              if (mySpawn) {
                console.log("防守等待进攻信号，满6进攻", unitCount.length, `防守目标${mySpawn.x},${mySpawn.y}`);
              }

              if (unitCount.length >= 7) {
                console.log("造兵完成，退出防御状态，进入下一步", unitCount.length);
                return true;
              } else {
                return false;
              }
            }
          },
          {
            flag: "denfenseAimWithRange",
            aim: mySpawn,
            range: 25,
            stayInRampart: true,
            stayTime: 50
          },
          {
            flag: "moveToPosByRange",
            aim: collector,
            range: 5
          },
          {
            flag: "denfenseAimWithRange",
            aim: collector,
            range: 20,
            stayInRampart: true
          }
        ],
        `${denfenerOfBase.name}0`
      );
      denfenerOfBase.runQueue();
    }
  }

  // doPullAndWork(workers, findClosestByRange(mySpawn, sources), mySpawn);
  // const workers = unitList.filter(u => u.name === "energyCarryer");
  // for (const workerUnit of workers) {
  //   if (workerUnit && workerUnit.object && workerUnit.alive) {
  //     const worker = workerUnit.object;
  //     const source = worker.findClosestByRange(sources);
  //     if (source) {
  //       if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
  //         if (worker.harvest(source) === ERR_NOT_IN_RANGE) {
  //           worker.moveTo(source);
  //         }
  //       } else {
  //         if (worker.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
  //           worker.moveTo(mySpawn);
  //         }
  //       }
  //     }
  //   }
  // }

  const carryers = unitList.filter(u => u.name === "scoreCarryer");
  for (const carryerUnit of carryers) {
    if (carryerUnit && carryerUnit.object && carryerUnit.alive) {
      const creep = carryerUnit.object;
      if (creep.store[RESOURCE_SCORE] > 0) {
        const trans = creep.transfer(collector, RESOURCE_SCORE);
        if (trans === ERR_NOT_IN_RANGE) {
          creep.moveTo(collector);
        }
      } else {
        const containers = getObjectsByPrototype(StructureContainer);
        if (containers.length > 0) {
          const container = creep.findClosestByRange(containers);
          if (container && creep.withdraw(container, RESOURCE_SCORE) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container);
          }
        }
      }
    }
  }

  // const archeres = unitList.filter(u => u.name === "smallArcher");

  // // 远程弓箭手行为
  // for (const archerUnit of archeres) {
  //   if (archerUnit && archerUnit.object && archerUnit.alive) {
  //     const archer = archerUnit.object;

  //     if (enemys && enemys.length) {
  //       const enemy = archer.findClosestByRange(enemys);
  //       if (enemy) {
  //         const range = archer.getRangeTo(enemy);

  //         remoteAttackAndRun(archer, enemy, enemys);
  //       }
  //       // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)
  //     } else {
  //       archer.moveTo(collector);
  //     }
  //   }
  // }
}
