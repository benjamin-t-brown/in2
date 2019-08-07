/**
 * AUX Engine File.
 *
 * This file contains utility functions.
 *
 * Any "var" in this file is on purpose hoisted.
 */

/* global player, core, stylize, glob_showRoomChoices, glob_setupRoom, glob_initRooms */

var glob_random = () => {
  return Math.random();
};

var glob_pctChance = pct => {
  return pct / 100 > glob_random();
};

var glob_oneOf = arr => {
  return arr[Math.floor(glob_random() * arr.length)];
};

var glob_dirToOffset = dir => {
  let [x, y] = {
    n: [0, -1],
    s: [0, 1],
    e: [1, 0],
    w: [-1, 0],
  }[dir];
  return { x, y };
};

var glob_getMapNodeAt = (map, width, x, y) => {
  return map[y * width + x] || {};
};

var glob_getMapConnectedNode = (map, { x, y }, dir) => {
  let node = glob_getMapNodeAt(map, x, y);
  if (node.adj) {
    return node.adj[dir] || null;
  } else {
    return null;
  }
};
