{
  const files = {};
  const scope = {};

  files[`main.json`] = function(id) {
    player.set('current_in2_file', 'main.json');
    // next_file
    scope.oNRsRIgUHq = function() {
      const key = `default.json`;
      const func = files[key];
      if (func) {
        func();
      } else {
        core.say(
          `EXECUTION WARNING, no file exists named ${key}. You are probably running a subset of all the files, and not the whole scenario. ` +
            Object.keys(files),
          files.exit
        );
      }
    };
    if (!id) {
      scope.oNRsRIgUHq();
    } else {
      scope[id]();
    }
  };

  files[`default.json`] = function(id) {
    player.set('current_in2_file', 'default.json');
    // choice
    scope.HDqARauQJf = function() {
      player.set('current_in2_node', 'HDqARauQJf');
      const text = `You have a choice.`;
      core.choose(text, 'HDqARauQJf', [
        {
          text: `This is choice 1.`,
          cb: scope.kndkFpURut,
          condition: () => {
            return true;
          },
        },
        {
          text: `This is choice 2.`,
          cb: scope.EAxepMPbCy,
          condition: () => {
            return true;
          },
        },
      ]);
    };

    // TEXT
    scope.kndkFpURut = function() {
      player.set('current_in2_node', 'kndkFpURut');
      const text = `This is choice 1.`;
      core.say(text, scope.QXVirwZbIo);
    };

    // TEXT
    scope.QXVirwZbIo = function() {
      player.set('current_in2_node', 'QXVirwZbIo');
      const text = `You chose choice 1.`;
      core.say(text, scope.qkGCgiZEPV);
    };

    // TEXT
    scope.qkGCgiZEPV = function() {
      player.set('current_in2_node', 'qkGCgiZEPV');
      const text = `This has content.`;
      core.say(text, scope.ufsXekgCzm);
    };

    // TEXT
    scope.ufsXekgCzm = function() {
      player.set('current_in2_node', 'ufsXekgCzm');
      const text = `This has more content.`;
      core.say(text, scope.UeaXRrVfpp);
    };

    // TEXT
    scope.UeaXRrVfpp = function() {
      player.set('current_in2_node', 'UeaXRrVfpp');
      const text = `This has EVEN MORE content.`;
      core.say(text, scope.wymqIPPurg);
    };

    // TEXT
    scope.wymqIPPurg = function() {
      player.set('current_in2_node', 'wymqIPPurg');
      const text = `This is an example of a text node that has a lot of content.  Potentially, it could contain a description of something very sophisticated and require lots and lots of text to get fully correct, but it doesn't right now because this is just one of those kind of silly test cases.`;
      core.say(text, scope.eHNVJYxBbU);
    };

    // next_file
    scope.eHNVJYxBbU = function() {
      const key = `default.json`;
      const func = files[key];
      if (func) {
        func();
      } else {
        core.say(
          `EXECUTION WARNING, no file exists named ${key}. You are probably running a subset of all the files, and not the whole scenario. ` +
            Object.keys(files),
          files.exit
        );
      }
    };
    // TEXT
    scope.EAxepMPbCy = function() {
      player.set('current_in2_node', 'EAxepMPbCy');
      const text = `This is choice 2.`;
      core.say(text, scope.xblKMeatMw);
    };

    // TEXT
    scope.xblKMeatMw = function() {
      player.set('current_in2_node', 'xblKMeatMw');
      const text = `You chose choice 2.`;
      core.say(text, scope.qkGCgiZEPV);
    };

    if (!id) {
      scope.HDqARauQJf();
    } else {
      scope[id]();
    }
  };
  files.exit = function() {
    core.exit();
  };
  files['main.json']();
}
