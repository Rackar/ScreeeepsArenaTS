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

import { spawnList, ClassUnit } from "./spawnUnit";

function checkAim(riderUnit: ClassUnit) {
  const rider = riderUnit.object;
  if (!rider) {
    return;
  }

  if (riderUnit.aim?.status) {
    console.log(`rider aim: ${riderUnit.aim.status}`);
  } else {
    console.log("rider no aim");
  }

  // 检查对方基地附近是否有驻兵

  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my);

  if (enemySpawn) {
    const mayWin = checkDenfenseOfEnemySpawn(enemySpawn);
    if (mayWin) {
      riderUnit.aim = { status: "rushBase" };
      rushToBase(riderUnit);
      return;
    }
  }

  // 单挑近距离敌人
  const enemy = findCanSoloNearlyEnemy(riderUnit);
  if (enemy) {
    riderUnit.aim = { status: "soloEnemy" };
    riderUnit.object?.moveTo(enemy);
    riderUnit.object?.attack(enemy);
    return;
  }

  if (!stealAttackCarryer(riderUnit)) {
    findAndAttackExtension(riderUnit);
  }

  // const enemy = soloEnemy(riderUnit);
  // if (enemy) {
  //   riderUnit.aim = { status: "soloEnemy" };
  //   riderUnit.object?.moveTo(enemy);
  //   riderUnit.object?.attack(enemy);
  //   return;
  // }
}

function checkDenfenseOfEnemySpawn(enemySpawn: StructureSpawn) {
  const enemys = getObjectsByPrototype(Creep).filter(i => !i.my);
  const enemyFighters = enemys.filter(i => i.body.some(j => j.type === ATTACK || j.type === RANGED_ATTACK));
  let denfenseFighters = [];
  if (enemySpawn.x < 10) {
    // left
    denfenseFighters = enemyFighters.filter(i => i.x <= 18);
  } else {
    // right
    denfenseFighters = enemyFighters.filter(i => i.x >= 82);
  }

  // 计算战力和数量

  const count = denfenseFighters.length;
  let attackNumber = 0;
  let rangedAttackNumber = 0;
  for (const fighter of denfenseFighters) {
    for (const body of fighter.body) {
      if (body.type === ATTACK) {
        attackNumber++;
      } else if (body.type === RANGED_ATTACK) {
        rangedAttackNumber++;
      }
    }
  }

  const mayWin = count <= 1 || attackNumber + rangedAttackNumber <= 5;
  return mayWin;
}

function rushToBase(riderUnit: ClassUnit) {
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my) as StructureSpawn;
  const rider = riderUnit.object;
  rider?.moveTo(enemySpawn);
  rider?.attack(enemySpawn);
}

function stealAttackCarryer(riderUnit: ClassUnit): boolean {
  if (!riderUnit.object) {
    return false;
  }

  const rider = riderUnit.object;
  const enemys = getObjectsByPrototype(Creep).filter(i => !i.my);
  const enemyCarryer = enemys
    .filter(i => i.body.some(j => j.type === CARRY || j.type === WORK) || (i.x >= 20 && i.x <= 80))
    .sort((a, b) => rider.getRangeTo(a) - rider.getRangeTo(b));
  if (enemyCarryer.length > 0) {
    const carryer = enemyCarryer[0];
    riderUnit.aim = { status: "stealAttackCarryer" };
    riderUnit.object?.moveTo(carryer);
    riderUnit.object?.attack(carryer);
    return true;
  }

  return false;
}

function findAndAttackExtension(riderUnit: ClassUnit) {
  if (!riderUnit.object) {
    return false;
  }

  const rider = riderUnit.object;
  const enemys = getObjectsByPrototype(StructureExtension).filter(i => !i.my && i.exists);
  const enemyCarryer = enemys
    .filter(i => i.x >= 20 && i.x <= 80)
    .sort((a, b) => rider.getRangeTo(a) - rider.getRangeTo(b));
  if (enemyCarryer.length > 0) {
    const carryer = enemyCarryer[0];
    riderUnit.aim = { status: "findAndAttackExtension" };
    riderUnit.object?.moveTo(carryer);
    riderUnit.object?.attack(carryer);
    return true;
  }

  return false;
}

function findCanSoloNearlyEnemy(riderUnit: ClassUnit) {
  if (!riderUnit.object) {
    return;
  }

  const rider = riderUnit.object;
  const enemys = getObjectsByPrototype(Creep).filter(i => !i.my);
  const enemyFighters = enemys
    .filter(i => i.body.some(j => j.type === ATTACK || j.type === RANGED_ATTACK))
    .filter(i => {
      return rider.getRangeTo(i) <= 10;
    });

  if (enemyFighters.length === 1) {
    const enemy = enemyFighters[0];
    return enemy;
  } else {
    return null;
  }
}

function walkAndSteal(riderUnit: ClassUnit) {
  const rider = riderUnit.object;
  if (!rider) {
    return;
  }

  if (riderUnit.aim) {
    switch (riderUnit.aim.status) {
      case "rushBase":
        rushToBase(riderUnit);
        break;
      case "stealAttackCarryer":
        stealAttackCarryer(riderUnit);
        break;

      case "soloEnemy":
        findCanSoloNearlyEnemy(riderUnit);
        break;

      case "quit":
        checkAim(riderUnit);
        break;

      default:
        checkAim(riderUnit);
        break;
    }
  } else {
    checkAim(riderUnit);
  }
}

export { checkAim };
