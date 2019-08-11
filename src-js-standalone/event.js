/**
 * AUX Event file.
 *
 * Any "var" in this file is on purpose hoisted into window/global
 */

/*
global
core,
engine,
debug,
player,
glob_dirToOffset,
glob_oneOf,
glob_getPlayerLocation,
glob_getMapNodeAdj,
glob_getMapNodeFromFileId,
*/

let randomEvents = {
  hullbreach: ['any'],
  ghost: ['any'],
  electricityarc: ['any'],
  playfulai: ['any'],
  confinedalienbeast: ['labs'],
};

let usedRandomEvents = [];
let glob_initEvents = () => {
  usedRandomEvents = [];
};

let glob_getRandomEvent = zone => {
  let eventsList = [];
  for (let eventName in randomEvents) {
    let eventZones = randomEvents[eventName];
    if (
      (!usedRandomEvents.includes(eventName) && eventZones.includes(zone)) ||
      eventZones.includes('any')
    ) {
      eventsList.push(eventName);
    }
  }
  return glob_oneOf(eventsList);
};
