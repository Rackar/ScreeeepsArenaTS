import { getObjectsByPrototype, getTicks } from "game/utils";
import { Creep } from "game/prototypes";
import { Flag } from "arena";

import { ClassUnit } from "../utils/spawnUnit";
import { addAttackRangeToCreeps, addHitsLabelToCreeps } from "../utils/ui";
import { singleAttack, singleHeal } from "../utils/1single/attack";

const unitList: ClassUnit[] = [];

export function loop() {
  const enemys = getObjectsByPrototype(Creep).filter(c => c.my === false);
  const enemyFlag = getObjectsByPrototype(Flag).find(c => c.my === false);
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
    singleAttack(myUnit, enemys);
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
              // const enemy = findClosestByRange(obj, enemys);
              if (enemyFlag) {
                obj.moveTo(enemyFlag);
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
