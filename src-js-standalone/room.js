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
glob_getMapConnectedNode,
glob_dirToOffset,
glob_oneOf
glob_getMap
glob_getPlayerLocation
*/

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
function glob_initRooms() {
  usedRooms = [];
}

function glob_getRandomRoomName(zone) {
  let localRooms = roomsByZone[zone] || {};
  let roomName = glob_oneOf(Object.keys(localRooms).concat(Object.keys(roomsByZone.any)));
  usedRooms.push(roomName);
  return roomName;
}

async function glob_showRoomChoices() {
  let directions = {
    north: '↑',
    south: '↓',
    east: '→',
    west: '←',
  };

  let choices = Object.keys(directions).reduce((arr, dir) => {
    let d = dir.slice(0, 1);
    let playerLocation = glob_getPlayerLocation();
    let connectedNode = glob_getMapConnectedNode(engine.getMap(), playerLocation, d);
    if (connectedNode) {
      arr.push({
        text: `Go through the ${dir} ${directions[dir]} door.`,
        cb: () => {
          player.set('nextFile', connectedNode.name);
          let { x, y } = glob_dirToOffset(d);
          playerLocation.x += x;
          playerLocation.y += y;
        },
        condition: () => true,
      });
    }
    return arr;
  }, []);

  await core.choose('Now what?', 'showRoomChoices', choices);
  debug.showMap();
}

async function glob_setupRoom(nodeId, fileId) {}
