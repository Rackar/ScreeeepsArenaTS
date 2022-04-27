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

// use when test cost
// const [MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH] = ['MOVE', 'WORK', 'CARRY', 'ATTACK', 'RANGED_ATTACK', 'HEAL', 'TOUGH']

const unitDemo = [
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
];
calcCost(unitDemo);
function calcCost(array: string[]) {
  let cost = 0;

  for (const label of array) {
    switch (label.toUpperCase()) {
      case "MOVE":
        cost += 50;
        break;
      case "WORK":
        cost += 100;
        break;
      case "CARRY":
        cost += 50;
        break;
      case "ATTACK":
        cost += 80;
        break;
      case "RANGED_ATTACK":
        cost += 150;
        break;
      case "HEAL":
        cost += 250;
        break;
      case "TOUGH":
        cost += 10;
        break;
      default:
        break;
    }
  }

  console.log(cost);

  return cost;
}

const UNITS = {
  smallCarryer: [MOVE, CARRY],
  smallWorker: [MOVE, WORK, CARRY],

  fastCarryer: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
  footMan: [MOVE, MOVE, ATTACK, ATTACK, MOVE, ATTACK],
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
  public aimId?: any | null;
  public aim?: { obj: StructureContainer; status: string } | null;
  public constructor(bodys: BodyPartConstant[], name?: string, repeat?: boolean) {
    // 构造函数
    this.bodys = bodys;
    this.name = name;
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
      console.log("新生产单位", newUnit);
      unit.object = newUnit;
    }
  } else {
    // 造兵列表已结束，重复造标记为repeat的兵

    const repeatUnit = unitsList.find(unit1 => unit1.repeat);
    console.log("repeat found", repeatUnit);
    if (repeatUnit) {
      mySpawn.spawnCreep(repeatUnit.bodys);
    }
  }
}

export { spawnList, ClassUnit, UNITS };
