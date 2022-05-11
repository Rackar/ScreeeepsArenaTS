import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
import { Visual } from "game/visual";
import {
  ConstructionSite,
  Creep,
  Source,
  StructureContainer,
  StructureSpawn,
  StructureTower,
  GameObject,
  Structure
} from "game/prototypes";
import { getRange } from "game/utils";

// 如果需要覆盖原生 Creep 接口
declare module "game/prototypes" {
  interface Creep {
    importQueue?: () => void;
  }
}

const DEFUALT_UNITS = {
  smallCarryer: [MOVE, CARRY],
  smallWorker: [MOVE, WORK, CARRY],
  carryCreep: [WORK, WORK, WORK, CARRY],

  fastCarryer: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
  miniFootMan: [MOVE, MOVE, MOVE, ATTACK],
  footMan: [MOVE, MOVE, ATTACK, ATTACK, MOVE, ATTACK],
  rider: [MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK],
  fastTank: [
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    ATTACK,
    ATTACK,
    ATTACK,
    ATTACK,
    ATTACK
  ],
  fastSword: [
    TOUGH,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    ATTACK,
    ATTACK,
    ATTACK
  ],

  smallArcher: [MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, RANGED_ATTACK],
  smallHealer: [MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, MOVE, MOVE, HEAL]
};
interface IUnit {
  bodys: BodyPartConstant[];
  repeat?: boolean;
  object?: Creep | null;
  alive?: boolean;
  name?: string;
  spawned?: boolean;
  // isAlive: function (string):boolean ;
}
interface IQueueItem {
  me?: Creep | null;
  flag: "moveToPosByRange" | "moveToUnitByRange" | "staySomeTime" | "callback" | "clearQueue";
  aim?: Creep | { x: number; y: number };
  range?: number;
  stayTime?: number;
  /**
   * 为true时终止当前任务，向后执行
   */
  stopFunction?: () => boolean;
  jobFunction?: () => void;
}
class ClassUnit implements IUnit {
  public bodys: BodyPartConstant[];
  public repeat?: boolean;
  public object?: Creep | null;
  public name?: string;
  public group?: string;
  public aimId?: any | null;
  public hitsVisual?: Visual | undefined;
  public attackRangeVisual?: Visual | undefined;
  public posDone?: boolean;
  public init: boolean;
  public aim?: { obj?: StructureContainer | Source; status: string } | null;
  public vis?: Visual;
  public constructor(bodys: BodyPartConstant[], name?: string, group?: string, repeat?: boolean) {
    // 构造函数
    this.bodys = bodys;
    this.name = name;
    this.group = group;
    this.repeat = repeat || false;
    this.init = false;
    this.queueUniqueIds = [];
  }

  public get alive(): boolean {
    if (this.object?.hits) {
      return true;
    } else {
      return false;
    }
  }

  public get spawned(): boolean {
    if (!this.init && this.object && checkSpawnedPos(this.object.x, this.object.y)) {
      this.init = true;
      return true;
    } else if (this.init) {
      return true;
    } else {
      return false;
    }
  }

  public queue = new Array<IQueueItem>();
  private queueUniqueIds: string[];

  // const queue: IQueueItem[] = [];
  /**
   *将序列任务加入任务列表
   * @param item {me: Creep, flag: "moveToPosByRange" | "moveToUnitByRange", aim: Creep, range: number, stopFunction?: () => boolean}
   */
  private pushToQueue(item: IQueueItem) {
    item.me = item.me || this.object;
    item.range = item.range === null || item.range === undefined ? 5 : item.range; // 默认范围5
    item.stayTime = item.stayTime || 10; // 默认等待10秒
    this.queue.push(item);
  }

  /**
   * 初始化任务列表，仅会执行一次
   * @param items 任务列表
   * @param uniqueId 为了仅执行一次，需要明确的指定一个唯一的id
   */
  public initQueues(items: IQueueItem[], uniqueId: string) {
    if (!this.queueUniqueIds.includes(uniqueId)) {
      if (this.queue.length === 0) {
        // this.queue.push(...items);
        for (const item of items) {
          this.pushToQueue(item);
        }
      }

      this.queueUniqueIds.push(uniqueId);
      console.log(`添加任务成功：${uniqueId}`);
    }
  }

  /**
   * 删除任务列表，重新添加，仅会执行一次
   * @param items 任务列表
   * @param uniqueId 为了仅执行一次，需要明确的指定一个唯一的id
   */
  public reInitQueues(items: IQueueItem[], uniqueId: string) {
    if (!this.queueUniqueIds.includes(uniqueId)) {
      this.queue = [];
      // this.queue.push(...items);
      for (const item of items) {
        this.pushToQueue(item);
      }

      this.queueUniqueIds.push(uniqueId);
      console.log(`重新添加任务成功：${uniqueId}`);
    }
  }

  public runQueue() {
    if (this.queue.length) {
      const item = this.queue[0];
      console.log(`执行任务：${JSON.stringify(item)}`);
      if (item && item.flag) {
        // 判断是否已满足停止条件
        console.log(item.stopFunction);
        if (item.stopFunction && item.stopFunction()) {
          this.queue.shift();
          return;
        }

        switch (item.flag) {
          case "moveToPosByRange":
          case "moveToUnitByRange": {
            if (item.me && item.aim && item.range) {
              const range = getRange(item.me, item.aim);
              console.log(range, "moveToPosByRange", item);
              if (range < item.range) {
                this.queue.shift();
                this.runQueue();
              } else {
                item.me.moveTo(item.aim);
              }
            }

            break;
          }

          case "staySomeTime": {
            if (item.me && item.stayTime) {
              if (item.stayTime === 1) {
                this.queue.shift();
                this.runQueue();
              } else {
                item.stayTime--;
              }
            }

            break;
          }

          case "clearQueue": {
            this.queue = [];
            break;
          }

          case "callback": {
            if (item.jobFunction) {
              item.jobFunction();
            }

            break;
          }

          default:
            break;
        }
      }
    }
  }
}

function checkSpawnedPos(x: number, y: number): boolean {
  // cnc出生点预设值
  if (!x && !y) {
    return false;
  }

  if (x === 4 && y === 3) {
    return false;
  }

  if (x === 4 && y === 95) {
    return false;
  }

  return true;
}

function spawnList(mySpawn: StructureSpawn, unitsList: ClassUnit[]) {
  const unit = unitsList.find(unit1 => !unit1.object || !unit1.alive);
  if (unit) {
    const newUnit = mySpawn.spawnCreep(unit.bodys).object;
    if (newUnit) {
      // console.log("新生产单位", newUnit);
      unit.object = newUnit;
    }
  } else {
    // 造兵列表已结束，重复造标记为repeat的兵

    const repeatUnit = unitsList.find(unit1 => unit1.repeat);
    // console.log("repeat found", repeatUnit);
    if (repeatUnit) {
      mySpawn.spawnCreep(repeatUnit.bodys);
    }
  }
}

export { spawnList, ClassUnit, DEFUALT_UNITS };
