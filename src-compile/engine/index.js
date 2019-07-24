var core = require('./core');

core.say(
  ['He went to the door.', 'He opened the door.', 'And suddenly he saw...'],
  () => {
    core.choose('What do you want to do next?', [
      {
        text: 'Wait, what?  Tell me what happened, you dimwit!',
        cb: () => {
          core.say('nah', process.exit.bind(process, 0));
        },
      },
    ]);
  }
);
