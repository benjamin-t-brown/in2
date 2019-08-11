/**
 * AUX Engine File.
 *
 * This file contains utility functions.
 *
 * Any "var" in this file is on purpose hoisted.
 */

/* global player, core, stylize, glob_showRoomChoices, glob_setupRoom, glob_initRooms */

// let randomSeed = 123456;
// let glob_random = () => {
//   let x = Math.sin(randomSeed++) * 10000;
//   return x - Math.floor(x);
// };

let glob_random = () => {
  return Math.random();
};

let glob_pctChance = pct => {
  return pct / 100 > glob_random();
};

let glob_oneOf = arr => {
  return arr[Math.floor(glob_random() * arr.length)] || null;
};

let glob_dirToOffset = dir => {
  let [x, y] = {
    n: [0, -1],
    s: [0, 1],
    e: [1, 0],
    w: [-1, 0],
  }[dir];
  return { x, y };
};

let glob_getWith2dFrom1dArr = (map, width, x, y) => {
  return map[y * width + x] || {};
};

let glob_bfs = (map, { startingNode, cb, conditionCb }) => {
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
};
