/* eslint no-console: 0, no-process-exit: 0 */

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const css = require('./src-web/css');
const uglifycss = require('uglifycss');
const Terser = require('terser');
const shell = require('child_process');

let config;
try {
  config = JSON.parse(fs.readFileSync(__dirname + '/config.json').toString());
} catch (e) {
  console.log(
    '[WARN] Using config.template.js instead of config.js.  Copy and replace with your configs.'
  );
  config = JSON.parse(fs.readFileSync(__dirname + '/config.template.json').toString());
}

const _executeAsync = async function(cmd) {
  return new Promise(resolve => {
    console.log(cmd);
    const obj = shell.exec(
      cmd,
      {
        env: env,
      },
      resolve
    );
    obj.stdout.pipe(process.stdout);
    obj.stderr.pipe(process.stderr);
  });
};

const env = Object.create(process.env);
env.NPM_CONFIG_COLOR = 'always';

const rules = {
  'build-standalone': async function(cb) {
    const index = fs.readFileSync('src-js-standalone/index.html');
    const main = fs.readFileSync('src-compile/main.compiled.js');

    let standalone = fs
      .readFileSync(__dirname + '/' + config.standaloneCorePath)
      .toString();
    for (let i = 0; i < config.additionalPaths.length; i++) {
      standalone +=
        '\n' + fs.readFileSync(__dirname + '/' + config.additionalPaths[i]).toString();
    }
    standalone += '\n' + fs.readFileSync('src-js-standalone/init.js').toString();

    const script = '<script src="main.min.js"></script>';
    let didInsertScript = false;
    const newIndex = index
      .toString()
      .split('\n')
      .map(line => {
        if (line.indexOf('script') > -1) {
          if (didInsertScript) {
            return script;
          } else {
            didInsertScript = true;
            return '';
          }
        } else {
          return line;
        }
      })
      .join('\n')
      .replace(/[\n]{2,}/g, '\n');

    const concat = standalone.toString() + '\n' + main.toString();

    const mainMin = Terser.minify(
      {
        'main.js': concat,
      },
      {
        toplevel: true,
        warnings: true,
      }
    );
    if (mainMin.error) throw mainMin.error;
    if (mainMin.warnings) console.warn(mainMin.warnings);

    console.log('writing standalone/main.concat.js');
    fs.writeFileSync('standalone/main.concat.js', concat);
    console.log('writing standlone/index.html...');
    fs.writeFileSync('standalone/index.html', newIndex);
    console.log('writing standalone/main.min.js...');
    fs.writeFileSync('standalone/main.min.js', mainMin.code);
    console.log('zipping standalone/standalone.zip...');
    await _executeAsync(
      'zip -q9 standalone/standalone.zip standalone/index.html standalone/main.min.js'
    );
    await _executeAsync(
      'advzip -4 -a standalone/standalone.adv.zip standalone/index.html standalone/main.min.js'
    );
    await _executeAsync(`stat -c '%n %s' standalone/main.*`);
    await _executeAsync(`stat -c '%n %s' standalone/standalone*.zip`);
    console.log('done');
    cb();
  },
  'build-css': function(cb) {
    build_css(cb);
  },
};
const rule = argv._.shift();
if (rules[rule]) {
  rules[rule](function(error) {
    if (error) {
      return process.exit(error.code);
    } else {
      return process.exit(0);
    }
  });
} else {
  console.log('Invalid rule in site/scripts.js :', rule, argv);
  console.log('Valid rules:', Object.keys(rules));
  process.exit(1);
}

function build_css(cb) {
  const pre_css_folder = './src-web/css/';
  const dest_css_filename = './dist/assets/main.css';

  const _output_file = function(output) {
    console.log('pre.css output: ', dest_css_filename);
    fs.writeFile(dest_css_filename, output, err => {
      if (err) {
        console.log('ERROR []', err);
        process.exit(0);
      }
      const uglified = uglifycss.processFiles([dest_css_filename], {
        maxLineLen: 500,
        expandVars: true,
      });
      fs.writeFile(dest_css_filename, uglified, cb);
    });
  };

  const _compile_file = function(pre_css_filename, _cb) {
    console.log('pre.css build: ', pre_css_filename);
    fs.readFile(pre_css_filename, (err, data) => {
      if (err) {
        console.error('Error reading pre.css file', pre_css_filename, err);
        process.exit(0);
      } else {
        const output = data
          .toString()
          .split('\n')
          .map(line => {
            const m = line.match(/\$[^ ';]*/);
            if (m) {
              const css_constiable = m[0];
              const arr = css_constiable
                .slice(1)
                .split('.')
                .slice(1);
              let result = css;
              for (const i in arr) {
                try {
                  result = result[arr[i]];
                } catch (e) {
                  console.error(
                    'Error parsing line ' + i + ' in ' + pre_css_filename,
                    'invalid key',
                    arr[i]
                  );
                  console.error(i, '---> ', line);
                  process.exit(0);
                }
              }
              line = line.replace(css_constiable, result);
              return line;
            }
            return line;
          })
          .join('\n');
        _cb(output);
      }
    });
  };

  fs.readdir(pre_css_folder, (err, files) => {
    let numfiles = 0;
    let numfilesparsed = 0;
    let complete_output = '';
    files.forEach(file => {
      if (file.indexOf('pre.css') > -1) {
        numfiles++;
        _compile_file(pre_css_folder + file, output => {
          numfilesparsed++;
          if (file === 'main.pre.css') {
            complete_output = output + '\n' + complete_output;
          } else {
            complete_output += '\n' + output;
          }

          if (numfiles === numfilesparsed) {
            _output_file(complete_output);
          }
        });
      }
    });
  });
}
