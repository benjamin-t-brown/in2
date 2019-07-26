const fs = require('fs');

//This program can compile compatible json files into IN2 *.compiled.js files.
//Usage:
//  Compile all files within the ${ProjectDir}/save directory into ${ProjectDir}/src-compile/main.compiled.js
//    node compiler.js
//  Compile file <filename> within the ${ProjectDir}/save directory into ${ProjectDir}/src-compile/out/<filename>.compiled.js
//    node compiler.js --file <filename>

//node types:
// root, text, choice, choice_text, choice_conditional, pass_fail, pass_text, fail_text, next_file, action, picture

class File {
  constructor(json) {
    this.json = json;
    this.name = json.name;
  }

  getRoot() {
    for (let i in this.json.nodes) {
      if (this.json.nodes[i].type === 'root') {
        return this.json.nodes[i];
      }
    }
    return null;
  }

  getNode(id) {
    for (let i in this.json.nodes) {
      if (this.json.nodes[i].id === id) {
        return this.json.nodes[i];
      }
    }
    return null;
  }

  getChildren(node) {
    return this.json.links
      .filter(link => {
        return link.from === node.id;
      })
      .map(link => {
        return this.getNode(link.to);
      })
      .sort((a, b) => {
        const y1 = parseFloat(a.top);
        const y2 = parseFloat(b.top);
        if (y1 < y2) {
          return -1;
        } else {
          return 1;
        }
      });
  }

  getParents(node) {
    return this.json.links
      .filter(link => {
        return link.to === node.id;
      })
      .map(link => {
        return this.getNode(link.from);
      });
  }
}

function _create_action_node(content, id, child_id) {
  try {
    /*eslint-disable-line no-eval*/ eval(
      `var core = requrre('engine/core'); var player = require('engine/player'); ${content}`
    );
  } catch (e) {
    console.log('COULD NOT EVAL', content, e.stack);
    return 'error' + e;
  }
  const ret =
    `// ACTION\n` +
    `scope.${id} = function(){\n` +
    `    ${content};\n` +
    `    scope.${child_id}();\n` +
    `};\n`;
  return ret;
}

function _create_text_node(content, id, child_id) {
  try {
    eval(`\`${content}\``); //eslint-disable-line no-eval
  } catch (e) {
    return 'error' + e;
  }
  if (content.length === 0) {
    content = 'LOL THIS HAS NO CONTENT';
  }
  const ret =
    `// TEXT\n` +
    `scope.${id} = function(){\n` +
    `    player.set( 'current_in2_node', '${id}' );\n` +
    `    const text = \`${content}\`;\n` +
    `    core.say( text, scope.${child_id} );\n` +
    `};\n`;
  return ret;
}

class Compiler {
  constructor() {
    this.errors = [];
    this.files_to_verify = [];
    this.already_compiled = {};
    this.has_error = {};
    this.typeFuncs = {
      root: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(file.name, node.id, 'Root node has no child.');
          return null;
        } else if (children.length > 1) {
          this.error(file.name, node.id, 'Root node has multiple children.');
          return null;
        } else {
          const child = children[0];
          const ret =
            `if( !id ){\n` +
            `    scope.${child.id}();\n` +
            `}\n` +
            `else {\n` +
            `    scope[ id ]();\n` +
            `}\n`;
          return (
            `files[ \`${file.name}\` ] = function( id ){\n` +
            `player.set( 'current_in2_file', '${file.name}' );\n` +
            this.compileNode(child, file) +
            ret +
            `};\n`
          );
        }
      },
      text: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Text node ${node.id} has no child.\n CONTENT ${node.content}`
          );
          return null;
        } else if (children.length > 1) {
          this.error(
            file.name,
            node.id,
            `Text node ${node.id} has multiple children.\n CONTENT ${node.content}`
          );
          return null;
        } else {
          const child = children[0];
          const ret = _create_text_node(node.content, node.id, child.id);
          if (ret.slice(0, 5) === 'error') {
            this.error(
              file.name,
              node.id,
              'Text node content could not be evaluated. ' +
                ret.slice(5) +
                `\n CONTENT ${node.content}`
            );
            return null;
          }
          return ret + '\n' + this.compileNode(child, file);
        }
      },
      choice: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Choice node ${node.id} has no children.\n CONTENT ${node.content}`
          );
          return null;
        }
        try {
          eval(`\`${node.content}\``); //eslint-disable-line no-eval
        } catch (e) {
          this.error(
            file.name,
            node.id,
            'Choice node content could not be evaluated. ' +
              e +
              `\n CONTENT ${node.content}`
          );
          return null;
        }
        let ret =
          `// ${node.type}\n` +
          `scope.${node.id} = function(){\n` +
          `    player.set( 'current_in2_node', '${node.id}' );\n` +
          `    const text = \`${node.content}\`;\n` +
          `    core.choose( text, '${node.id}', [` +
          ``;
        const nodes_to_compile = [];
        for (let i in children) {
          let condition_child = children[i];
          let text_child = null;
          if (condition_child.type === 'test' || condition_child.type === 'choice_text') {
            text_child = condition_child;
            condition_child = null;
          } else if (condition_child.type === 'choice_conditional') {
            text_child = file.getChildren(condition_child)[0];
            if (!text_child) {
              this.error(
                file.name,
                condition_child.id,
                `Choice Condition node has no child.\n CONTENT ${condition_child.content}`
              );
              return null;
            }
          } else {
            this.error(
              file.name,
              condition_child.id,
              `Choice node ${node.id} has non-text child ${condition_child.id}.\n CONTENT ${node.content}`
            );
            return null;
          }
          try {
            eval(`\`${text_child.content}\``); //eslint-disable-line no-eval
          } catch (e) {
            this.error(
              file.name,
              node.id,
              'Choice Text node content could not be evaluated. ' +
                e +
                `\n CONTENT ${node.content}`
            );
            return null;
          }
          nodes_to_compile.push(text_child);
          ret +=
            `{\n` +
            `        text: \`${text_child.content}\`,\n` +
            `        cb: scope.${text_child.id},\n` +
            `        condition: () => { ${
              condition_child ? 'return ' + condition_child.content : 'return true;'
            } }\n` +
            `    },`;
          if (condition_child) {
            try {
              eval(condition_child.content); //eslint-disable-line no-eval
            } catch (e) {
              this.error(
                file.name,
                condition_child.id,
                'Choice Condition node could not be evaluated. ' +
                  e +
                  `\n CONTENT ${condition_child.content}`
              );
              return null;
            }
          }
        }
        ret = ret.slice(0, -1);
        ret += `]);\n};\n\n`;
        let is_invalid = false;
        for (let j in nodes_to_compile) {
          const child = nodes_to_compile[j];
          const r = this.compileNode(child, file);
          if (r) {
            ret += r;
          } else {
            is_invalid = true;
          }
        }
        if (is_invalid) {
          return null;
        } else {
          return ret;
        }
      },
      switch: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Switch node ${node.id} has no children.\n CONTENT ${node.content}`
          );
          return null;
        }
        const nodes_to_compile = [];
        let ret = `//${node.type}\n`;
        ret += `scope.${node.id} = function(){\n`;
        for (let i in children) {
          const child = children[i];
          if (child.type !== 'switch_conditional' && child.type !== 'switch_default') {
            this.error(
              file.name,
              node.id,
              `Switch node ${node.id} has invalid child.\n CONTENT ${node.content}`
            );
            return null;
          }
          const children2 = file.getChildren(child);
          const child2 = children2[0];
          if (!child2) {
            this.error(
              file.name,
              child.id,
              `Switch child ${child.id} has no children.\n CONTENT ${child.content}`
            );
            return null;
          }
          const content =
            child.content === 'default'
              ? 'true'
              : child.content.trim().replace(/\n/g, ' ');
          if (content.indexOf(';') > -1) {
            this.error(
              file.name,
              node.id,
              `Switch child ${child.id} has invalid conditional with ';'.\n CONTENT ${child.content}`
            );
            return null;
          }
          ret += `    ${Number(i) === 0 ? 'if' : 'else if'}(${content})\n        scope.${
            child2.id
          }();\n`;
          nodes_to_compile.push(child2);
        }
        ret += '}';
        let is_invalid = false;
        for (let i in nodes_to_compile) {
          const node = nodes_to_compile[i];
          const r = this.compileNode(node, file);
          if (r !== null) {
            ret += '\n' + r;
          } else {
            is_invalid = true;
          }
        }
        if (is_invalid) {
          return null;
        } else {
          return ret;
        }
      },
      pass_fail: (node, file) => {
        const children = file.getChildren(node);
        if (children.length !== 2) {
          this.error(
            file.name,
            node.id,
            `PassFail node ${node.id} has incorrect children amount.\n CONTENT ${node.content}`
          );
          return null;
        }
        let ret =
          `// ${node.type}\n` +
          `scope.${node.id} = function(){\n` +
          `    player.set( 'current_in2_node', '${node.id}' );\n` +
          `    const condition = ( function(){ return ${node.content} } )();\n` +
          ``;
        try {
          eval(node.content); //eslint-disable-line no-eval
        } catch (e) {
          this.error(
            file.name,
            node.id,
            'PassFail node content could not be evaluated. ' +
              e +
              `\n CONTENT ${node.content}`
          );
          return null;
        }
        for (let i in children) {
          const child = children[i];
          const children2 = file.getChildren(child);
          if (children2.length === 0) {
            this.error(
              file.name,
              child.id,
              `PassFail node ${node.id} text child ${child.type} has no child.\n CONTENT ${node.content}`
            );
            return null;
          } else if (children2.length > 1) {
            this.error(
              file.name,
              child.id,
              `PassFail node ${node.id} text child ${child.type} has multiple children.\n CONTENT ${node.content}`
            );
            return null;
          }
          const child2 = children2[0];
          if (child.type === 'pass_text') {
            ret +=
              `    if( condition ){\n` +
              `        player.set( 'current_in2_node', '${child.id}' );\n` +
              `        const text = \`${child.content}\`;\n` +
              `        core.say( text, scope.${child2.id} );\n` +
              `    }\n`;
          } else if (child.type === 'fail_text') {
            ret +=
              `    if( !condition ){\n` +
              `        player.set( 'current_in2_node', '${child.id}' );\n` +
              `        const text = \`${child.content}\`;\n` +
              `        core.say( text, scope.${child2.id} );\n` +
              `    }\n`;
          }
        }
        ret += '};';
        for (let i in children) {
          const children2 = file.getChildren(children[i]);
          const child2 = children2[0];
          ret += '\n' + this.compileNode(child2, file);
        }
        return ret;
      },
      action: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Action node ${node.id} has no child.\n CONTENT ${node.content}`
          );
          return null;
        } else if (children.length > 1) {
          this.error(
            file.name,
            node.id,
            `Action node ${node.id} has multiple children.\n CONTENT ${node.content}`
          );
          return null;
        } else {
          const child = children[0];
          const ret = _create_action_node(node.content, node.id, child.id);
          if (ret.slice(0, 5) === 'error') {
            this.error(
              file.name,
              node.id,
              'Action node content could not be evaluated. ' +
                ret.slice(5) +
                `\n CONTENT ${node.content}`
            );
            return null;
          }
          return ret + '\n' + this.compileNode(child, file);
        }
      },
      picture: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Picture node ${node.id} has no child.\n CONTENT ${node.content}`
          );
          return null;
        } else if (children.length > 1) {
          this.error(
            file.name,
            node.id,
            `Picture node ${node.id} has multiple children.\n CONTENT ${node.content}`
          );
          return null;
        } else {
          const child = children[0];
          const ret =
            `// ${node.type}\n` +
            `scope.${node.id} = function(){\n` +
            `    core.picture( \`${node.content}\` );\n` +
            `    scope.${child.id}();\n` +
            `};\n`;
          return ret + '\n' + this.compileNode(child, file);
        }
      },
      chunk: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Chunk node ${node.id} has no child.\n CONTENT ${node.content}`
          );
          return null;
        } else if (children.length > 1) {
          this.error(
            file.name,
            node.id,
            `Chunk node ${node.id} has multiple children.\n CONTENT ${node.content}`
          );
          return null;
        } else {
          const content_list = node.content.split(/\n/g);
          let is_error = false;

          const node_list = content_list.map((content, i) => {
            const id = node.id + '_' + i;
            const child_id = node.id + '_' + (i + 1);
            let local_node;
            //console.log( 'PARSE CHUNK NODE: ' + content.slice( 0, 20 ) );
            if (content[0] === '#' || content.length === 0) {
              //console.log( ' action' );
              local_node = _create_action_node(content.slice(1), id, child_id);
            } else {
              //console.log( ' text' );
              local_node = _create_text_node(content, id, child_id);
            }

            if (local_node.slice(0, 5) === 'error') {
              console.log('CONTENT', content);
              this.error(
                file.name,
                node.id,
                `Chunk node content could not be evaluated. LINE ${i + 1} ` +
                  local_node.slice(5) +
                  `\n CONTENT ${node.content}`
              );
              is_error = true;
              return null;
            }
            return local_node;
          });

          if (is_error) {
            return null;
          }

          const child = children[0];
          const first_ret =
            `// ${node.type} FIRST\n` +
            `scope.${node.id} = function(){\n` +
            `    scope.${node.id + '_0'}();\n` +
            `};\n`;
          const last_ret =
            `// ${node.type} LAST\n` +
            `scope.${node.id + '_' + node_list.length} = function(){\n` +
            `    scope.${child.id}();\n` +
            `};\n`;
          return (
            first_ret + node_list.join('\n') + last_ret + this.compileNode(child, file)
          );
        }
      },
      trigger: (node, file) => {
        const children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Trigger node ${node.id} has no child.\n CONTENT ${node.content}`
          );
          return null;
        } else if (children.length > 1) {
          this.error(
            file.name,
            node.id,
            `Trigger node ${node.id} has multiple children.\n CONTENT ${node.content}`
          );
          return null;
        } else {
          const child = children[0];
          const spl = node.content.split(',');
          const trigger_name = spl[0];
          let trigger_val = spl[1] || 'true';
          if (typeof trigger_val === 'string') {
            trigger_val = trigger_val.trim();
          }
          const ret = _create_action_node(
            `player.set( "${trigger_name}", ${trigger_val} )`,
            node.id,
            child.id
          );
          if (ret.slice(0, 5) === 'error') {
            this.error(
              file.name,
              node.id,
              'Trigger node content could not be evaluated. ' +
                ret.slice(5) +
                `\n CONTENT ${node.content}`
            );
            return null;
          }
          return ret + '\n' + this.compileNode(child, file);
        }
      },
      next_file: node => {
        this.files_to_verify.push(node.content);
        const ret =
          `// ${node.type}\n` +
          `scope.${node.id} = function(){\n` +
          `    const key = \`${node.content}\`;\n` +
          `    const func = files[ key ];\n` +
          `    if( func ) {\n` +
          `        func();\n` +
          `    } else {\n` +
          '        core.say( `EXECUTION WARNING, no file exists named ${key}. You are probably running a subset of all the files, and not the whole scenario. ` + Object.keys(files), files.exit );\n' + //eslint-disable-line
          `    }\n` +
          `};\n`;
        return ret;
      },
    };
    this.typeFuncs.choice_text = this.typeFuncs.text;
  }

  //header for output file (not individual compiled files)
  getHeader() {
    return `{\nconst files = {};\nconst scope = {};`;
  }
  //footer for entire file (not individual compiled files)
  getFooter(mainFileName) {
    const ret =
      `files.exit = function(){\n` +
      `    core.exit();\n` +
      `};\n` +
      `files['${mainFileName}']();\n}\n`;
    return ret;
  }

  error(filename, node_id, text) {
    this.has_error[filename] = true;
    this.errors.push(filename + '|' + node_id + '|' + text);
  }

  hasError(filename) {
    return this.has_error[filename];
  }

  readAndCompile(filename, cb) {
    fs.readFile(filename, (err, data) => {
      if (err) {
        this.error(filename, null, 'Cannot read file. \n\n' + err);
        return cb(this.errors);
      } else {
        let json = null;
        try {
          json = JSON.parse(data.toString());
        } catch (e) {
          this.error(filename, null, 'Cannot parse json in file. \n\n' + e);
          return cb(this.errors);
        }
        const file = new File(json);
        const ret = this.compileFile(file);
        if (this.errors.length) {
          cb(ret, file);
        } else {
          cb(ret, file);
        }
      }
    });
  }

  compileFile(file) {
    const root = file.getRoot();
    if (root === null) {
      this.error(file.name, null, 'File has no root!');
      return null;
    }
    return this.compileNode(root, file);
  }

  compileNode(node, file) {
    if (this.already_compiled[node.id]) {
      return '';
    }
    if (this.typeFuncs[node.type]) {
      this.already_compiled[node.id] = true;
      return this.typeFuncs[node.type](node, file);
    } else {
      this.error(
        file.name,
        node.id,
        `Node ${node.id} has an invalid type: ${node.type}. \n\n CONTENT: ${node.content}`
      );
      return null;
    }
  }
}

const output_result = function(result, output_url) {
  fs.writeFile(__dirname + '/' + output_url, result, err => {
    if (err) {
      console.error('Error writing output ' + output_url, err);
    } else {
      console.log('Output written: ' + output_url);
    }
  });
};

const output_errors = function(errors) {
  console.log('-------------');
  errors.forEach((err, i) => {
    console.log(' ' + err);
    if (i !== errors.length - 1) {
      console.log();
    }
  });
  console.log('-------------');
  console.log();
};

//the first file listed in "input_files" will be the entrypoint for the program
const compile = function(inputFiles, outputUrls) {
  let numStarted = 0;
  let numFinished = 0;
  const c = new Compiler();
  let aggregatedResult = c.getHeader();
  let mainFileName = '';
  const failed_files = [];
  inputFiles.forEach((filename, i) => {
    numStarted++;
    c.readAndCompile(filename, (result, file) => {
      numFinished++;
      if (file) {
        if (i === 0) {
          mainFileName = file.name;
        }
        if (result && !c.hasError(file.name)) {
          aggregatedResult += '\n\n' + result;
        } else {
          failed_files.push(file.name);
        }
      }
      if (numStarted === numFinished) {
        if (c.errors.length) {
          output_errors(c.errors);
          console.log(
            `Failed. Could not compile ${failed_files.length} of ${inputFiles.length} files:`
          );
          for (const j in failed_files) {
            console.log(' ' + failed_files[j]);
          }
        }
        aggregatedResult = aggregatedResult + c.getFooter(mainFileName);
        console.log();
        outputUrls.forEach(outputUrl => {
          output_result(aggregatedResult, outputUrl);
        });
      }
    });
  });
};

const argv = require('minimist')(process.argv.slice(2));

if (argv.file) {
  console.log('Compiling ' + argv.file + '...');
  compile([__dirname + '/../save/' + argv.file], ['/out/' + argv.file + '.compiled.js']);
} else if (argv.files) {
  console.log('Compiling ' + argv.files + '...');
  const filelist = argv.files.split(',').map(filename => {
    return __dirname + '/../save/' + filename;
  });
  compile(filelist, ['main.compiled.js']);
} else {
  fs.readdir(__dirname + '/../save', (err, dirs) => {
    dirs = dirs
      .filter(dir => {
        if (dir === 'DONT_DELETE' || dir.indexOf('loader.js') > -1) {
          return false;
        }
        if (fs.statSync(__dirname + '/../save/' + dir).isDirectory()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a === 'main.json') {
          return -1;
        } else if (b === 'main.json') {
          return 1;
        } else {
          return a > b ? -1 : 1;
        }
      })
      .map(dir => {
        return __dirname + '/../save/' + dir;
      });
    console.log('Compiling...');
    for (let i in dirs) {
      console.log(' ' + dirs[i]);
    }
    console.log();
    compile(dirs, [
      'main.compiled.js',
      'out/main.compiled.js',
      '../src-js-standalone/main.js',
    ]);
  });
}
