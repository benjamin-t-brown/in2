/**
 * AUX Engine File.
 *
 * Any "var" in this file is on purpose hoisted.
 */

/*
global
core,
stylize,
engine,
debug,
player,
glob_random,
glob_pctChance,
glob_oneOf,
glob_getWith2dFrom1dArr,
glob_bfs,
glob_initRooms,
glob_initEvents
glob_generateRoom,
glob_enterRoom
*/

let MAP_WIDTH = 6;
let MAP_HEIGHT = 6;
let map = [];
let zones = {};
let playerLocation = { x: 0, y: 0 };

let glob_getMap = () => map;
let glob_getPlayerLocation = () => playerLocation;
let glob_getMapNodeAt = (x, y) => glob_getWith2dFrom1dArr(map, MAP_WIDTH, x, y);
let glob_getMapNodeAdj = (x, y, dir) => {
  let node = glob_getMapNodeAt(map, x, y);
  if (node.adj) {
    return node.adj[dir] || null;
  } else {
    return null;
  }
};
let glob_getMapNodeFromRoomName = roomName => {
  return map.reduce((prev, curr) => {
    return prev || roomName === curr.room.roomName;
  }, null);
};
let glob_getFileId = ({ zone, name }) => zone + '-' + name;

let createMapNode = (x, y) => {
  return {
    x,
    y,
    name: '',
    adj: {
      //n, s, e, w
    },
    //room (Room object)
    zone: '',
    //v (visited)
  };
};

var engine = {
  init() {
    glob_initRooms();
    glob_initEvents();
    map = engine.generateMaze();
    zones = engine.createRooms(map);
    const node = glob_oneOf(zones.main);
    let { x, y } = node;
    playerLocation.x = x;
    playerLocation.y = y;
    player.set('nextFile', 'room');
  },

  async start() {
    let node = glob_getMapNodeAt(playerLocation.x, playerLocation.y);
    glob_enterRoom(node);
  },

  async room() {
    let node = glob_getMapNodeAt(playerLocation.x, playerLocation.y);
    await glob_enterRoom(node);
  },

  generateMaze() {
    // uses the binary-tree method of generating a maze
    let map = [];
    let ewConnect = (adj, node, j, i) => {
      adj.w = glob_getWith2dFrom1dArr(map, MAP_WIDTH, j - 1, i);
      adj.w.adj.e = node;
    };
    let nsConnect = (adj, node, j, i) => {
      adj.n = glob_getWith2dFrom1dArr(map, MAP_WIDTH, j, i - 1);
      adj.n.adj.s = node;
    };
    for (let i = 0; i < MAP_HEIGHT; i++) {
      for (let j = 0; j < MAP_WIDTH; j++) {
        let node = createMapNode(j, i);
        let adj = node.adj;
        if (i === 0 && j === 0) {
          map.push(node);
          continue;
        } else if (i === 0) {
          ewConnect(adj, node, j, i);
        } else if (j === 0) {
          nsConnect(adj, node, j, i);
        } else {
          if (glob_pctChance(50)) {
            nsConnect(adj, node, j, i);
          } else {
            ewConnect(adj, node, j, i);
          }
        }
        map.push(node);
      }
    }
    return map;
  },
  createRooms(map) {
    let zones = ['main', 'crew', 'eng', 'labs', 'flight'];
    let zoneIndex = 0;
    let startingNode = map[Math.floor(glob_random() * map.length)];
    let ctr = 0;
    let ret = {};

    glob_bfs(map, {
      startingNode,
      cb: node => {
        ctr++;
        if (ctr > (MAP_WIDTH * MAP_HEIGHT) / zones.length) {
          ctr = 0;
          zoneIndex++;
        }
        let zone = zones[zoneIndex];
        if (!ret[zone]) {
          ret[zone] = [node];
        } else {
          ret[zone].push(node);
        }
        node.zone = zone;
      },
      conditionCb: () => true,
    });

    // remove orphaned zones
    for (let i = 0; i < MAP_WIDTH; i++) {
      for (let j = 0; j < MAP_HEIGHT; j++) {
        let node = glob_getMapNodeAt(j, i);
        let hasConsecutive = false;
        let nearbyZone = node.zone;
        for (let k in node.adj) {
          let node2 = node.adj[k];
          nearbyZone = node2.zone;
          if (node2.zone === node.zone) {
            hasConsecutive = true;
            break;
          }
        }

        if (!hasConsecutive) {
          let arr = ret[node.zone];
          arr.splice(arr.indexOf(node), 1);
          node.zone = nearbyZone;
          ret[nearbyZone].push(node);
          node.lockName = '';
        }
      }
    }

    map.forEach(node => {
      node.room = glob_generateRoom(node.zone);
    });
    return ret;
  },
};

let glob_spawnItemInZone = (itemName, zone) => {};

var debug = /*eslint-disable-line no-unused-vars*/ {
  showMap() {
    let html = `<div style="margin:10px">`;
    for (let i = 0; i < MAP_HEIGHT; i++) {
      html += `<div style="display:flex; justifyContent: flex-start;">`;
      for (let j = 0; j < MAP_WIDTH; j++) {
        const node = glob_getMapNodeAt(j, i);
        const styles = {
          'background-color': 'gray',
          width: '50px',
          height: '50px',
          'text-align': 'center',
          'font-size': '12px',
          'border-top': '2px solid black',
          'border-bottom': '2px solid black',
          'border-left': '2px solid black',
          'border-right': '2px solid black',
        };
        if (node.zone === 'main') {
          styles['background-color'] = 'purple';
        } else if (node.zone === 'flight') {
          styles['background-color'] = 'darkcyan';
        } else if (node.zone === 'eng') {
          styles['background-color'] = 'darkslateblue';
        } else if (node.zone === 'labs') {
          styles['background-color'] = 'brown';
        } else if (node.zone === 'crew') {
          styles['background-color'] = 'green';
        }

        if (node.adj.n) {
          styles['border-top'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.s) {
          styles['border-bottom'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.e) {
          styles['border-right'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.w) {
          styles['border-left'] = `2px solid ${styles['background-color']}`;
        }

        let { x, y } = playerLocation;
        if (j === x && i === y) {
          styles['background-color'] = 'gold';
          styles.color = 'black';
        }

        html += `<div style="${stylize(styles)}">${(node.lockName
          ? 'LOCKED'
          : node.zone) +
          '<br/>' +
          node.room.roomName}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    if (window.db) {
      window.db.innerHTML = html;
    }
  },
};
