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
  StructureRampart,
  RoomPosition
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

/**
 * 在具体位置建筑一个建筑，使用特定能量点
 * @param builders 使用的工人们
 * @param aimPosition 待见的位置
 * @param buildType 建造的类型
 * @param source 指定附近的资源或容器
 * @returns true为建造已完成
 */
export function buildUseSource<T extends BuildableStructure>(
  builders: Creep[] | Creep,
  aimPosition: RoomPosition,
  buildType: _Constructor<T>,
  source: Source | StructureContainer
) {
  // 如果woker不是数组， 就转换成数组
  if (!Array.isArray(builders)) {
    builders = [builders];
  }

  for (const worker of builders) {
    const mySites = getObjectsByPrototype(ConstructionSite).filter(c => c.my);
    const thisSite = mySites.find(c => c.x === aimPosition.x && c.y === aimPosition.y);
    if (thisSite && thisSite.progress < thisSite.progressTotal) {
      if (!worker.store[RESOURCE_ENERGY]) {
        if (source instanceof Source) {
          if (source && worker.harvest(source) === ERR_NOT_IN_RANGE) {
            worker.moveTo(source);
          }
        } else if (source instanceof StructureContainer) {
          if (source && worker.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            worker.moveTo(source);
          }
        } else {
          console.log("没有找到合适的矿源");
        }
      } else {
        if (worker.build(thisSite) === ERR_NOT_IN_RANGE) {
          worker.moveTo(thisSite);
        }
      }
    } else {
      const result = getObjectsByPrototype(buildType).find(
        c => c.exists && c.x === aimPosition.x && c.y === aimPosition.y
      );
      // 如果已建好，返回true
      if (result) {
        return true;
      } else {
        const info = createConstructionSite(aimPosition, buildType);
        if (!info.error) {
          console.log("can't build here");
        }
      }
    }
  }

  return false;
}
