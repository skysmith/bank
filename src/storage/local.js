const KEY = "bank_dice_save_v1";

export function loadSave(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

export function save(game){
  try{
    localStorage.setItem(KEY, JSON.stringify(game));
    return true;
  }catch{
    return false;
  }
}

export function clearSave(){
  localStorage.removeItem(KEY);
}