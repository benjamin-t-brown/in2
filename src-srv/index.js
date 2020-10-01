const http_server = require('./http-server');
const fs = require('fs');
const exec = require('child_process').exec;
const argv = require('minimist')(process.argv.slice(2));

const execAsync = async command => {
  return new Promise(resolve => {
    console.log(command);
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err, stdout, stderr);
        return;
      }
      resolve(stdout);
    });
  });
};

const DIST_DIR = __dirname + '/../dist/';
const SAVE_DIR = __dirname + '/../save/';
const COMPILER_DIR = __dirname + '/../src-compile/';
const COMPILER_OUT = __dirname + '/../src-compile/out';
const EXPORT_DIR = __dirname + '/../../sadelica-new-world/src/js/';

let config;
try {
  config = JSON.parse(
    fs.readFileSync(__dirname + '/../config.json').toString()
  );
} catch (e) {
  console.log(
    '[WARN] Using config.template.js instead of config.js.  Copy and replace with your configs.'
  );
  config = JSON.parse(
    fs.readFileSync(__dirname + '/../config.template.json').toString()
  );
}

console.log('[CONFIG]', config);

let compiler = 'compiler.js';
let extension = 'js';

if (argv.cpp) {
  compiler = 'compiler.cpp.js';
  extension = 'cpp';
}

const PORT = 8899;

http_server.start(PORT, __dirname + '/../dist/');
process.on('SIGINT', function () {
  console.log('SIGINT');
  process.exit();
});
process.on('SIGTERM', function () {
  console.log('SIGTERM');
  process.exit();
});
process.on('exit', function () {
  process.stdout.write('Bye\n');
});

console.log('Now listening on port: ' + PORT);

const getErrorsFromCompilation = stdout => {
  let errors = null;
  console.log('STDOUT', stdout);
  if (stdout.search('-------------') > -1) {
    const ind1 = stdout.indexOf('-------------');
    const ind2 = stdout.lastIndexOf('-------------');
    const error_text = stdout.slice(ind1 + 14, ind2 - 1);
    const error_list = error_text.split('\n\n');
    errors = error_list.map(error => {
      const arr = error.split('|');
      const filename = arr[0] || 'none';
      const node_id = arr[1] || 'none';
      let text = arr[2] || 'none';
      console.log('ARR', arr.length, text);
      const ind = text.indexOf('CONTENT');
      if (ind > -1) {
        text = text.slice(0, ind - 1);
      }
      return {
        text: text.trim(),
        node_id,
        filename: filename.trim(),
      };
    });
    console.log('ERRORS', errors);
  }
  return errors;
};

function on_exec_compiled(resp, cb, err, stdout) {
  const ret = {
    success: true,
    errors: getErrorsFromCompilation(stdout),
  };
  ret.success = ret.errors && ret.errors.length > 0 ? false : true;
  cb(err, ret);
}

//Compile a specific list of files
http_server.post('compile', (obj, resp, data) => {
  const cmd =
    `cd ${COMPILER_DIR} && node compiler.js --files ` + data.files.join(',');
  console.log(cmd);
  exec(
    cmd,
    on_exec_compiled.bind(null, resp, (err, ret) => {
      if (ret.success) {
        ret.file = fs
          .readFileSync(`${COMPILER_OUT}/main.compiled.${extension}`)
          .toString();
      }
      http_server.reply(resp, {
        err: err,
        data: ret,
      });
    })
  );
});

//Compile a single file or every file
http_server.get('compile', (obj, resp) => {
  let cmd = `cd ${COMPILER_DIR} && node ${compiler}`;
  if (obj.event_args[0]) {
    cmd += ` --file ${obj.event_args[0]}`;
    console.log(cmd);
    exec(
      cmd,
      on_exec_compiled.bind(null, resp, (err, ret) => {
        if (ret.success) {
          ret.file = fs
            .readFileSync(
              `${COMPILER_OUT}/${obj.event_args[0]}.compiled.${extension}`
            )
            .toString();
        }
        http_server.reply(resp, {
          err: err,
          data: ret,
        });
      })
    );
  } else {
    console.log(cmd);
    exec(
      cmd,
      on_exec_compiled.bind(null, resp, (err, ret) => {
        if (ret.success) {
          ret.file = fs
            .readFileSync(`${COMPILER_OUT}/main.compiled.${extension}`)
            .toString();
        }
        http_server.reply(resp, {
          err: err,
          data: ret,
        });
      })
    );
  }
});

http_server.post('player', (obj, resp, data) => {
  fs.writeFile(SAVE_DIR + '/player.json', JSON.stringify(data), err => {
    http_server.reply(resp, {
      err: err,
    });
  });
});

// Save a file
http_server.post('file', (obj, resp, data) => {
  fs.writeFile(SAVE_DIR + '/' + data.name, JSON.stringify(data), err => {
    http_server.reply(resp, {
      err: err,
    });
  });
});

// Delete a file
http_server.del('file', (obj, resp) => {
  fs.unlink(SAVE_DIR + '/' + obj.event_args[0], err => {
    http_server.reply(resp, {
      err: err,
    });
  });
});

// Get file contents or get list of all files
http_server.get('file', (obj, resp) => {
  if (obj.event_args[0]) {
    fs.readFile(SAVE_DIR + '/' + obj.event_args[0], (err, data) => {
      let ret_data;
      try {
        ret_data = JSON.parse(data.toString());
      } catch (e) {
        if (!err) {
          err = 'Invalid JSON in file "' + obj.event_args[0] + '"';
        }
        ret_data = null;
      }
      http_server.reply(resp, {
        err: err,
        data: ret_data,
      });
    });
  } else {
    fs.readdir(__dirname + '/../save', (err, dirs) => {
      const ret = {
        err: err,
        data: null,
      };
      ret.data = dirs.filter(dir => {
        if (
          dir === 'DONT_DELETE' ||
          dir.slice(-4) === '.zip' ||
          dir.indexOf('loader.js') > -1
        ) {
          return false;
        }
        if (fs.statSync(SAVE_DIR + '/' + dir).isDirectory()) {
          return false;
        }
        return true;
      });
      http_server.reply(resp, ret);
    });
  }
});

http_server.get('standalone', (obj, resp) => {
  try {
    let standalone = fs
      .readFileSync(__dirname + '/../' + config.standaloneCorePath)
      .toString();
    for (let i = 0; i < config.additionalPaths.length; i++) {
      standalone +=
        '\n' +
        fs
          .readFileSync(__dirname + '/../' + config.additionalPaths[i])
          .toString();
    }
    http_server.reply(resp, {
      err: null,
      data: standalone,
    });
  } catch (e) {
    console.log('ERROR?', e);
    http_server.reply(resp, {
      err: e,
    });
  }
});

http_server.post('export', async (obj, res) => {
  try {
    const resp = await execAsync(`cd ${COMPILER_DIR} && node ${compiler} -d`);
    const errors = getErrorsFromCompilation(resp);

    if (errors) {
      http_server.reply(res, {
        err: null,
        data: {
          success: false,
          err: errors,
        },
      });
      return;
    }

    await execAsync(
      `cp ${COMPILER_OUT}/main.compiled.${extension} ${EXPORT_DIR}`
    );
    http_server.reply(res, {
      err: null,
      data: {
        success: true,
        msg: `Exported main.compiled.js to ${EXPORT_DIR}`,
      },
    });
  } catch (e) {
    console.log('ERROR?', e);
    http_server.reply(res, {
      err: e,
    });
  }
});

http_server.get('images', (obj, resp) => {
  fs.readdir(`${DIST_DIR}/assets/img/`, (err, dirs) => {
    const ret = {
      err: err,
      data: null,
    };
    ret.data = dirs
      .filter(dir => {
        return dir.slice(-3) === 'png';
      })
      .map(dir => {
        return 'assets/img/' + dir;
      });
    http_server.reply(resp, ret);
  });
});
