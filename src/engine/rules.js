import { phase } from "./state.js";

export function applyRoll(game, roll){
  // returns { outcome: "ok"|"bust", doubled:boolean, added:number }
  const ph = phase(game);

  game.lastRoll = roll;
  game.hasRolledThisTurn = true;

  // early: 7 adds +70 (not +7)
  if (ph === "early" && roll.isSeven){
    game.tally += 70;
    return { outcome: "ok", doubled: false, added: 70, special: "lucky7" };
  }

  // late: 7 busts instantly
  if (ph === "late" && roll.isSeven){
    return { outcome: "bust", doubled: false, added: 0, special: "bust7" };
  }

  // normal add
  game.tally += roll.sum;

  // late: doubles double the entire tally after adding
  if (ph === "late" && roll.isDouble){
    game.tally *= 2;
    return { outcome: "ok", doubled: true, added: roll.sum, special: "double" };
  }

  return { outcome: "ok", doubled: false, added: roll.sum, special: null };
}