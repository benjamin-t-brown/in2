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
glob_getMapNodeFromRoomName,
*/

let usedRooms = [];
let glob_initRooms = () => {
  usedRooms = [];
};

let glob_generateRoom = zone => {
  let localRooms = ROOMS_BY_ZONE[zone] || {};
  let roomName = glob_oneOf(
    Object.keys(localRooms)
      .filter(roomName => {
        return usedRooms.indexOf(roomName) === -1;
      })
      .concat(Object.keys(ROOMS_BY_ZONE.any))
  );
  usedRooms.push(roomName, ROOMS_BY_ZONE);
  return {
    visited: false,
    roomName,
    desc: (ROOMS_BY_ZONE[zone][roomName] || ROOMS_BY_ZONE.any[roomName])[0],
    items: [],
    people: [],
    locks: [],
  };
};

let glob_setPlayerAtPreviousRoom = () => {
  let playerLocation = glob_getPlayerLocation();
  let lastRoomName = player.get('lastIN2f');
  let node = glob_getMapNodeFromRoomName(lastRoomName);
  playerLocation.x = node.x;
  playerLocation.y = node.y;
  player.set('nextFile', lastRoomName);
};

let glob_enterRoom = async node => {
  let {
    room: { visited, desc, roomName },
  } = node;
  let header = '-- ' + roomName.toUpperCase() + ' --<br/><br/>';
  if (visited) {
    core.say(header + `You've come back to the ${roomName}`);
  } else {
    await core.say(header + desc);
  }
  node.room.visited = true;
  await glob_showRoomChoices(node);
};

let glob_showRoomChoices = async node => {
  let directions = {
    west: '←',
    east: '→',
    north: '↑',
    south: '↓',
  };
  let playerLocation = glob_getPlayerLocation();

  let choices = Object.keys(directions).map(dir => {
    let d = dir.slice(0, 1);
    let connectedNode = node.adj[d];
    return {
      text: `<span style="opacity:${connectedNode ? '1.0' : '0.5'}">Go ${dir} ${
        directions[dir]
      }.</span>`,
      cb: () => {
        if (connectedNode) {
          let { x, y } = glob_dirToOffset(d);
          playerLocation.x += x;
          playerLocation.y += y;
        } else {
          core.say(`There is no door on the ${dir} ${directions[dir]} side.`);
        }
      },
      condition: () => true,
    };
  });

  choices.push({
    text: 'Examine surroundings.',
    cb: async () => {
      await core.say(`You see nothing else of interest here.`);
    },
    condition: () => true,
  });

  await core.choose('Now what?', 'showRoomChoices', choices);
  debug.showMap();
};

let ROOMS_BY_ZONE = {
  any: {
    hallway: [`You step into a very nondescript hallway.`],
  },
  labs: {},
  eng: {},
  flight: {},
  main: {
    markets: [
      `You enter a large dome of a room, the lights above shining brightly such that you shade your eyes to see.  It appears you have walked into the markets.  Stalls and stations for the various vendors who pass through the station are lined in neat rows in the center.  Some have their advertisements and decorations still deployed, their owners having not bothered to remove them on the previous day.  It is eerie to be in this room without anybody in it.  Anything could jump out at you from inside one of the many hiding places here.`,
    ],
    overlook: [
      `A vast, glass panel overlooks the expanse of space.  It appears that this room's sole purpose was for scenery.  You cannot see much though, the solar-tinted windows block most of the harmful light in space.`,
    ],
    tavern: [
      `The smell of alcohol wrinkles your nose.  This is very clearly the tavern.  Upturned, wooden stools and tables are scattered across the floor.  Most of the drinks that had decorated the shelves behind the bar now lay shattered on the ground, leaving a dampness in the carbon-carpeted flooring.  You cannot help but think: what a waste...`,
    ],
  },
  crew: {
    cafeteria: [
      `You step into the cafeteria.  Normally a bustling place where restless crew would come to enjoy food and a much-needed break; it is now vacant, devoid of anything edible, and eerily quiet.`,
    ],
    foodstorage: [
      `It is cold in here.  And dark.  You have entered into the room designated for food storage, and only recognize this by the vats of thick dust splayed haphazardly across the floor.  Though the dehydrated food is unappealing in this state, it is the cooking staff's duty to find ample ways to keep it fresh and tasty.  They are gone now.  And so is your appetite.`,
    ],
    gameroom: [
      `Someone saw fit to repurpose this storage room as an free-form arcade.  The sight is fairly bare-bones: a few hacked-together terminals stand in the corners of the room, and a makeshift air-hockey table stands at askance angle in the center.  None of the appliances work any more.  Their screens are cracked, and the wiring for the table has been sliced clean through.`,
    ],
    gym: [
      `The room contains a mess of gym equipment, having been knocked over and strewn across the floor.  The ventilation shafts above spew hot air into the room, and condensation is slowly forming and the small bits of cracked mirrors on the walls.`,
    ],
    hangerc: [
      `You step into a ship hanger, one of three on the station, though clearly this is the crew-only one.  It feels cramped.  Tanker vessels are docked in painted-off stations, their cargo holds half-emptied, their reinforced shipping crates left in a disorganized mass across the floor, obstructing a clean walkway across the room.  The large doors that open into the vastness of space rumble ominously, streaks of electricity occasionally arcing from the electronic bolts that hold them in place.`,
    ],
    library: [
      `Silence.  You have entered the library.  Though it pales in comparison to a proper library on earth, it is still a welcome respite from the the noise on the station.  Books are crammed into tightly-layered shelves, ranging from ancient history to self-help.  A few of them have fallen on the ground due to the turbulence of the station.  Nobody has put them back on the shelves yet.`,
    ],
  },
};
