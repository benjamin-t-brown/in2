/**
 * AUX Engine File.
 *
 * Any "var" in this file is on purpose hoisted into window/global
 */

/* global player, core */

let map = [];
let mapWidth = 6;
let mapHeight = 6;
let playerLocation = { x: 0, y: 0 };

let pctChance = pct => {
  return pct / 100 > Math.random();
};

let createMapNode = (x, y) => {
  return {
    x,
    y,
    name: '',
    adj: {
      //n, s, e, w
    },
    //visited
    //zone
  };
};

let getMapNodeAt = (map, x, y) => {
  return map[y * mapWidth + x] || {};
};

let getMapConnectedNode = (map, { x, y }, dir) => {
  let node = getMapNodeAt(map, x, y);
  console.log('GET NODE LOCATION', node, x, y, dir);
  if (node.adj) {
    return node.adj[dir] || null;
  } else {
    return null;
  }
};

var engine = {
  init() {
    map = engine.generateMaze();
    engine.zoneMaze(map);
  },
  generateMaze() {
    // uses the binary-tree method of generating a maze
    let map = [];
    for (let i = 0; i < mapHeight; i++) {
      for (let j = 0; j < mapWidth; j++) {
        let node = createMapNode(j, i);
        node.name = 'crew-cafeteria';
        let adj = node.adj;
        if (i === 0 && j === 0) {
          map.push(node);
          continue;
        } else if (i === 0) {
          adj.e = getMapNodeAt(map, j - 1, i);
          adj.e.adj.w = node;
        } else if (j === 0) {
          adj.n = getMapNodeAt(map, j, i - 1);
          adj.n.adj.s = node;
        } else {
          if (pctChance(50)) {
            adj.n = getMapNodeAt(map, j, i - 1);
            adj.n.adj.s = node;
          } else {
            adj.e = getMapNodeAt(map, j - 1, i);
            adj.e.adj.w = node;
          }
        }
        map.push(node);
      }
    }
    return map;
  },
  zoneMaze(map) {
    let zones = ['main', 'dorms', 'engineering', 'labs', 'flight'];
    let zoneIndex = 0;
    let startingNode = map[Math.floor(Math.random() * map.length)];
    startingNode.visited = true;
    let unvisitedList = [startingNode];
    let ctr = 0;
    while (unvisitedList.length) {
      ctr++;
      if (ctr > (mapWidth * mapHeight) / zones.length) {
        ctr = 0;
        zoneIndex++;
      }
      let node = unvisitedList.shift();
      node.zone = zones[zoneIndex];
      for (let i in node.adj) {
        let adjNode = node.adj[i];
        if (!adjNode.visited) {
          adjNode.visited = true;
          unvisitedList.unshift(adjNode);
        }
      }
    }

    // remove orphaned zones
    for (let i = 0; i < mapWidth; i++) {
      for (let j = 0; j < mapHeight; j++) {
        let node = getMapNodeAt(map, j, i);
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
          node.zone = nearbyZone;
        }
      }
    }
  },
  async showRoomChoices() {
    let choices = ['north', 'south', 'east', 'west'].reduce((arr, dir) => {
      let connected = getMapConnectedNode(map, playerLocation, dir.slice(0, 1));
      if (connected) {
        arr.push({
          text: `Go through the ${dir} door.`,
          cb: () => {
            player.set('nextFile', connected.name);
          },
          condition: () => true,
        });
      }
      return arr;
    }, []);

    await core.choose('Now what?', 'showRoomChoices', choices);
  },
  getEvent() {
    return '';
  },
};

// debug
var debug = /*eslint-disable-line */ {
  showMap() {
    console.log('show map', map);
    let html = `<div style="margin:10px">`;
    for (let i = 0; i < mapHeight; i++) {
      html += `<div style="display:flex; justifyContent: flex-start;">`;
      for (let j = 0; j < mapWidth; j++) {
        const node = getMapNodeAt(map, j, i);
        const styles = {
          'background-color': 'gray',
          width: '90px',
          height: '90px',
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
          styles['background-color'] = 'cyan';
        } else if (node.zone === 'engineering') {
          styles['background-color'] = 'orange';
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
          styles['border-left'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.w) {
          styles['border-right'] = `2px solid ${styles['background-color']}`;
        }
        html += `<div style="${window.stylize(styles)}">${node.zone}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    window.db.innerHTML = html;
  },
};
