import {
  createConstructionSite,
  findClosestByPath,
  getObjectsByPrototype,
  getTicks,
  getObjectById,
  getRange
} from "game/utils";
import {
  ConstructionSite,
  Structure,
  OwnedStructure,
  Creep,
  Source,
  StructureContainer,
  StructureExtension,
  StructureSpawn,
  StructureTower,
  Resource,
  _Constructor,
  StructureRampart
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
  WORK,
  BuildableStructure
} from "game/constants";

import { spawnList, ClassUnit } from "../spawnUnit";

export function prebuildConstructionSites<T extends BuildableStructure>(
  worker: ClassUnit,
  buildSiteType: _Constructor<T>,
  countLimit = 1
): boolean {
  const workerObj = worker.object;
  if (!workerObj) {
    return false;
  }

  const { x, y } = workerObj;

  let count = 0;

  // 如果地堡，优先保证本人位置的地堡
  if (buildSiteType === StructureRampart) {
    const info = createConstructionSite({ x, y }, buildSiteType);
    if (!info.error) {
      count++;
    }
  }

  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      if (count >= countLimit) {
        return true;
      }

      // 除了
      if (i === 0 && j === 0) {
        continue;
      }

      const info = createConstructionSite({ x: x + i, y: y + j }, buildSiteType);
      if (!info.error) {
        count++;
      }
    }
  }

  return false;
}
