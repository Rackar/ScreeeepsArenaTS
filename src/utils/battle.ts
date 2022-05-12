import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  getRange
} from "game/utils";
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

function remoteAttackAndRun(archer: Creep, enemy: Creep, enemys: Creep[]) {
  // 找到敌方最近的医疗兵集火
  const enemyHealers = enemys.filter(c => c.body.some(b => b.type === "heal"));
  const healer = archer.findClosestByRange(enemyHealers);
  if (healer) {
    // console.log(healer)
    const range = archer.getRangeTo(healer);

    if (range <= 3) {
      enemy = healer;
      console.log(`archer id ${archer.id} to enemy healer range: ${range}`);
    }
  }

  // 找到血量最低的敌人单位
  const enemySortLow = enemys
    .filter(c => c.hits < c.hitsMax)
    .sort((a, b) => {
      return a.hits - b.hits;
    });
  if (enemySortLow && enemySortLow.length > 0) {
    const enemyLow = enemySortLow[0];
    const range = archer.getRangeTo(enemyLow);

    // const rangeToEnemy = archer.getRangeTo(enemy)
    if (range <= 3) {
      if (enemyLow.hits / enemyLow.hitsMax < 0.3 || !healer) {
        enemy = enemyLow;
        console.log(`archer id ${archer.id} to enemy lowest range: ${range}`);
      }
      // console.log(`攻击敌方最低生命单位：`, enemyLow)
    }
  }

  const info = archer.rangedAttack(enemy);
  if (info === OK) {
    const closestEnemy = archer.findClosestByRange(enemys);
    if (closestEnemy && closestEnemy.body.some(b => b.type === "attack")) {
      // 最近有近战组件，风筝
      // 监测到掉血才后退 不浪费战力
      const range = archer.getRangeTo(closestEnemy);
      if (range <= 2) {
        const x = archer.x + archer.x - enemy.x;
        const y = archer.y + archer.y - enemy.y;
        archer.moveTo({ x, y });
      }
    } else if (closestEnemy && closestEnemy.body.some(b => b.type === "ranged_attack")) {
      const range = archer.getRangeTo(closestEnemy);
      // 最近有远程组件，风筝 低血量就撤
      if (archer.hits < archer.hitsMax * 0.7 && range <= 3) {
        const x = archer.x + archer.x - enemy.x;
        const y = archer.y + archer.y - enemy.y;
        archer.moveTo({ x, y });
      }
    }
  } else if (info === ERR_NOT_IN_RANGE) {
    archer.moveTo(enemy);
  }
}

function addDoctorMoveLogic(doctors: Creep[], myUnits: Creep[], enemys: Creep[]) {
  for (const doctor of doctors) {
    // const doctor = doctors[i];
    const myDamagedCreeps = getObjectsByPrototype(Creep).filter(o => o.my && o.hits < o.hitsMax);
    const battleUnits = myUnits.filter(c => c.body.some(b => b.type === "attack" || b.type === "ranged_attack"));

    // 如果自己受伤并离敌人过近，则远离敌军
    if (doctor.hits < doctor.hitsMax * 0.7) {
      const enemy = doctor.findClosestByRange(enemys);
      if (enemy) {
        const path = doctor.findPathTo(enemy);
        if (enemy.body.some(b => b.type === "attack" || b.type === "ranged_attack") && path.length <= 2) {
          // 有敌方攻击单位，风筝
          const x = doctor.x + doctor.x - enemy.x;
          const y = doctor.y + doctor.y - enemy.y;
          doctor.moveTo({ x, y });
        }

        continue;
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
      if (target && getRange(doctor, target) < 15) {
        if (doctor.heal(target) === ERR_NOT_IN_RANGE) {
          doctor.moveTo(target);
        }
      }
    }
  }
}

export { remoteAttackAndRun, addDoctorMoveLogic };
