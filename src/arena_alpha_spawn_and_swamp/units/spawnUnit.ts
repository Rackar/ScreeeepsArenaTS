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

const UNITS = {
  smallCarryer: [MOVE, CARRY],
  smallWorker: [MOVE, WORK, CARRY],
  carryCreep: [WORK, WORK, WORK, CARRY],

  fastCarryer: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
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

  // const queue: IQueueItem[] = [];
  /**
   *将序列任务加入任务列表
   * @param item {me: Creep, flag: "moveToPosByRange" | "moveToUnitByRange", aim: Creep, range: number, stopFunction?: () => boolean}
   */
  public importQueue(item: IQueueItem) {
    item.me = item.me || this.object;
    this.queue.push(item);
  }

  public runQueue() {
    if (this.queue.length) {
      const item = this.queue[0];
      if (item && item.flag) {
        if (item.stopFunction && item.stopFunction()) {
          this.queue.shift();
          return;
        }

        switch (item.flag) {
          case "moveToPosByRange": {
            if (item.me && item.aim && item.range) {
              const range = getRange(item.me, item.aim);
              if (range <= item.range) {
                this.queue.shift();
                this.runQueue();
              } else {
                item.me.moveTo(item.aim);
              }
            }

            break;
          }

          case "moveToUnitByRange": {
            if (item.me && item.aim && item.range) {
              const range = getRange(item.me, item.aim);
              if (range <= item.range) {
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
              if (item.stayTime <= 0) {
                this.queue.shift();
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

export { spawnList, ClassUnit, UNITS };
