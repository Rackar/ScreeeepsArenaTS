import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
import { ConstructionSite, Creep, Source, StructureContainer, StructureSpawn, StructureTower } from "game/prototypes";

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
  fastCarryer: [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
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
}
const list: IUnit[] = [
  { bodys: UNITS.smallCarryer },
  { bodys: UNITS.smallCarryer },
  { bodys: UNITS.smallCarryer },
  { bodys: UNITS.smallWorker },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallHealer },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher },
  { bodys: UNITS.smallArcher, repeat: true },
  { bodys: UNITS.smallHealer }
];

function spawnList(mySpawn: StructureSpawn) {
  const unit = list.find(unit1 => !unit1.object || !unit1.alive);
  if (unit) {
    const newUnit = mySpawn.spawnCreep(unit.bodys).object;
    if (newUnit) {
      console.log("新生产单位", newUnit);
      unit.object = newUnit;
      unit.alive = true;
    }
  } else {
    // 造兵列表已结束，重复造标记为repeat的兵

    const repeatUnit = list.find(unit1 => unit1.repeat);
    if (repeatUnit) {
      mySpawn.spawnCreep(repeatUnit.bodys);
    }
  }
}

export { spawnList };
