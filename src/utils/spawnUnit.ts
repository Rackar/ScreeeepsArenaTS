import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
import { Visual } from "game/visual";
import {
  ConstructionSite,
  Creep,
  Source,
  StructureContainer,
  StructureSpawn,
  StructureRampart,
  StructureTower,
  GameObject,
  Structure
} from "game/prototypes";
import { getRange } from "game/utils";
import { getObjectsByPrototype } from "game";

import { checkIfInRampart, filterAimsInRangeAndSort } from "./pureHelper";
import { remoteAttackAndRun } from "./battle";

const DEFUALT_UNITS = {
  smallCarryer: [MOVE, CARRY],
  smallWorker: [MOVE, WORK, CARRY],
  carryCreep: [WORK, WORK, WORK, CARRY],
  workCreepMove: [CARRY, WORK, WORK, WORK, MOVE],
  workCreepMoveSpeed: [CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE],

  fastCarryer: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  tinyFootMan: [MOVE, ATTACK],
  miniFootMan: [MOVE, MOVE, MOVE, ATTACK],
  footMan: [MOVE, MOVE, ATTACK, ATTACK, MOVE, ATTACK],
  rider: [MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK],
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

  tinyArcher: [MOVE, RANGED_ATTACK],
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
  unitName?: string;
  flag:
    | "moveToPosByRange"
    | "moveToUnitByRange"
    | "staySomeTime"
    | "callback"
    | "clearQueue"
    | "denfenseAimWithRange"
    | "moveAndFight";
  comment?: string;
  aim?: Creep | { x: number; y: number };
  range?: number;
  stayTime?: number;
  stayInRampart?: boolean;
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
  public name: string;
  public group?: string;
  public aimId?: any | null;
  public hitsVisual?: Visual | undefined;
  public attackRangeVisual?: Visual | undefined;
  public posDone?: boolean;
  public init: boolean;
  public aim?: { obj?: StructureContainer | Source; status: string } | null;
  public vis?: Visual;
  public rebirthtime = 0;
  public justOnce = false;
  public constructor(bodys: BodyPartConstant[], name: string, group?: string, repeat?: boolean, justOnce = false) {
    // 构造函数
    this.bodys = bodys;
    this.name = name || "";
    this.group = group;
    this.repeat = repeat || false;
    this.init = false;
    this.queueUniqueIds = [];
    this.justOnce = justOnce;
  }

  public get alive(): boolean {
    if (this.object?.hits) {
      return true;
    } else {
      if (this.init === true) {
        this.rebirthtime++;
        this.init = false;
      }

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
    item.stayTime = item.stayTime || 0; // 默认0秒
    this.queue.push(item);
  }

  /**
   * 初始化任务列表，仅会执行一次
   * @param items 任务列表
   * @param uniqueId 为了仅执行一次，需要明确的指定一个唯一的id。推荐单位名称加序号，好打印
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
   * 组合initQueue和runQueue
   * @param queues 任务队列
   */ public initQueueAndRun(queues: IQueueItem[]) {
    if (this.checkSpawned()) {
      this.initQueues(queues, `${this.name}-${this.rebirthtime}`);
    }

    this.runQueue();
  }
  public checkSpawned() {
    return this && this.object && this.alive && this.spawned;
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
      console.log(
        `执行任务：${item.me?.id as string} ${this.queueUniqueIds[this.queueUniqueIds.length - 1]}---${
          item.comment || item.flag
        }`
      );
      if (item && item.flag) {
        // 判断是否已满足停止条件
        if (item.stopFunction && item.stopFunction()) {
          console.log("本任务达到跳出条件，已弹出");
          this.queue.shift();
          return;
        }

        // 检测单位是不是挂了
        if (!item.me || !item.me.hits) {
          this.queue = [];
          return;
        }

        switch (item.flag) {
          case "moveToPosByRange":
          case "moveToUnitByRange": {
            if (item.me && item.aim && item.range) {
              const range = getRange(item.me, item.aim);
              console.log(`moveToPos:${item.aim.x},${item.aim.y}, range: ${range}`);
              if (range < item.range) {
                this.queue.shift();
                this.runQueue();
              } else {
                item.me.moveTo(item.aim);
              }
            }

            break;
          }

          case "moveAndFight":
            if (item.me && item.aim && item.range) {
              const range = getRange(item.me, item.aim);
              console.log(`moveToPos:${item.aim.x},${item.aim.y}, range: ${range}`);
              if (range < item.range) {
                this.queue.shift();
                this.runQueue();
              } else {
                // remoteAttackAndRun(item.me, enemy, enemys);
                // 如果小队附近15内有地方单位，则放任开火
                // 如果没有，则扩大搜索范围25找无保护农民
                // 都没有，则去目的地
                item.me.moveTo(item.aim);
              }
            }

            break;

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

          case "denfenseAimWithRange": {
            const { me, aim, range, stayInRampart } = item;
            if (me && aim && range) {
              const enemys = getObjectsByPrototype(Creep)
                .filter(c => !c.my)
                .filter(c => getRange(c, aim) < range);
              if (enemys.length) {
                me.moveTo(enemys[0]);
                if (me.body && me.body.some(b => b.type === "ranged_attack")) {
                  remoteAttackAndRun(me, enemys[0], enemys);
                }
              } else {
                const x = aim.x < 50 ? aim.x + 2 : aim.x - 2;
                const y = aim.y < 50 ? aim.y + 2 : aim.y - 2;
                // 集结到aim会堵塞，放在2格外
                me.moveTo({ x, y });
              }

              if (stayInRampart) {
                const ramparts = getObjectsByPrototype(StructureRampart).filter(c => c.my);
                if (ramparts.length) {
                  keepInRam(me, ramparts);
                }
              }

              if (item.me && item.stayTime) {
                if (item.stayTime === 1) {
                  this.queue.shift();
                  this.runQueue();
                } else {
                  item.stayTime--;
                }
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
            if (item.jobFunction) {
              item.jobFunction();
            }

            break;
        }
      }
    }
  }
}

function keepInRam(creep: Creep, ramparts: StructureRampart[], savetyMoveRange = 5) {
  if (checkIfInRampart(creep, ramparts)) {
    return true;
  } else {
    const aims = filterAimsInRangeAndSort(creep, ramparts, savetyMoveRange);
    if (aims.length) {
      creep.moveTo(aims[0]);
    }

    return false;
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
  if (unit && (!unit.justOnce || (unit.justOnce && unit.rebirthtime === 0))) {
    // 添加个别任务单位只生产一次，死了不再重复生产
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

function findUnitFromCreep(creep: Creep, units: ClassUnit[]) {
  for (const unit of units) {
    if (unit.object) {
      if (creep.id && unit.object.id === creep.id) {
        return unit;
      }
    }
  }

  return null;
}

export { spawnList, ClassUnit, DEFUALT_UNITS, IQueueItem };
