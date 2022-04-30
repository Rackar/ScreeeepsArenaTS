import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
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

const UNITS = {
  smallCarryer: [MOVE, CARRY],
  smallWorker: [MOVE, WORK, CARRY],

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
  // isAlive: function (string):boolean ;
}
class ClassUnit implements IUnit {
  public bodys: BodyPartConstant[];
  public repeat?: boolean;
  public object?: Creep | null;
  public name?: string;
  public group?: string;
  public aimId?: any | null;
  public aim?: { obj?: StructureContainer; status: string } | null;
  public constructor(bodys: BodyPartConstant[], name?: string, group?: string, repeat?: boolean) {
    // 构造函数
    this.bodys = bodys;
    this.name = name;
    this.group = group;
    this.repeat = repeat || false;
  }

  public get alive(): boolean {
    if (this.object?.hits) {
      return true;
    } else {
      return false;
    }
  }
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
