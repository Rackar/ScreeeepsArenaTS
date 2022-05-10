import { getObjectsByPrototype, getTicks } from "game/utils";
import { Creep } from "game/prototypes";
import { Flag } from "arena";

import { ClassUnit } from "../arena_alpha_spawn_and_swamp/units/spawnUnit";
import { addAttackRangeToCreeps, addHitsLabelToCreeps } from "../utils/ui";
import { singleAttack, singleHeal } from "../utils/1single/attack";

const unitList: ClassUnit[] = [];

export function loop() {
  const enermys = getObjectsByPrototype(Creep).filter(c => !c.my);
  const enermyFlag = getObjectsByPrototype(Flag).find(c => !c.my);
  const myUnits = getObjectsByPrototype(Creep).filter(c => c.my);

  if (getTicks() === 1) {
    console.log(myUnits);
    for (const myUnit of myUnits) {
      const body = myUnit.body.map(a => a.type);
      const unit = new ClassUnit(body, "unitInited");
      unit.object = myUnit;
      unitList.push(unit);
    }
  }

  console.log(unitList);

  for (const myUnit of unitList) {
    // 给所有可能的战斗单位添加单人攻击和奶的逻辑件
    singleAttack(myUnit, enermys);
    singleHeal(myUnit, unitList);

    // 添加任务序列
    myUnit.initQueues(
      [
        { flag: "moveToPosByRange", aim: { x: 70, y: 40 }, range: 10 },
        { flag: "staySomeTime", stayTime: 30 },
        { flag: "moveToPosByRange", aim: { x: 85, y: 85 }, range: 8 },
        { flag: "staySomeTime", stayTime: 30 },
        { flag: "moveToPosByRange", aim: { x: 95, y: 95 }, range: 5 },

        { flag: "moveToPosByRange", aim: { x: 91, y: 96 }, range: 2 },
        {
          flag: "callback",
          jobFunction: () => {
            const obj = myUnit.object;
            if (obj) {
              // const enermy = findClosestByRange(obj, enermys);
              if (enermyFlag) {
                obj.moveTo(enermyFlag);
              }
            }

            return;
          },
          stopFunction: () => {
            return false;
          }
        }
      ],
      "0"
    );
    myUnit.runQueue();
  }

  // 添加战斗用UI
  addAttackRangeToCreeps(unitList);
  addHitsLabelToCreeps(unitList);
}

// 返回rush代码路径C:\Users\Lenovo\ScreepsArena\alpha-capture_the_flag
