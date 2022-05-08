import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  findPath,
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

import { spawnList, ClassUnit } from "../arena_alpha_spawn_and_swamp/units/spawnUnit";

const pickedContainerIds: string[] = [];

function withdrawClosestContainer(miner: Creep, containers: StructureContainer[], mySpawn: StructureSpawn): void {
  // 工人从资源收集能量
  const source = miner.findClosestByPath(containers);
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

function findAnotherWildSource(worker: ClassUnit, sources: Source[], mySpawn: StructureSpawn | undefined) {
  const workerObj = worker.object;
  if (!workerObj) {
    return;
  }

  const allSources = getObjectsByPrototype(Source);
  const sortedSources = allSources.sort((a, b) => {
    return findPath(workerObj, a).length - findPath(workerObj, b).length;
  });
  if (sortedSources.length) {
    // 野外资源已存在 优先
    // console.log("野外资源选择的id", pickedContainerIds);
    const wildSources = sortedSources.filter(s => s.energy > 0 && pickedContainerIds.indexOf(s.id) === -1);
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
      // withdrawClosestContainer(workerObj, sources, mySpawn);
    }
  } else {
    // withdrawClosestContainer(workerObj, sources, mySpawn);
  }
}

function checkAimSourceAndMove(worker: ClassUnit) {
  const workerObj = worker.object;
  if (!workerObj || !worker.aim) {
    return;
  }

  if (worker.aim.obj) {
    const aim = worker.aim.obj as Source;
    if (worker.aim.obj.exists && aim.energy > 0) {
      workerObj.moveTo(worker.aim.obj);
      workerObj.harvest(aim);
      if (workerObj.getRangeTo(worker.aim.obj) === 1 || workerObj.getRangeTo(worker.aim.obj) === 0) {
        worker.aim.status = "harvesting";
      }
    } else {
      worker.aim.status = "quit";
    }
  } else {
    worker.aim.status = "quit";
  }
}

function checkAimSourceAndHarvest(worker: ClassUnit) {
  const workerObj = worker.object;
  if (!workerObj || !worker.aim) {
    return;
  }

  if (worker.aim.obj) {
    const aim = worker.aim.obj as Source;
    if (worker.aim.obj.exists && aim.energy > 0) {
      workerObj.harvest(aim);
      workerObj.drop(RESOURCE_ENERGY);
      if (aim.energy === 0) {
        // worker.aim.obj = undefined;
        worker.aim.status = "preBuild";
      }
    } else {
      // worker.aim.obj = null;
      worker.aim.status = "preBuild";
    }
  } else {
    // worker.aim.obj = null;
    worker.aim.status = "preBuild";
  }
}

// function getNextExtensionAim(params: string) {}

function extensionPreBuild(worker: ClassUnit) {
  const workerObj = worker.object;
  if (!workerObj || !worker.aim) {
    return;
  }

  // 有可能容器提前消失，按比例减少ext的数量。最多3个
  const countLimit = 1;
  // const resources = getObjectsByPrototype(Resource);
  // const target = workerObj.findClosestByRange(resources);
  // if (target && workerObj.getRangeTo(target) <= 1) {
  //   const { amount } = target;
  //   // countLimit = Math.round(amount / 500);
  // }

  const { x, y } = workerObj;
  // console.log(x, y);
  if (worker.aim.status === "preBuild") {
    worker.aim.status = "building";
    let count = 0;
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (count >= countLimit) {
          return;
        }

        if (i === 0 && j === 0) {
          continue;
        }

        count++;
        const info = createConstructionSite({ x: x + i, y: y + j }, StructureSpawn);
        if (info.error) {
          count--;
        }
      }
    }
  }
}

function PickupSourceAndBuild(worker: ClassUnit) {
  const workerObj = worker.object;
  if (!workerObj || !worker.aim) {
    return;
  }

  // 资源没捡完就捡资源
  const resources = getObjectsByPrototype(Resource);
  const target = workerObj.findClosestByRange(resources);
  if (target && workerObj.getRangeTo(target) <= 1) {
    workerObj.pickup(target);
  } else {
    worker.aim.status = "quit";
  }

  // 如果有空的扩展，就放资源进去
  const spawn = getObjectsByPrototype(StructureSpawn).find(i => {
    return i.store[RESOURCE_ENERGY] < 100 && workerObj.getRangeTo(i) === 1;
  });
  if (spawn) {
    workerObj.transfer(spawn, RESOURCE_ENERGY);
  }

  // 如果有能建造的，则建造
  const sites = getObjectsByPrototype(ConstructionSite)
    .filter(i => i.my && workerObj.getRangeTo(i) === 1)
    .sort((a, b) => {
      return b.progress - a.progress;
    });
  if (sites.length) {
    workerObj.build(sites[0]);
  }

  // 如果资源不多，扩展和身上满了，基地又差太多资源，则放弃换下一家。
  // todo
}

function getWildSource(worker: ClassUnit, sources: Source[], mySpawn: StructureSpawn | undefined): void {
  const workerObj = worker.object;
  if (!workerObj) {
    return;
  }

  if (mySpawn && workerObj.getRangeTo(mySpawn) <= 1) {
    workerObj.transfer(mySpawn, RESOURCE_ENERGY);
  }

  console.log(worker);

  if (worker.aim) {
    switch (worker.aim.status) {
      case "moving":
        checkAimSourceAndMove(worker);
        break;
      case "harvesting":
        checkAimSourceAndHarvest(worker);
        break;
      case "preBuild":
        extensionPreBuild(worker);
        break;
      case "building":
        PickupSourceAndBuild(worker);
        break;
      case "quit":
        findAnotherWildSource(worker, sources, mySpawn);
        break;

      default:
        findAnotherWildSource(worker, sources, mySpawn);
        break;
    }
  } else {
    findAnotherWildSource(worker, sources, mySpawn);
  }
}

export { withdrawClosestContainer, getWildSource };
