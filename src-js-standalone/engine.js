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
glob_oneOf
glob_getMapNodeAt
glob_initRooms,
glob_setupRoom
glob_showRoomChoices
glob_getRandomRoomName
*/

let map = [];
let zones = [];
let mapWidth = 6;
let mapHeight = 6;
let playerLocation = { x: 0, y: 0 };

var glob_getMap = () => map;
var glob_getPlayerLocation = () => playerLocation;

let createMapNode = (x, y) => {
  return {
    x,
    y,
    name: '',
    adj: {
      //n, s, e, w
    },
    //v (visited)
    //zone
    //lockName
  };
};

var engine = {
  init() {
    glob_initRooms();
    map = engine.generateMaze();
    zones = engine.createZones(map);
    const node = glob_oneOf(zones.main);
    let { x, y } = node;
    playerLocation.x = x;
    playerLocation.y = y;
  },
  bfs(map, { startingNode, cb, conditionCb }) {
    map.forEach(node => {
      node.v = false;
      node.parent = null;
    });
    let node;
    let unvisitedList = [startingNode];
    startingNode.v = true;
    while (unvisitedList.length) {
      node = unvisitedList.shift();
      if (cb(node)) {
        return node;
      }
      for (let i in node.adj) {
        let adjNode = node.adj[i];
        if (!adjNode.v && conditionCb(adjNode)) {
          adjNode.v = true;
          adjNode.parent = node;
          unvisitedList.unshift(adjNode);
        }
      }
    }
    return node;
  },
  generateMaze() {
    // uses the binary-tree method of generating a maze
    let map = [];
    let ewConnect = (adj, node, j, i) => {
      adj.w = glob_getMapNodeAt(map, mapWidth, j - 1, i);
      adj.w.adj.e = node;
    };
    let nsConnect = (adj, node, j, i) => {
      adj.n = glob_getMapNodeAt(map, mapWidth, j, i - 1);
      adj.n.adj.s = node;
    };
    for (let i = 0; i < mapHeight; i++) {
      for (let j = 0; j < mapWidth; j++) {
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
  createZones(map) {
    let zones = ['main', 'dorms', 'eng', 'labs', 'flight'];
    let zoneIndex = 0;
    let startingNode = map[Math.floor(glob_random() * map.length)];
    let lockName = '';
    let ctr = 0;
    let ret = {};

    engine.bfs(map, {
      startingNode,
      cb: node => {
        ctr++;
        if (ctr > (mapWidth * mapHeight) / zones.length) {
          ctr = 0;
          zoneIndex++;
          lockName = 'basic';
        }
        let zone = zones[zoneIndex];
        if (!ret[zone]) {
          ret[zone] = [node];
        } else {
          ret[zone].push(node);
        }
        node.zone = zone;
        node.name = glob_getRandomRoomName(zone);
        node.lockName = lockName;
        lockName = '';
      },
      conditionCb: () => true,
    });

    // remove orphaned zones
    for (let i = 0; i < mapWidth; i++) {
      for (let j = 0; j < mapHeight; j++) {
        let node = glob_getMapNodeAt(map, mapWidth, j, i);
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
    return ret;
  },
  async setupRoom(nodeId, fileId) {
    glob_setupRoom(nodeId, fileId);
  },
  async showRoomChoices(nodeId, fileId) {
    glob_showRoomChoices(nodeId, fileId);
  },

  getEvent() {
    return '';
  },
};

var debug = /*eslint-disable-line no-unused-vars*/ {
  showMap() {
    console.log(
      'PLAYER AT',
      glob_getMapNodeAt(map, mapWidth, playerLocation.x, playerLocation.y)
    );
    let html = `<div style="margin:10px">`;
    for (let i = 0; i < mapHeight; i++) {
      html += `<div style="display:flex; justifyContent: flex-start;">`;
      for (let j = 0; j < mapWidth; j++) {
        const node = glob_getMapNodeAt(map, mapWidth, j, i);
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
        } else if (node.zone === 'engineering') {
          styles['background-color'] = 'darkslateblue';
        } else if (node.zone === 'labs') {
          styles['background-color'] = 'brown';
        } else if (node.zone === 'dorms') {
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
          node.name}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    if (window.db) {
      window.db.innerHTML = html;
    }
  },
};
