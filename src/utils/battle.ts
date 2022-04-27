import { createConstructionSite, findClosestByPath, getObjectsByPrototype, getTicks, getObjectById } from "game/utils";
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
      if (archer.hits < archer.hitsMax * 0.9 && range <= 2) {
        const x = archer.x + archer.x - enermy.x;
        const y = archer.y + archer.y - enermy.y;
        archer.moveTo({ x, y });
      }
    } else if (closestEnermy && closestEnermy.body.some(b => b.type === "ranged_attack")) {
      const range = archer.getRangeTo(closestEnermy);
      // 最近有远程组件，风筝 低血量就撤
      if (archer.hits < archer.hitsMax * 0.6 && range <= 3) {
        const x = archer.x + archer.x - enermy.x;
        const y = archer.y + archer.y - enermy.y;
        archer.moveTo({ x, y });
      }
    }
  } else if (info === ERR_NOT_IN_RANGE) {
    archer.moveTo(enermy);
  }
}

export { remoteAttackAndRun };
