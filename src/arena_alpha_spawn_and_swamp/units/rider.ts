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

const pickedContainerIds: string[] = [];

function findAnotherAim(worker: ClassUnit) {
  const workerObj = worker.object;
  if (!workerObj) {
    return;
  }

  // 检查对方基地附近是否有驻兵

  const enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my) as StructureSpawn;

  checkDenfenseOfEnemySpawn(enemySpawn);

  function checkDenfenseOfEnemySpawn(enemySpawn: StructureSpawn) {}

  const allSources = getObjectsByPrototype(StructureContainer);
  const sortedSources = allSources.sort((a, b) => {
    return mySpawn.getRangeTo(a) - mySpawn.getRangeTo(b);
  });
  if (sortedSources.length > 6) {
    // 野外资源已存在 优先
    // console.log("野外资源选择的id", pickedContainerIds);
    const wildSources = sortedSources
      .slice(0, -3)
      .slice(3)

      .filter(s => s.store[RESOURCE_ENERGY] > 0 && pickedContainerIds.indexOf(s.id) === -1);
    if (wildSources && wildSources.length) {
      const source = wildSources[0];
      pickedContainerIds.push(source.id);
      console.log(`准备采野外资源`);
      worker.aim = {
        obj: source,
        status: "moving"
      };
      getWildSource(worker, sources, mySpawn);
    } else {
      withdrawClosestContainer(workerObj, sources, mySpawn);
    }
  } else {
    withdrawClosestContainer(workerObj, sources, mySpawn);
  }
}

function walkAndSteal(riderUnit: ClassUnit) {
  const rider = riderUnit.object;
  if (!rider) {
    return;
  }

  if (riderUnit.aim) {
    switch (riderUnit.aim.status) {
      case "moving":
        checkAimSourceAndMove(riderUnit);
        break;
      case "harvesting":
        checkAimSourceAndHarvest(riderUnit);
        break;
      case "preBuild":
        extensionPreBuild(riderUnit);
        break;
      case "building":
        PickupSourceAndBuild(riderUnit);
        break;
      case "quit":
        findAnotherWildSource(riderUnit, sources, mySpawn);
        break;

      default:
        findAnotherWildSource(riderUnit, sources, mySpawn);
        break;
    }
  } else {
    findAnotherAim(riderUnit);
  }
}

export { walkAndSteal };
