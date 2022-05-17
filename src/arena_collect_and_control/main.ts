import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  findClosestByRange,
  getRange,
  getDirection
} from "game/utils";
import {
  ConstructionSite,
  Creep,
  RoomPosition,
  Source,
  StructureContainer,
  StructureExtension,
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
  WORK,
  BuildableStructure
} from "game/constants";
import { ScoreCollector, RESOURCE_SCORE } from "arena";

import { withdrawClosestContainer } from "../arena_alpha_spawn_and_swamp/units/miner";
import { spawnList, ClassUnit, DEFUALT_UNITS, IQueueItem } from "../utils/spawnUnit";
import { remoteAttackAndRun } from "../utils/battle";
import {
  splitCreepsInRamparts,
  alertInRange,
  pullCreepTo,
  repeatArray,
  calculateCenterOfCreeps,
  splitCreepByPosition,
  hasBattleParts
} from "../utils/pureHelper";
import { singleAttack, singleHeal, donotStayOnMyUnfinishedSite } from "../utils/1single/attack";
import { prebuildConstructionSites } from "../utils/1single/worker";
import { addAttackRangeToCreeps, addHitsLabelToCreeps, showHealthBar } from "utils/ui";

const unitList: ClassUnit[] = [
  new ClassUnit(DEFUALT_UNITS.smallCarryer, "puller"),
  new ClassUnit(DEFUALT_UNITS.carryCreep, "carryCreep1"),
  new ClassUnit(DEFUALT_UNITS.carryCreep, "carryCreep2"),
  new ClassUnit(DEFUALT_UNITS.smallCarryer, "scoreCarryer", "a", false, true),
  new ClassUnit(DEFUALT_UNITS.workerForRampart, "workerForRampart", "a", false, true),
  // new ClassUnit(DEFUALT_UNITS.tinyFootMan, " ", "", false, true),
  // new ClassUnit(DEFUALT_UNITS.smallFootMan, "denfenerOfRampartBuilder", "a", false, true),
  new ClassUnit(DEFUALT_UNITS.powerArcher, "powerArcher", "raG1", false, true),

  // new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfRampartBuilder", "", false, true),
  // new ClassUnit(DEFUALT_UNITS.workCreepMoveSpeed, "mysideSecendSourceWorker", "", false, true), // 分矿农民
  // new ClassUnit(DEFUALT_UNITS.tinyFootMan, "denfenerOfMysideSource", "a", false, true),
  // new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfSource"),
  // new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfSource"),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  // new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),
  // new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),
  // new ClassUnit(DEFUALT_UNITS.footMan, "denfenerOfBase", "raG1"),

  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),

  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),

  new ClassUnit(DEFUALT_UNITS.smallHealer, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer", "a", false, true),
  // new ClassUnit(DEFUALT_UNITS.workCreepMove, "workCreepMove"),// 准备开分矿
  // new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer", "", false, false),
  // 手动repeat
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer", "", false),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1"),
  new ClassUnit(DEFUALT_UNITS.fastCarryer, "scoreCarryer", "", false),
  new ClassUnit(DEFUALT_UNITS.smallArcher, "denfenerOfBase", "raG1", true)
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

  const enemys = getObjectsByPrototype(Creep).filter(c => c.my === false);
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my === false) as StructureSpawn;
  const enemyRamparts = getObjectsByPrototype(StructureRampart).filter(c => c.my === false);
  const { creepsInRamparts: enemysInRam, creepsNotInRamparts: enemysNotInRam } = splitCreepsInRamparts(
    enemys,
    enemyRamparts
  );

  // console.log(`enemysInRam:`, enemysInRam, `enemysNotInRam:`, enemysNotInRam);

  const myCreeps = getObjectsByPrototype(Creep).filter(c => c.my);

  const workers = unitList.filter(e => e.name === "carryCreep" || e.name === "puller");
  const mySource = findClosestByRange(mySpawn, getObjectsByPrototype(Source));
  const spawnLeft = { x: mySpawn.x - 1, y: mySpawn.y };
  const sourceRight = { x: mySource.x + 1, y: mySource.y };
  const sourceOuter = { x: mySource.x + 1, y: mySource.y < 50 ? mySource.y - 1 : mySource.y + 1 };

  const puller = unitList.find(e => e.name === "puller");
  const carryCreep1 = unitList.find(e => e.name === "carryCreep1");
  const carryCreep2 = unitList.find(e => e.name === "carryCreep2");
  const tinyFootMan = unitList.find(e => e.name === "tinyFootMan");

  // 将单位按位置分组并打印
  console.log("Enemy Battle Units:");
  interface IGourpCreep {
    groups: Creep[][];
    centers: RoomPosition[];
  }
  const enemyBattleGroups = splitCreepByPosition(enemys.filter(hasBattleParts));
  console.log("My Battle Units:");
  const myBattleGroups = splitCreepByPosition(myCreeps.filter(hasBattleParts));
  calculateBattleRange(myBattleGroups, enemyBattleGroups);

  function calculateBattleRange(creepGroups: IGourpCreep, enemyGroups: IGourpCreep, limitRange = 15) {
    const battlePair = [];
    for (let i = 0; i < creepGroups.groups.length; i++) {
      const group = creepGroups.groups[i];
      const center = creepGroups.centers[i];
      for (let j = 0; j < enemyGroups.groups.length; j++) {
        const enemyGroup = enemyGroups.groups[j];
        const enemyCenter = enemyGroups.centers[j];
        const range = getRange(center, enemyCenter);
        if (range <= limitRange) {
          console.log(`接战警报 DANGEROUS range: ${range} for myGroup ${i} and enemyGroup ${j}`);
          battlePair.push({
            myGroup: group,
            enemyGroup,
            range
          });
        }
      }
    }

    return battlePair;
  }

  // 造兵逻辑
  spawnList(mySpawn, unitList);
  // 给所有可能的战斗单位添加单人攻击和奶的逻辑件
  for (const myUnit of unitList) {
    singleAttack(myUnit, enemys);
    singleHeal(myUnit, unitList);
  }

  myCreeps.forEach(donotStayOnMyUnfinishedSite);

  // 添加战斗用UI
  addAttackRangeToCreeps(unitList);
  addHitsLabelToCreeps(unitList);
  enemys.forEach(showHealthBar);

  // 测试collector盖ram
  const workerForRampart = unitList.find(e => e.name === "workerForRampart");
  if (workerForRampart) {
    if (workerForRampart.object) {
      const worker = workerForRampart.object;
      workerForRampart.initQueueAndRun([
        {
          flag: "callback",
          comment: "harvest",

          stopFunction: () => {
            worker.moveTo(mySource);
            worker.harvest(mySource);
            if (worker.store.energy === 200) {
              return true;
            }

            return false;
          }
        },
        { flag: "moveToPosByRange", aim: collector, range: 1 },
        {
          flag: "callback",
          comment: "buildSite",
          stopFunction: () => {
            prebuildConstructionSites(workerForRampart, StructureRampart, 1);
            return true;
          }
        },
        {
          flag: "callback",
          comment: "buildSite",
          stopFunction: () => {
            const site = getObjectsByPrototype(ConstructionSite).find(i => i.my && worker.getRangeTo(i) <= 1);
            if (site) {
              worker.build(site);
              return false;
            } else {
              workerForRampart.name = "mysideSecendSourceWorker";
              return true;
            }
          }
        }
      ]);
    }
  }

  const powerArcher = unitList.find(e => e.name === "powerArcher");
  if (powerArcher) {
    powerArcher.initQueueAndRun([
      { flag: "moveToPosByRange", aim: collector, range: 1 },
      {
        flag: "callback",
        comment: "defense collecter",
        jobFunction: () => {
          const archer = powerArcher.object;
          if (!archer) {
            return;
          }

          const allEnemysInRange20 = getObjectsByPrototype(Creep).filter(
            c => c.my === false && getRange(c, collector) <= 20
          );

          // 如果20范围内有农民没有战力，则出击，
          if (allEnemysInRange20.length > 0) {
            const enemy = allEnemysInRange20.find(c => c.body.some(i => i.type === ATTACK || i.type === RANGED_ATTACK));
            if (enemy) {
              archer.moveTo(collector);
            } else {
              const enemyWorker = allEnemysInRange20.find(
                c => !c.body.some(i => i.type === ATTACK || i.type === RANGED_ATTACK)
              );
              if (enemyWorker) {
                archer.moveTo(enemyWorker);
                archer.rangedAttack(enemyWorker);
              }
            }
          } else {
            archer.moveTo(collector);
          }
          // 如果15范围内有战斗敌方，则回地堡
        }
      }
    ]);
  }

  // 火车挖矿逻辑
  if (puller) {
    puller.initQueueAndRun([
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
        }
      }
    ]);
  }

  if (carryCreep1) {
    if (carryCreep1.object) {
      const worker = carryCreep1.object;
      carryCreep1.initQueueAndRun([
        {
          flag: "callback",
          comment: "harvest",
          jobFunction: () => {
            worker.harvest(mySource);
            if (puller && puller.object) {
              worker.transfer(puller.object, RESOURCE_ENERGY);
            }
          }
        }
      ]);
    }
  }

  if (carryCreep2) {
    if (carryCreep2.object) {
      const worker = carryCreep2.object;
      carryCreep2.initQueueAndRun([
        {
          flag: "callback",
          comment: "harvest",
          jobFunction: () => {
            worker.harvest(mySource);
            if (puller && puller.object) {
              worker.transfer(puller.object, RESOURCE_ENERGY);
            }
          }
        }
      ]);
    }
  }

  // 骚扰单位逻辑
  if (tinyFootMan) {
    const tinyFootManObj = tinyFootMan.object;
    tinyFootMan.initQueueAndRun([
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
                const enemyss = getObjectsByPrototype(Creep).filter(c => c.my === false);
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
              const enemyss = getObjectsByPrototype(Creep).filter(c => c.my === false);
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
    ]);
  }

  // 守矿小队
  const denfeneresOfSource = unitList.filter(e => e.name === "denfenerOfSource");
  for (const denfenerOfSource of denfeneresOfSource) {
    denfenerOfSource.initQueueAndRun([
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
    ]);
  }

  // 守家大队
  const denfeneresOfBase = unitList.filter(e => e.name === "denfenerOfBase");
  for (const denfenerOfBase of denfeneresOfBase) {
    denfenerOfBase.initQueueAndRun([
      {
        flag: "denfenseAimWithRange",
        aim: mySpawn,
        range: 15,
        stayInRampart: true,
        stopFunction: () => {
          const unitCount = denfeneresOfBase.filter(e => checkSpawned(e));
          if (mySpawn) {
            console.log("防守等待进攻信号,满7进攻。", unitCount.length, `防守目标${mySpawn.x},${mySpawn.y}`);
          }

          if (unitCount.length >= 7 || getTicks() > 500) {
            console.log("造兵完成或满足500tick,退出防御状态,进入下一步", unitCount.length);
            return true;
          } else {
            return false;
          }
        }
      },
      {
        flag: "denfenseAimWithRange",
        aim: collector,
        range: 25,
        stayInRampart: true,
        stayTime: 50,
        stopFunction: () => {
          const unitCount = denfeneresOfBase.filter(e => checkSpawned(e));
          if (mySpawn) {
            console.log("防守等待进攻信号,满7进攻。", unitCount.length, `防守目标${mySpawn.x},${mySpawn.y}`);
          }

          if (unitCount.length >= 7 || getTicks() > 500) {
            console.log("造兵完成或满足500tick,退出防御状态,进入下一步", unitCount.length);
            return true;
          } else {
            return false;
          }
        }
      },

      {
        flag: "denfenseAimWithRange",
        aim: collector,
        range: 50,
        stayInRampart: true,
        stopFunction: () => {
          const enemyBattleValue = enemyBattleGroups.battleValues.reduce((a, b) => a + b, 0);
          const myBatttleValue = myBattleGroups.battleValues.reduce((a, b) => a + b, 0);
          if (myBatttleValue > enemyBattleValue * 2 || myBatttleValue - enemyBattleValue >= 500) {
            console.log("我方攻击力大于敌方,退出防御状态,进入下一步");
            return true;
          }

          return false;
        }
      },
      {
        flag: "denfenseAimWithRange",
        aim: collector,
        range: 100,
        stayInRampart: true
      }
    ]);
  }

  // 守我方分矿单位逻辑
  const denfenerOfMysideSource = unitList.find(e => e.name === "denfenerOfMysideSource");

  if (denfenerOfMysideSource) {
    const mySecendSource = { x: 99 - mySource.x, y: mySource.y };

    denfenerOfMysideSource.initQueueAndRun([
      {
        flag: "moveToPosByRange",
        aim: mySecendSource,
        range: 4
      },
      {
        flag: "denfenseAimWithRange",
        aim: mySecendSource,
        range: 15,
        stayInRampart: true
      }
    ]);
  }

  // 骚扰分矿单位逻辑
  const denfenerOfEnemysideSource = unitList.find(e => e.name === "denfenerOfEnemysideSource");
  if (denfenerOfEnemysideSource) {
    const enemySecendSource = { x: 99 - mySource.x, y: enemySpawn.y };
    denfenerOfEnemysideSource.initQueueAndRun([
      {
        flag: "moveToPosByRange",
        aim: enemySecendSource,
        range: 3
      },
      {
        flag: "denfenseAimWithRange",
        aim: enemySecendSource,
        range: 5,
        stayInRampart: true
      }
    ]);
  }

  // 保卫建塔单位逻辑
  const denfenerOfRampartBuilder = unitList.find(e => e.name === "denfenerOfRampartBuilder");
  if (denfenerOfRampartBuilder) {
    if (denfenerOfRampartBuilder.object && workerForRampart && workerForRampart.object && workerForRampart.alive) {
      const aim = workerForRampart.object;
      const range = 10;
      const me = denfenerOfRampartBuilder.object;
      const nearEnemys = getObjectsByPrototype(Creep)
        .filter(c => c.my === false)
        .filter(c => getRange(c, aim) < range);
      if (nearEnemys.length) {
        me.moveTo(nearEnemys[0]);
        if (me.body && me.body.some(b => b.type === "ranged_attack")) {
          remoteAttackAndRun(me, enemys[0], enemys);
        }
      } else {
        // 集结到aim会堵塞，放在2格外
        if (getRange(me, aim) > 2) {
          me.moveTo(aim);
        }
      }
    } else if (denfenerOfRampartBuilder.object && enemysNotInRam.length) {
      denfenerOfRampartBuilder.object.moveTo(enemysNotInRam[0]);
    }
  }

  const carryers = unitList.filter(u => u.name === "scoreCarryer");
  console.log("scoreCarryer num: ", carryers.filter(c => c.object && c.alive).length);
  for (const carryerUnit of carryers) {
    if (carryerUnit && carryerUnit.object && carryerUnit.alive) {
      const creep = carryerUnit.object;
      const nearbyEnemy = enemys.find(
        c => c.body.some(d => d.type === ATTACK || d.type === RANGED_ATTACK) && getRange(c, creep) < 7
      );
      if (nearbyEnemy) {
        creep.moveTo(nearbyEnemy, { flee: true });
        continue;
      }

      if (creep.store[RESOURCE_SCORE] > 0) {
        const trans = creep.transfer(collector, RESOURCE_SCORE);
        if (trans === ERR_NOT_IN_RANGE) {
          creep.moveTo(collector);
        }
      } else {
        const containers = getObjectsByPrototype(StructureContainer).filter(c => c.store[RESOURCE_SCORE] > 0);
        if (containers.length > 0) {
          const container = creep.findClosestByRange(containers);
          if (container && creep.withdraw(container, RESOURCE_SCORE) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container);
          }
        }
      }
    }
  }

  // console.log(unitList[6]);

  const mysideSecendSourceWorker = unitList.find(u => u.name === "mysideSecendSourceWorker");
  if (mysideSecendSourceWorker) {
    const mySecendSource = { x: 99 - mySource.x, y: mySource.y };
    mysideSecendSourceWorker.initQueueAndRun([
      {
        flag: "moveToPosByRange",
        aim: mySecendSource,
        range: 2
      },
      {
        flag: "callback",
        comment: "buildSite",
        stopFunction: () => {
          prebuildConstructionSites(mysideSecendSourceWorker, StructureRampart, 1);
          prebuildConstructionSites(mysideSecendSourceWorker, StructureExtension, 4);
          return true;
        }
      },
      {
        flag: "callback",
        comment: "harvestAndBuild",
        stopFunction: () => {
          const worker = mysideSecendSourceWorker;
          const workerObj = worker.object;
          if (workerObj) {
            const sites = getObjectsByPrototype(ConstructionSite).filter(i => i.my && workerObj.getRangeTo(i) <= 1);
            const site = sortSites(sites, mySecendSource.x, mySecendSource.y);

            const source = sources.find(i => getRange(i, workerObj) <= 1);
            if (source) {
              if (workerObj.store.getCapacity()) {
                const worksNumber = workerObj.body.filter(i => i.type === WORK).length;
                if (site) {
                  // 加快建设进度
                  if (workerObj.store[RESOURCE_ENERGY] < worksNumber * 5) {
                    workerObj.harvest(source);
                  } else {
                    workerObj.build(site);
                  }
                } else {
                  // 最大节约回合
                  if (workerObj.store[RESOURCE_ENERGY] < (workerObj.store.getCapacity() as number) - worksNumber * 2) {
                    workerObj.harvest(source);
                  } else {
                    // 如果有空的扩展，就放资源进去
                    const extension = getObjectsByPrototype(StructureExtension).find(i => {
                      return i.store[RESOURCE_ENERGY] < 100 && workerObj.getRangeTo(i) === 1;
                    });
                    if (extension) {
                      workerObj.transfer(extension, RESOURCE_ENERGY);
                    }
                  }
                }
              }
            }
          }

          return false;
        }
      }
    ]);
  }
}

function sortSites<T extends BuildableStructure>(sites: ConstructionSite<T>[], x: number, y: number) {
  const first = sites.find(i => i.x === x && i.y === y && i.structure instanceof StructureRampart);
  const allCreeps = getObjectsByPrototype(Creep).filter(i => getRange(i, { x, y }) <= 1);

  const second = sites.find(
    i => i.structure instanceof StructureRampart || allCreeps.every(c => !(c.x === i.x && c.y === i.y))
  );
  console.log("sort secend", second);
  if (first) {
    return first;
  } else {
    return second;
  }
}

function moveAway(creep: Creep, enemy: Creep) {
  const direction = getDirection(enemy.x - creep.x, enemy.y - creep.y);
  const move = creep.move(direction);
}
