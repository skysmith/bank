function d6(){ return 1 + Math.floor(Math.random() * 6); }

export function rollDice(){
  const d1 = d6();
  const d2 = d6();
  const sum = d1 + d2;
  return {
    d1, d2, sum,
    isSeven: sum === 7,
    isDouble: d1 === d2
  };
}