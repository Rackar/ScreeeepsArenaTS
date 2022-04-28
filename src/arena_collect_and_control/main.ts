import { createConstructionSite, findClosestByPath, getObjectsByPrototype, getTicks, getObjectById } from "game/utils";
import { ConstructionSite, Creep, Source, StructureContainer, StructureSpawn, StructureTower } from "game/prototypes";
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
import { ScoreCollector, RESOURCE_SCORE } from "arena";

import { withdrawClosestContainer } from "../arena_alpha_spawn_and_swamp/units/miner";
import { spawnList, ClassUnit, UNITS } from "../arena_alpha_spawn_and_swamp/units/spawnUnit";
import { remoteAttackAndRun } from "../utils/battle";

let attacker: Creep | undefined;

const unitList: ClassUnit[] = [
  new ClassUnit(UNITS.smallWorker, "energyCarryer"),
  new ClassUnit(UNITS.smallWorker, "energyCarryer"),
  new ClassUnit(UNITS.fastCarryer, "scoreCarryer"),
  new ClassUnit(UNITS.fastCarryer, "scoreCarryer"),
  new ClassUnit(UNITS.fastCarryer, "scoreCarryer"),
  new ClassUnit(UNITS.fastCarryer, "scoreCarryer", "cay1", true),
  new ClassUnit(UNITS.fastCarryer, "scoreCarryer"),

  new ClassUnit(UNITS.smallArcher, "smallArcher"),

  new ClassUnit(UNITS.smallArcher, "smallArcher"),
  new ClassUnit(UNITS.smallArcher, "smallArcher")
];

export function loop(): void {
  // const crs = getObjectsByPrototype(Creep);
  // Your code goes here
  const mySpawn = getObjectsByPrototype(StructureSpawn).find(c => c.my) as StructureSpawn;
  // const source = getObjectsByPrototype(Source).find(s => s.energy > 0)
  const sources = getObjectsByPrototype(Source).filter(s => s.energy > 0);

  const collector = getObjectsByPrototype(ScoreCollector)[0];

  const enermys = getObjectsByPrototype(Creep).filter(c => !c.my);
  const enermySpawn = getObjectsByPrototype(StructureSpawn).find(c => !c.my) as StructureSpawn;

  const builders = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "work"));
  const myUnits = getObjectsByPrototype(Creep).filter(c => c.my);
  const warriores = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "attack"));
  const doctors = getObjectsByPrototype(Creep).filter(c => c.my && c.body.some(b => b.type === "heal"));

  const towers = getObjectsByPrototype(StructureTower).filter(i => i.my);

  spawnList(mySpawn, unitList);
  const workers = unitList.filter(u => u.name === "energyCarryer");
  for (const workerUnit of workers) {
    if (workerUnit && workerUnit.object && workerUnit.alive) {
      const worker = workerUnit.object;
      const source = worker.findClosestByRange(sources);
      if (source) {
        if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
          if (worker.harvest(source) === ERR_NOT_IN_RANGE) {
            worker.moveTo(source);
          }
        } else {
          if (worker.transfer(mySpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            worker.moveTo(mySpawn);
          }
        }
      }
    }
  }

  const carryers = unitList.filter(u => u.name === "scoreCarryer");
  for (const carryerUnit of carryers) {
    if (carryerUnit && carryerUnit.object && carryerUnit.alive) {
      const creep = carryerUnit.object;
      if (creep.store[RESOURCE_SCORE] > 0) {
        if (creep.transfer(collector, RESOURCE_SCORE) === ERR_NOT_IN_RANGE) {
          creep.moveTo(collector);
        }
      } else {
        const containers = getObjectsByPrototype(StructureContainer);
        if (containers.length > 0) {
          const container = creep.findClosestByRange(containers);
          if (container && creep.withdraw(container, RESOURCE_SCORE) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container);
          }
        }
      }
    }
  }

  const archeres = unitList.filter(u => u.name === "smallArcher");

  // 远程弓箭手行为
  for (const archerUnit of archeres) {
    if (archerUnit && archerUnit.object && archerUnit.alive) {
      const archer = archerUnit.object;

      if (enermys && enermys.length) {
        const enermy = archer.findClosestByRange(enermys);
        if (enermy) {
          const range = archer.getRangeTo(enermy);

          remoteAttackAndRun(archer, enermy, enermys);
        }
        // archer.rangedAttack(enemy) == ERR_NOT_IN_RANGE && archer.moveTo(enemy)
      } else {
        archer.moveTo(collector);
      }
    }
  }
}
