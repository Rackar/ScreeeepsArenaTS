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
import { getRange, getObjectsByPrototype } from "game/utils";

import { checkIfInRampart, filterAimsInRangeAndSort } from "./pureHelper";
import { remoteAttackAndRun } from "./battle";

const DEFUALT_UNITS = {
  smallCarryer: [CARRY, MOVE],
  smallWorker: [CARRY, MOVE, WORK],
  carryCreep: [WORK, WORK, WORK, CARRY],
  workCreepMove: [CARRY, WORK, WORK, WORK, MOVE],
  workCreepMoveSpeed: [CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE],
  workerForRampart: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, MOVE, CARRY, MOVE, WORK],

  fastCarryer: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  tinyFootMan: [MOVE, ATTACK],
  miniFootMan: [MOVE, MOVE, MOVE, ATTACK],
  smallFootMan: [MOVE, ATTACK, MOVE, ATTACK],
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
  powerArcher: [
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    RANGED_ATTACK,
    RANGED_ATTACK,
    RANGED_ATTACK,
    RANGED_ATTACK,
    RANGED_ATTACK
  ],
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
   * ???true????????????????????????????????????
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
  public justOnce?: boolean;
  public constructor(bodys: BodyPartConstant[], name: string, group?: string, repeat?: boolean, justOnce?: boolean) {
    // ????????????
    this.bodys = bodys;
    this.name = name || "";
    this.group = group;
    this.repeat = repeat || false;
    this.init = false;
    this.queueUniqueIds = [];
    this.justOnce = justOnce || false;
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
   *?????????????????????????????????
   * @param item {me: Creep, flag: "moveToPosByRange" | "moveToUnitByRange", aim: Creep, range: number, stopFunction?: () => boolean}
   */
  private pushToQueue(item: IQueueItem) {
    item.me = item.me || this.object;
    item.range = item.range === null || item.range === undefined ? 5 : item.range; // ????????????5
    item.stayTime = item.stayTime || 0; // ??????0???
    this.queue.push(item);
  }

  /**
   * ??????????????????????????????????????????
   * @param items ????????????
   * @param uniqueId ????????????????????????????????????????????????????????????id??????????????????????????????????????????
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
      console.log(`?????????????????????${uniqueId}`);
    }
  }

  /**
   * ??????initQueue???runQueue
   * @param queues ????????????
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
   * ??????????????????????????????????????????????????????
   * @param items ????????????
   * @param uniqueId ????????????????????????????????????????????????????????????id
   */
  public reInitQueues(items: IQueueItem[], uniqueId: string) {
    if (!this.queueUniqueIds.includes(uniqueId)) {
      this.queue = [];
      // this.queue.push(...items);
      for (const item of items) {
        this.pushToQueue(item);
      }

      this.queueUniqueIds.push(uniqueId);
      console.log(`???????????????????????????${uniqueId}`);
    }
  }

  public runQueue() {
    if (this.queue.length) {
      const item = this.queue[0];
      console.log(
        `???????????????${item.me?.id as string} ${this.queueUniqueIds[this.queueUniqueIds.length - 1]}---${item.comment || item.flag
        }`
      );
      if (item && item.flag) {
        // ?????????????????????????????????
        if (item.stopFunction && item.stopFunction()) {
          console.log("???????????????????????????????????????");
          this.queue.shift();
          return;
        }

        // ???????????????????????????
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
                // ??????????????????15????????????????????????????????????
                // ????????????????????????????????????25??????????????????
                // ???????????????????????????
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
                .filter(c => c.my === false)
                .filter(c => getRange(c, aim) < range);
              if (enemys.length) {
                me.moveTo(enemys[0]);
                if (me.body && me.body.some(b => b.type === "ranged_attack")) {
                  remoteAttackAndRun(me, enemys[0], enemys);
                }
              } else {
                // ?????????aim??????????????????2??????
                if (getRange(me, aim) > 2) {
                  me.moveTo(aim);
                }
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
  const creeps = getObjectsByPrototype(Creep);
  // creeps.some(creep => checkIfInRampart(creep, ramparts));
  if (creeps.some(creepIn => checkIfInRampart(creepIn, ramparts))) {
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
  // cnc??????????????????
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
  const unit = unitsList.find(
    unit1 => (!unit1.object || !unit1.alive) && (!unit1.justOnce || (unit1.justOnce && unit1.rebirthtime === 0))
  );

  console.log("????????????", unit);
  if (unit) {
    // ??????????????????????????????????????????????????????????????????
    const newUnit = mySpawn.spawnCreep(unit.bodys).object;
    if (newUnit) {
      console.log("???????????????", newUnit);
      unit.object = newUnit;
    }
  } else {
    // ??????????????????????????????????????????repeat??????

    const repeatUnit = unitsList.find(unit1 => unit1.repeat);
    // console.log("repeat found", repeatUnit);
    if (repeatUnit) {
      const repeatU = new ClassUnit(repeatUnit.bodys, repeatUnit.name, repeatUnit.group);
      unitsList.push(repeatU);
      const newUnit = mySpawn.spawnCreep(repeatU.bodys).object;
      if (newUnit) {
        // console.log("???????????????", newUnit);
        repeatU.object = newUnit;
      }
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
