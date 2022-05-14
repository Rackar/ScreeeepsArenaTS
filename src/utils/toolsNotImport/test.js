function splitCreepByPosition(creeps, range = 6) {
  const groups = [];

  // 粗聚类
  for (let i = 0; i < creeps.length; i++) {
    const creepsGroup = [];
    const element = creeps[i];
    creepsGroup.push(element);
    for (let j = 0; j < creeps.length; j++) {
      const other = creeps[j];
      if (i === j) {
        continue;
      }

      if (getRange(element, other) <= range) {
        if (!creepsGroup.includes(element)) {
          creepsGroup.push(element);
        }

        creepsGroup.push(other);
      }
    }

    groups.push(creepsGroup);
  }

  const results = [];
  for (const group of groups) {
    let pushed = false;
    for (const result of results) {
      if (result.some(creep => group.includes(creep))) {
        for (const creep of group) {
          if (!result.includes(creep)) {
            result.push(creep);
          }
        }

        pushed = true;
        break;
      }
    }

    if (!pushed) {
      results.push(group);
    }
  }

  return { groups, results };
}

function getRange(posA, posB) {
  const x = Math.abs(posA.x - posB.x);
  const y = Math.abs(posA.y - posB.y);
  return Math.max(x, y);
}

const creepList = [
  { x: 1, y: 1 },
  { x: 2, y: 2 },
  { x: 3, y: 3 },
  { x: 4, y: 4 },
  { x: 5, y: 5 },
  { x: 6, y: 6 },
  { x: 10, y: 6 },

  { x: 10, y: 11 },

  { x: 10, y: 16 },

  { x: 19, y: 20 },
  { x: 22, y: 22 },
  { x: 23, y: 23 },
  { x: 24, y: 24 },
  { x: 25, y: 25 },
  { x: 26, y: 26 },
  { x: 27, y: 27 },
  { x: 28, y: 28 },
  { x: 29, y: 29 },
  { x: 30, y: 30 },

  { x: 51, y: 51 },
  { x: 52, y: 52 },
  { x: 53, y: 53 },
  { x: 54, y: 54 },
  { x: 55, y: 55 },
  { x: 56, y: 56 },
  { x: 57, y: 57 }
];

const t = getRange(creepList[0], creepList[6]);
console.log(t);
const a = splitCreepByPosition(creepList);
console.log(a.groups, "-------------------------------", a.results);
