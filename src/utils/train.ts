import { Visual } from "game/visual";
import { CostMatrix } from "game/path-finder";
import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  getRange,
  findClosestByRange
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

interface Pos {
  x: number;
  y: number;
}

/*
 * @description: 拉一个creep到目标地点
 */
function pullCreepTo(puller: Creep, bePulled: Creep, targetPos: Pos): boolean {
  console.log(puller, bePulled, targetPos);
  if (getRange(bePulled, targetPos) !== 0) {
    if (getRange(puller, targetPos) !== 0) {
      puller.pull(bePulled);
      puller.moveTo(targetPos);
      bePulled.moveTo(puller);
    } else {
      puller.pull(bePulled);
      puller.moveTo(bePulled);
      bePulled.moveTo(puller);
    }
  } else {
    return true;
  }

  return false;
}

// 开挖
const harvestThread = (worker: Creep, source: Source, carryCreep: Creep) => {
  worker.harvest(source);
  worker.transfer(carryCreep, RESOURCE_ENERGY);
};

// 车头要回家
function resetCarryCreep(carryCreep: Creep, homePos: Pos) {
  if (getRange(carryCreep, homePos) > 0) {
    carryCreep.moveTo(homePos);
  }
}

// 搬运工要持续运输
const carryCreepWork = (carryCreep: Creep, mySpawn: StructureSpawn) => {
  carryCreep.transfer(mySpawn, RESOURCE_ENERGY);
};

let mySource: Source;
let spawnLeft: Pos;
let sourceRight: Pos;
let sourceOuter: Pos;

function findPositions() {
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(i => i.my);
  if (mySpawn) {
    mySource = findClosestByRange(mySpawn, getObjectsByPrototype(Source));
    spawnLeft = { x: mySpawn.x - 1, y: mySpawn.y };
    sourceRight = { x: mySource.x + 1, y: mySource.y };
    sourceOuter = { x: mySource.x + 1, y: mySource.y < 50 ? mySource.y - 1 : mySource.y + 1 };
  }
}
//   return { spawnLeft, sourceRight, sourceOuter };
// }

// const { spawnLeft, sourceRight, sourceOuter } = findPositions();

function doPullAndWork(workers: ClassUnit[], source: Source, mySpawn: StructureSpawn) {
  findPositions();
  const puller = workers.find(w => w.name === "puller");
  const carryCreeps = workers.filter(w => w.name === "carryCreep");
  const avaliableCarryCreeps = carryCreeps.filter(c => c.spawned);
  let bePulled = null;
  let targetPos = null;
  // console.log(puller);
  console.log(avaliableCarryCreeps);

  if (!(puller && puller.object)) {
    return;
  }

  if (avaliableCarryCreeps.length === 0) {
    puller.object?.moveTo(spawnLeft);
    return;
  } else if (avaliableCarryCreeps.length === 1) {
    const carryCreep = avaliableCarryCreeps[0];
    if (!carryCreep.posDone) {
      bePulled = carryCreep;
      targetPos = sourceOuter;
    }
  } else if (avaliableCarryCreeps.length === 2) {
    const carryCreep = avaliableCarryCreeps.find(w => !w.posDone);
    console.log(carryCreep);
    if (carryCreep && !carryCreep.posDone) {
      bePulled = carryCreep;
      targetPos = sourceRight;
    }
  }

  if (bePulled && bePulled.object && targetPos) {
    const done = pullCreepTo(puller.object, bePulled.object, targetPos);
    console.log(done);
    if (done) {
      bePulled.posDone = true;
    }
  } else {
    for (const carryCreep of avaliableCarryCreeps) {
      if (carryCreep.object) {
        harvestThread(carryCreep.object, source, puller.object);
      }
    }

    // resetCarryCreep(puller.object, spawnLeft);
    carryCreepWork(puller.object, mySpawn);
  }
}

function workFlowOfMine(workers: ClassUnit[], source: Source, mySpawn: StructureSpawn) {
  const activeWorkers = workers.filter(worker => worker && worker.object && worker.alive);
  switch (activeWorkers.length) {
    case 0:
      return;
    case 1:
      activeWorkers[0].object?.moveTo(spawnLeft);
      break;
    case 2:
      doPullAndWork(workers, source, mySpawn);
      break;
    case 3:
      doPullAndWork(workers, source, mySpawn);
  }

  for (const worker of activeWorkers) {
    const workerObj = worker.object;
    if (!workerObj) {
      return;
    }

    if (workerObj.getRangeTo(mySpawn) <= 1) {
      workerObj.transfer(mySpawn, RESOURCE_ENERGY);
    }
  }
}

export { pullCreepTo, doPullAndWork };
