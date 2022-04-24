import { createConstructionSite, findClosestByPath, getObjectsByPrototype, getTicks } from "game/utils";
import { ConstructionSite, Creep, Source, StructureContainer, StructureSpawn, StructureTower } from "game/prototypes";
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

import { mineClosestSource } from "./miner/miner";
import { spawnList } from "./checkCost";

// 本版本ok
// 坑1 Spawn初始化store为500，然后tick1变为300
// 坑2 spawnCreep需要花费时间，所以不能按照不存在为判断条件来反复执行，只能以存在的else

let canBuildFlag = true;
const AllowBuildTower = false; // t开启建塔 f关闭建塔

let startAttack = false;
let startAtkDelay = -1;

const thiefCarryerId = -1;

export function loop() {
  const crs = getObjectsByPrototype(Creep);
  // Your code goes here
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my) as StructureSpawn;
  // const source = getObjectsByPrototype(Source).find(s => s.energy > 0)
  const sources = getObjectsByPrototype(StructureContainer).filter(s => s.store[RESOURCE_ENERGY] > 0);

  const enermys = getObjectsByPrototype(Creep).filter(c => !c.my);
  const enermySpawn = getObjectsByPrototype(StructureSpawn).find(c => !c.my) as StructureSpawn;
  const carryers = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "carry"));
  const builders = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "work"));
  const myUnits = getObjectsByPrototype(Creep).filter(c => c.my);
  const warriores = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "attack"));
  const archeres = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "ranged_attack"));
  const doctors = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "heal"));

  const towers = getObjectsByPrototype(StructureTower).filter(i => i.my);

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

  spawnList(mySpawn);

  // spawnCreep Flow
  // if (carryers.length < 4) {
  //     mySpawn.spawnCreep([MOVE, CARRY]).object
  //     if (carryers.length == 3) {
  //         // thiefCarryerId = carryers[2].id;
  //     }
  // } else {
  //     // if(warriores.length<4){
  //     //     mySpawn.spawnCreep([TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK, ATTACK,ATTACK, ATTACK,MOVE,MOVE,MOVE, ATTACK])
  //     // }else if (doctors.length<2){
  //     //     mySpawn.spawnCreep([TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL])
  //     // }else if (archeres.length<4){
  //     //     mySpawn.spawnCreep([TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE, RANGED_ATTACK])
  //     // }else if (warriores.length<10){
  //     //     mySpawn.spawnCreep([TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK, ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE, ATTACK])
  //     // }else{
  //     //     mySpawn.spawnCreep([TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK, ATTACK,MOVE,MOVE,MOVE,MOVE,ATTACK])
  //     // }
  //     let unit = [MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, RANGED_ATTACK]
  //     if (archeres.length < 8) {
  //         unit = [MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, RANGED_ATTACK]
  //     } else if (doctors.length < 2) {
  //         unit = [MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, MOVE, MOVE, HEAL]
  //     }
  //     else if (archeres.length < 14) {
  //         unit = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK]
  //     } else if (doctors.length < 4) {
  //         unit = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, MOVE, HEAL]
  //     } else {
  //         unit = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK]
  //     }

  //     mySpawn.spawnCreep(unit)
  // }

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
            mineClosestSource(miner, sources, mySpawn);
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

      // 如果为特定id的carrayer，进行分矿采集。
      if (miner.id === thiefCarryerId) {
        const allSources = getObjectsByPrototype(StructureContainer);
        const otherSources = allSources.sort((a, b) => {
          return mySpawn.getRangeTo(a) - mySpawn.getRangeTo(b);
        });
        if (otherSources.length > 6) {
          // 野外资源已存在
          const wildSources = otherSources
            .slice(0, -3)
            .slice(3)
            .filter(s => s.store[RESOURCE_ENERGY] > 0);
          if (wildSources && wildSources.length) {
            const source = wildSources[0];
            console.log(`准备采野外资源`, source);
            mineWildSource(miner, source);
          }
        }

        // continue;
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

      mineClosestSource(miner, sources, mySpawn);
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
      if (warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
        warrior.moveTo(enermySpawn);
      }

      continue;
    }

    if (enermys && enermys.length) {
      const enemy = warrior.findClosestByRange(enermys);
      if (enemy) {
        // 如果离塔 足够近，则打塔
        const path = warrior.findPathTo(enemy);
        const spawnPath = warrior.findPathTo(enermySpawn);
        if (spawnPath.length < path.length) {
          if (warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
            warrior.moveTo(enermySpawn);
          }

          continue;
        }

        if (warrior.attack(enemy) === ERR_NOT_IN_RANGE) {
          warrior.moveTo(enemy);
        }
      }
    } else {
      if (warrior.attack(enermySpawn) === ERR_NOT_IN_RANGE) {
        warrior.moveTo(enermySpawn);
      }
    }
  }

  // 远程弓箭手行为
  for (let i = 0; i < archeres.length; i++) {
    const archer = archeres[i];

    // 建塔前不出击
    if (!startAttack) {
      const enemy = archer.findClosestByRange(enermys);
      if (!enemy) {
        continue;
      }

      const range = archer.getRangeTo(enemy);
      if (range <= 20) {
        // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)
        remoteAttackAndRun(archer, enemy, enermys);
      } else {
        // 分两批集结
        if (i % 2 === 0) {
          archer.moveTo({ x: mySpawn.x - 4, y: mySpawn.y - 4 });
        } else {
          archer.moveTo({ x: mySpawn.x + 4, y: mySpawn.y + 4 });
        }
      }
    } else {
      if (enermys && enermys.length) {
        let enermy = archer.findClosestByRange(enermys) as Creep;
        // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)

        let range = archer.getRangeTo(enermy);

        // 如果有偷塔行为，则防御偷塔
        const thiefEnermy = mySpawn.findClosestByRange(enermys);
        if (thiefEnermy) {
          const thiefRange = archer.getRangeTo(thiefEnermy);
          if (thiefRange < range && thiefRange <= 20) {
            enermy = thiefEnermy;
            range = thiefRange;
          }
        }

        // 如果离塔 足够近，则打塔
        const spawnRange = archer.getRangeTo(enermySpawn);
        if (spawnRange + 5 < range && spawnRange <= 20) {
          if (archer.rangedAttack(enermySpawn) === ERR_NOT_IN_RANGE) {
            archer.moveTo(enermySpawn);
          }

          continue;
        }

        remoteAttackAndRun(archer, enermy, enermys);
      } else {
        if (archer.rangedAttack(enermySpawn) === ERR_NOT_IN_RANGE) {
          archer.moveTo(enermySpawn);
        }
      }
    }
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
  outputHits(warriores, "warrior");
  outputHits(doctors, "doctor");
  outputHits(archeres, "archer");
  outputHits(carryers, "carryer");
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

// 1.暴兵流 A4M4 H3M3
// 2.风筝流 R3M4 H2M4
// 3.别人的铁三角 M5A1T2*1 M5R4*2 M5H3*2

//  改阵型，防御后攻。或者铁三角坦克治疗暴远程

// 需要两个改进。造塔第一步总失败，貌似是地点被占用问题
// 第二 弓兵需要hit and run

// 需要新改进。提升弓箭质量，考虑第二梯队用铁三角，去除塔防；战斗中优先攻击治疗；
// 放弃坦克，第二梯队用远程加医疗，游走消耗，同时去掉塔防.
// 下一个优化，如果太多弓箭瞄准同一目标，则切换为其他目标

// 集火治疗没生效。需要安排一个偷塔策略：
// 对第n个弓箭手，记录下他的id编号，单独开发偷塔策略
// 检查战局僵持，如果僵持，则偷塔
// 检查敌人所在平均半区，是否在某个半区没有敌人的战斗单位
// 指定空半区做为中间路点，走过去暂停
// 检查敌人基地位置附近战斗单位数量，如果为1及以下，则直接到达基地进行偷塔
// 路上监测是否被攻击掉血，如掉血则放弃偷塔

// 战斗优化，掉血过半周围有自己人，则后撤几步再上
// 小心被单兵引走攻击

// 遇到了世界第一，记录策略。2个carryer。然后一个M5W1C1 carryer去一个Container 提取能量扔地上作为resource 然后建Extention。攻击者M15A3*2去守另一个Container。再加一个M102H医疗。

// 需要偷塔监测
// 当前问题 234行风筝容易超时。215、218、219、227行寻路容易超时。改为range遍历，提高性能
// 治疗优先级

// 对方近战原地暴兵，阵型可能会没法展开

// 策略分类：地堡流，偷塔流，骚扰流，远程型，重坦近战流，快速流

// 首先测试快速提矿进行extention建造，对经济的影响

function mineWildSource(miner: Creep, source: StructureContainer) {
  // 建一个extention 一边挖一边收集 这里需要有worker。前面代码需求带
}

// 远程攻击边打边后撤
function remoteAttackAndRun(archer: Creep, enermy: Creep, enermys: Creep[]) {
  // 找到敌方最近的医疗兵集火
  const enermyHealers = enermys.filter(c => c.body.some(b => b.type === "heal"));
  const healer = archer.findClosestByRange(enermyHealers);
  if (healer) {
    // console.log(healer)
    const range = archer.getRangeTo(healer);

    if (range <= 3) {
      enermy = healer;
      console.log(`archer id ${archer.id} to enermy healer range: ${range}`);
    }
  }

  // 找到血量最低的敌人单位
  const enermySortLow = enermys
    .filter(c => c.hits < c.hitsMax)
    .sort((a, b) => {
      return a.hits - b.hits;
    });
  if (enermySortLow && enermySortLow.length > 0) {
    const enermyLow = enermySortLow[0];
    const range = archer.getRangeTo(enermyLow);

    // const rangeToEnermy = archer.getRangeTo(enermy)
    if (range <= 4) {
      if (enermyLow.hits / enermyLow.hitsMax < 0.3 || !healer) {
        enermy = enermyLow;
        console.log(`archer id ${archer.id} to enermy lowest range: ${range}`);
      }
      // console.log(`攻击敌方最低生命单位：`, enermyLow)
    }
  }

  const info = archer.rangedAttack(enermy);
  if (info === OK) {
    const closestEnermy = archer.findClosestByRange(enermys);
    if (closestEnermy && closestEnermy.body.some(b => b.type === "attack")) {
      // 最近有近战组件，风筝
      // 监测到掉血才后退 不浪费战力
      const range = archer.getRangeTo(closestEnermy);
      if (archer.hits < archer.hitsMax * 0.8 && range <= 3) {
        const x = archer.x + archer.x - enermy.x;
        const y = archer.y + archer.y - enermy.y;
        archer.moveTo({ x, y });
      }
    } else if (closestEnermy && closestEnermy.body.some(b => b.type === "ranged_attack")) {
      // 最近有远程组件，风筝 低血量就撤
      if (archer.hits < archer.hitsMax * 0.5) {
        const x = archer.x + archer.x - enermy.x;
        const y = archer.y + archer.y - enermy.y;
        archer.moveTo({ x, y });
      }
    }
  } else if (info === ERR_NOT_IN_RANGE) {
    archer.moveTo(enermy);
  }
}
