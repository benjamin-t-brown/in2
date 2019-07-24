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
  constructor(json, filename) {
    this.json = json;
    this.name = json.name;
    this.filename = filename;
  }

  getRoot() {
    for (const i in this.json.nodes) {
      if (this.json.nodes[i].type === 'root') {
        return this.json.nodes[i];
      }
    }
    return null;
  }

  getNode(id) {
    for (const i in this.json.nodes) {
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

function _get_function_id(id, file) {
  return file.name.slice(0, -5) + '_' + id;
}

function _get_character_id(file) {
  return 'ch_' + file.name.slice(0, -5);
}

const function_calls = [];
function _add_function_call(id, file) {
  //`ch_${file.name}->add_dialog(&${id});`
  function_calls.push({ id, file });
}
const characters = [];

function _create_action_node(content, id, child, file) {
  let ret =
    `// ACTION\n` +
    `void ${_get_function_id(id, file)}(Character* self)\n{\n` +
    `    ${content}\n`;
  ret += `    ${_get_function_id(child.id, file)}(self);\n`;
  ret += `};\n`;
  _add_function_call(id, file);
  return ret;
}

function _create_text_node(content, id, child, file) {
  if (content.length === 0) {
    content = id + ' has NO CONTENT.';
  }
  let ret =
    `// TEXT\n` +
    `void ${_get_function_id(id, file)}(Character* self)\n{\n` +
    `    std::string text = "${content.replace(/"/g, '\\"')}";\n` +
    `    log_dialog(text);\n`;

  if (child.type === 'next_file') {
    ret += `    ${_get_function_id(child.id, file)}(self);\n`;
  } else {
    ret += `    self->set_talk_index("${_get_function_id(child.id, file)}");\n`;
  }
  ret += `};\n`;
  _add_function_call(id, file);
  return ret;
}

function _parse_conditional(content, node, file) {
  let conditional = content ? content.replace(/;/g, '') : 'true';
  let post_conditional = '';
  if (content.indexOf('ONCE') > -1) {
    const cond_id = _get_function_id(node.id, file) + '_cond';
    if (content.trim() === 'ONCE') {
      conditional = conditional.replace('ONCE', `!player::get("${cond_id}")`);
    } else {
      conditional = conditional.replace('ONCE', `!player::get("${cond_id}") && `);
    }
    post_conditional = cond_id;
  }
  return { conditional, post_conditional };
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
          if (node.content === 'Root') {
            this.error(file.name, node.id, 'Root node has invalid character definition');
            return null;
          }
          characters.push(
            `Character* ${_get_character_id(file)} = new Character(${node.content});\n`,
            `characters::add_character(${_get_character_id(file)});\n`
          );
          return this.compileNode(child, file);
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
          const ret = _create_text_node(node.content, node.id, child, file);
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
        _add_function_call(node.id, file);
        let ret =
          `// ${node.type}\n` +
          `void ${_get_function_id(node.id, file)}(Character* self)\n{\n` +
          //`    player.set( 'current_in2_node', '${node.id}' );\n` +
          `    std::string text = "${node.content.replace(/"/g, '\\"')}";\n` +
          `    std::vector<std::string> choices;\n` +
          `    std::vector<std::string> _post_conditionals;\n` +
          `    _talk_indices.clear();\n`;
        const nodes_to_compile = [];
        for (const i in children) {
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
          nodes_to_compile.push(text_child);
          const { conditional, post_conditional } = _parse_conditional(
            (condition_child && condition_child.content) || '',
            condition_child,
            file
          );
          ret += `    if(${conditional})\n    {\n`;
          ret += `        choices.push_back("${text_child.content.replace(
            /"/g,
            '\\"'
          )}");\n`;
          ret += `        _post_conditionals.push_back("${post_conditional}");\n`;
          ret += `        _talk_indices.push_back(&${_get_function_id(
            text_child.id,
            file
          )});\n`;
          ret += `    }\n`;
        }
        ret += `    game::wait_for_choice(text, choices, [=](int i){\n`;
        ret += `        std::function<void(Character*)> cb = _talk_indices[i-1];\n`;
        ret += `        std::string post_conditional = _post_conditionals[i-1];\n`;
        ret += `        if (post_conditional.size()) player::set(post_conditional);\n`;
        ret += `        cb(self);\n`;
        ret += `        if(!explore::end_conversation)\n`;
        ret += `            explore::talk(self, true);\n`;
        ret += `        else\n        {\n`;
        ret += `            explore::_end_conversation_from_ch = false;\n`;
        ret += `            explore::talk(self);\n        }\n`;
        ret += `    });\n}`;
        let is_invalid = false;
        for (const i in nodes_to_compile) {
          const child = nodes_to_compile[i];
          const r = this.compileNode(child, file);
          if (r) {
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
      switch: (node, file) => {
        let children = file.getChildren(node);
        if (children.length === 0) {
          this.error(
            file.name,
            node.id,
            `Switch node ${node.id} has no children.\n CONTENT ${node.content}`
          );
          return null;
        }
        _add_function_call(node.id, file);
        const nodes_to_compile = [];
        let ret = `//${node.type}\n`;
        ret += `void ${_get_function_id(node.id, file)}(Character* self)\n{\n`;
        children = children.sort((a, b) => {
          if (a.content === 'default') {
            return 1;
          } else if (b.content === 'default') {
            return -1;
          } else {
            const y1 = parseFloat(a.top);
            const y2 = parseFloat(b.top);
            if (y1 < y2) {
              return -1;
            } else {
              return 1;
            }
          }
        });
        for (const i in children) {
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
          const { conditional, post_conditional } = _parse_conditional(
            (child && child.content) || '',
            child,
            file
          );
          let args = null;
          if (conditional.indexOf('::') > -1) {
            args = conditional.replace(/\n/g, ' ').split(' ');
          } else {
            args = conditional
              .replace(/\n/g, ' ')
              .split(' ')
              .filter(a => !!a)
              .map(arg => {
                let a = arg.trim();
                let is_bang = false;
                if (arg.indexOf('&&') > -1 || arg.indexOf('||') > -1) {
                  return a;
                }
                if (arg.indexOf('player::get') === -1) {
                  if (a[0] === '!') {
                    is_bang = true;
                    a = a.slice(1);
                  }

                  return (is_bang ? '!' : '') + `player::get("${a}")`;
                } else {
                  return a;
                }
              });
          }
          let content = child.content === 'default' ? 'true' : args.join(' ');
          ret += `    ${Number(i) === 0 ? 'if' : 'else if'}(${content})\n    {\n`;
          if (post_conditional) {
            ret += `        player::set("${post_conditional}");\n`;
          }
          ret += `        ${_get_function_id(child2.id, file)}(self);\n`;
          ret += `    }\n`;
          nodes_to_compile.push(child2);
        }
        ret += '}';
        let is_invalid = false;
        for (const i in nodes_to_compile) {
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
        _add_function_call(node.id, file);
        const content = node.content;
        if (content.indexOf(';') > -1) {
          this.error(
            file.name,
            node.id,
            `PassFail node ${node.id} has invalid conditional with ';'.\n CONTENT ${node.content}`
          );
          return null;
        }
        const { conditional, post_conditional } = _parse_conditional(
          (node && node.content) || '',
          node,
          file
        );
        let ret =
          `// ${node.type}\n` +
          `void ${_get_function_id(node.id, file)}(Character* self)\n{\n` +
          //`    player.set( 'current_in2_node', '${node.id}' );\n` +
          `    bool condition = !!(${conditional});\n` +
          ``;
        for (const i in children) {
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
              '' +
              `    if(condition)\n    {\n` +
              `        player::set("${post_conditional}");\n` +
              `        ${_get_function_id(child2.id, file)}(self);\n`;
          } else if (child.type === 'fail_text') {
            ret +=
              '' +
              `    if(!condition)\n    {\n` +
              `        ${_get_function_id(child2.id, file)}(self);\n`;
          }

          if (child.type === 'next_file') {
            ret += `    ${_get_function_id(child.id, file)}(self);\n`;
          }
          ret += `    }\n`;
        }
        ret += '}\n';
        for (const i in children) {
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
          const ret = _create_action_node(node.content, node.id, child, file);
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
          return this.compileNode(children[0], file);
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
            var local_node;
            if (content[0] === '#' || content.length === 0) {
              local_node = _create_action_node(
                content.slice(1),
                id,
                { id: child_id },
                file
              );
            } else {
              local_node = _create_text_node(content, id, { id: child_id }, file);
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

          _add_function_call(node.id, file);

          const child = children[0];
          const first_ret =
            `// ${node.type} FIRST\n` +
            `void ${_get_function_id(node.id, file)}(Character* self)\n{\n` +
            `    ${_get_function_id(node.id + '_0', file)}(self);\n` +
            `};\n`;
          const last_ret =
            `// ${node.type} LAST\n` +
            `void ${_get_function_id(
              node.id + '_' + node_list.length,
              file
            )}(Character* self)\n{\n` +
            `    ${_get_function_id(child.id, file)}(self);\n` +
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
          return this.compileNode(children[0], file);
        }
      },
      next_file: (node, file) => {
        _add_function_call(node.id, file);
        return (
          `// ${node.type} END\n` +
          `void ${_get_function_id(node.id, file)}(Character* self)\n{\n` +
          `    explore::end_talk(self);\n` +
          `};\n`
        );
      },
    };
    this.typeFuncs.choice_text = this.typeFuncs.text;
  }

  //header for output file (not individual compiled files)
  getHeader() {
    const ret = `#include "Content.h"
namespace content
{
std::vector<std::function<void(Character*)>> _talk_indices;
`;
    return ret;
  }
  //footer for entire file (not individual compiled files)
  getFooter() {
    const ret = `}`;
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
        const file = new File(json, filename);
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
  fs.writeFile(__dirname + output_url, result, err => {
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
const compile = function(input_files, output_url) {
  let num_started = 0;
  let num_finished = 0;
  const c = new Compiler();
  let body = '';
  let main_file_name = '';
  const failed_files = [];
  input_files.forEach((filename, i) => {
    num_started++;
    c.readAndCompile(filename, (result, file) => {
      num_finished++;
      if (file) {
        if (i === 0) {
          main_file_name = file.name;
        }
        if (result && !c.hasError(file.name)) {
          body += '\n\n' + result;
        } else {
          failed_files.push(file.name);
        }
      }
      if (num_started === num_finished) {
        if (c.errors.length) {
          output_errors(c.errors);
          console.log(
            `Failed. Could not compile ${failed_files.length} of ${input_files.length} files:`
          );
          for (const j in failed_files) {
            console.log(' ' + failed_files[j]);
          }
        }

        let aggregated_result = c.getHeader(main_file_name);
        function_calls.forEach(({ id, file }) => {
          aggregated_result += `void ${_get_function_id(id, file)}(Character*);\n`;
        });
        aggregated_result += '\nvoid build_characters()\n{\n';
        characters.forEach(str => {
          aggregated_result += '    ' + str;
        });
        aggregated_result += '\n';
        function_calls.forEach(({ id, file }) => {
          aggregated_result += `    ${_get_character_id(
            file
          )}->add_dialog(&${_get_function_id(id, file)},"${_get_function_id(
            id,
            file
          )}");\n`;
        });
        aggregated_result += '\n}' + body + c.getFooter(main_file_name);
        console.log();
        output_result(aggregated_result, output_url);
        output_result(aggregated_result, '/../../Adventure/Content/Characters.cpp');
      }
    });
  });
};

const argv = require('minimist')(process.argv.slice(2));

if (argv.file) {
  console.log('Compiling ' + argv.file + '...');
  compile([__dirname + '/../save/' + argv.file], '/out/' + argv.file + '.compiled.cpp');
} else if (argv.files) {
  console.log('Compiling ' + argv.files + '...');
  const filelist = argv.files.split(',').map(filename => {
    return __dirname + '/../save/' + filename;
  });
  compile(filelist, '/main.compiled.cpp');
} else {
  fs.readdir(__dirname + '/../save', (err, dirs) => {
    dirs = dirs
      .filter(dir => {
        if (dir === 'DONT_DELETE' || dir.indexOf('loader.js') > -1) {
          return false;
        }
        if (fs.statSync(__dirname + '\\..\\save\\' + dir).isDirectory()) {
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
    for (const i in dirs) {
      console.log(' ' + dirs[i]);
    }
    console.log();
    compile(dirs, '/main.compiled.cpp');
  });
}
