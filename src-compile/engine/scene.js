// This is a mock for the scene class in the tree builder, used to assist content
// creaters when writing JavaScript based dialogue trees.

module.exports = {
  fps: 30,
  actors: [],
  background: '',
  foreground: '',
  pictures: {},
  animations: {},

  load: function() {},

  loop: function() {},
  setBackground: function() {},
  setForeground: function() {},
  clearActors: function() {},
  addActor: function() {},
  setActor: function() {},
  setActorBase: function() {},
  restoreActorBase: function() {},

  fadeOutActors: function() {},
  fadeInActors: function() {},

  startConversation: function() {},
  endConversation: function() {},
  setConv: function() {},

  setAnimation: function() {},
  playSound: function() {},
  stopSound: function() {},
  setVolume: function() {},
};
