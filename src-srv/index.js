var http_server = require('./http-server');
var fs = require('fs');
var exec = require('child_process').exec;
const argv = require('minimist')(process.argv.slice(2));

const DIST_DIR = __dirname + '/../dist/';
const SAVE_DIR = __dirname + '/../save';
const COMPILER_DIR = __dirname + '/../src-compile';
const COMPILER_OUT = __dirname + '/../src-compile/out';

let compiler = 'compiler.js';
let extension = 'js';

if (argv.cpp) {
  compiler = 'compiler.cpp.js';
  extension = 'cpp';
}

var PORT = 8888;

http_server.start(PORT, __dirname + '/..');
process.on('SIGINT', function() {
  console.log('SIGINT');
  process.exit();
});
process.on('SIGTERM', function() {
  console.log('SIGTERM');
  process.exit();
});
process.on('exit', function() {
  process.stdout.write('Bye\n');
});

console.log('Now listening on port: ' + PORT);

function on_exec_compiled(resp, cb, err, stdout) {
  var ret = {
    success: true,
  };
  console.log('STDOUT', stdout);
  if (stdout.search('-------------') > -1) {
    ret.success = false;
    var ind1 = stdout.indexOf('-------------');
    var ind2 = stdout.lastIndexOf('-------------');
    var error_text = stdout.slice(ind1 + 14, ind2 - 1);
    var error_list = error_text.split('\n\n');
    ret.errors = error_list.map(error => {
      var arr = error.split('|');
      var filename = arr[0] || 'none';
      var node_id = arr[1] || 'none';
      var text = arr[2] || 'none';
      console.log('ARR', arr.length, text);
      var ind = text.indexOf('CONTENT');
      if (ind > -1) {
        text = text.slice(0, ind - 1);
      }
      return {
        text: text.trim(),
        node_id,
        filename: filename.trim(),
      };
    });
    console.log('ERRORS', ret.errors);
  }
  cb(err, ret);
}

//Compile a specific list of files
http_server.post('compile', (obj, resp, data) => {
  var cmd = `cd ${COMPILER_DIR} && node compiler.js --files ` + data.files.join(',');
  console.log(cmd);
  exec(
    cmd,
    on_exec_compiled.bind(null, resp, (err, ret) => {
      if (ret.success) {
        ret.file = fs.readFileSync(`${COMPILER_OUT}/main.compiled.js`).toString();
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
  var cmd = `cd ${COMPILER_DIR} && node ${compiler}`;
  if (obj.event_args[0]) {
    cmd += ` --file ${obj.event_args[0]}`;
    console.log(cmd);
    exec(
      cmd,
      on_exec_compiled.bind(null, resp, (err, ret) => {
        if (ret.success) {
          ret.file = fs
            .readFileSync(`${COMPILER_OUT}/${obj.event_args[0]}.compiled.${extension}`)
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
      var ret_data;
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
      var ret = {
        err: err,
        data: null,
      };
      ret.data = dirs.filter(dir => {
        if (dir === 'DONT_DELETE' || dir.indexOf('loader.js') > -1) {
          return false;
        }
        if (fs.statSync(__dirname + '/../save/' + dir).isDirectory()) {
          return false;
        }
        return true;
      });
      http_server.reply(resp, ret);
    });
  }
});

http_server.get('images', (obj, resp) => {
  fs.readdir(`${DIST_DIR}/assets/img/`, (err, dirs) => {
    var ret = {
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
