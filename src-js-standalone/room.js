/**
 * AUX Room File.
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

let roomsByZone = {
  any: {
    hallway: {},
  },
  main: {
    markets: {},
    overlook: {},
    tavern: {},
  },
  crew: {
    cafeteria: {},
    foodstorage: {},
    gameroom: {},
    gym: {},
    hangerc: {},
    library: {},
  },
};
let usedRooms = [];
let usedRandomEvents = [];
function glob_initRooms() {
  usedRooms = [];
  usedRandomEvents = [];
}

function glob_getRandomRoomName(zone) {
  let localRooms = roomsByZone[zone] || {};
  let roomName = glob_oneOf(
    Object.keys(localRooms)
      .filter(roomName => {
        return usedRooms.indexOf(roomName) === -1;
      })
      .concat(Object.keys(roomsByZone.any))
  );
  usedRooms.push(roomName);
  return roomName;
}

function glob_getRandomEvent(zone) {
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
}

async function glob_showRoomChoices() {
  let directions = {
    north: '↑',
    south: '↓',
    east: '→',
    west: '←',
  };

  let choices = Object.keys(directions).map(dir => {
    let d = dir.slice(0, 1);
    let playerLocation = glob_getPlayerLocation();
    let { x: playerX, y: playerY } = playerLocation;
    let connectedNode = glob_getMapNodeAdj(playerX, playerY, d);
    return {
      text: `Go through the ${dir} ${directions[dir]} door.`,
      cb: () => {
        if (connectedNode) {
          player.set('nextFile', connectedNode.name);
          let { x, y } = glob_dirToOffset(d);
          playerLocation.x += x;
          playerLocation.y += y;
        } else {
          core.say(
            `There is no door on the ${dir} ${directions[dir]} side.`,
            glob_showRoomChoices
          );
        }
      },
      condition: () => true,
    };
  });

  choices.push({
    text: 'Examine surroundings',
    cb: () => {
      core.say(`You see nothing else of interest here.`, glob_showRoomChoices);
    },
    condition: () => true,
  });

  await core.choose('Now what?', 'showRoomChoices', choices);
  debug.showMap();
}

async function glob_setupRoom(nodeId, fileId) {
  glob_getMapNodeFromFileId(nodeId, fileId);
}
