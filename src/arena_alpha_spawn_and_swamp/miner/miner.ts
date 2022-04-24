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

function mineClosestSource(miner: Creep, sources: StructureContainer[], mySpawn: StructureSpawn): void {
  // 工人从资源收集能量
  const source = miner.findClosestByPath(sources);
  if (miner.store.getFreeCapacity(RESOURCE_ENERGY) && source) {
    const info = miner.withdraw(source, RESOURCE_ENERGY);
    if (info === ERR_NOT_IN_RANGE) {
      miner.moveTo(source);
    }
  } else {
    if (miner.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      miner.moveTo(mySpawn);
    }
  }
}

export { mineClosestSource };
