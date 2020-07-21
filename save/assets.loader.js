const exp = {};

exp.load = function (cb) {
  exp.loadAnimations();
  exp.loadPictures(() => {
    exp.loadSounds(cb);
  });
};

exp.loadAnimations = function () {};

exp.loadPictures = function (cb) {
  cb();
};

exp.loadSounds = function (cb) {
  cb();
};

module.exports = exp;
