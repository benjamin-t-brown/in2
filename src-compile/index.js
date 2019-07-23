process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();
var argv = require('minimist')(process.argv.slice(2));
var core = require('./engine/core');
core.init();
console.log('Beginning program in the IN2 engine...');
if (argv.file) {
  console.log(' Running file...', argv.file);
  console.log(' START');
  console.log('-----------------');
  console.log();
  require(__dirname + '/out/' + argv.file + '.compiled.js');
} else {
  console.log('START');
  console.log('-----------------');
  console.log();
  require(__dirname + '/main.compiled.js');
}
