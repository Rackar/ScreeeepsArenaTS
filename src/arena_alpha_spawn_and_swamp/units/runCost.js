const [MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH] = [
  "MOVE",
  "WORK",
  "CARRY",
  "ATTACK",
  "RANGED_ATTACK",
  "HEAL",
  "TOUGH"
];

const unitDemo = [MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK];
calcCost(unitDemo);
function calcCost(array) {
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
