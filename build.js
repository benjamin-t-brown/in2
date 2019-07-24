/* eslint no-console: 0, no-process-exit: 0 */

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const css = require('./src-web/css');
const uglifycss = require('uglifycss');

const env = Object.create(process.env);
env.NPM_CONFIG_COLOR = 'always';

const rules = {
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
