const React = require('react');
const css = require('css');
const utils = require('utils');
const context = require('context');
const dialog = require('dialog');
const expose = require('expose');
const $ = (window.$ = require('jquery'));
require('jquery.panzoom');
const jsPlumb = window.jsPlumb;

window.on_node_click = function(elem) {
  console.log('Click Event Not Overwritten!', elem);
};

window.on_node_unclick = function(elem) {
  console.log('Unclick Event Not Overwritten!', elem);
};

window.on_node_dblclick = function(elem) {
  console.log('DBLClick Event Not Overwritten!', elem);
};

window.on_node_rclick = function(elem) {
  console.log('RClick Event Not Overwritten!', elem);
};

window.on_delete_click = function(elem) {
  console.log('DeleteClick Event Not Overwritten!', elem);
};

module.exports = class Board extends expose.Component {
  constructor(props) {
    super(props);
    const state = {};

    this.plumb = null;
    this.file = props.file;
    this.panning = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.last_mouse_x = 0;
    this.last_mouse_y = 0;
    this.last_offset_x = 0;
    this.last_offset_y = 0;
    this.link_node = null;
    this.drag_set = [];
    this.zoom = 1;
    this.max_zoom = 4;
    this.min_zoom = 1;

    this.onKeydown = ev => {
      if (this.link_node && ev.keyCode === 27) {
        this.exitLinkMode();
      } else if (this.drag_set.length && ev.keyCode === 27) {
        this.drag_set = [];
        this.plumb.clearDragSelection();
      }
    };

    this.onMouseDown = ev => {
      if (dialog.is_visible() || ev.which === 3) {
        return;
      }
      this.panning = true;
      let style = document.getElementById('diagram-parent').style.transform;
      let ind = style.indexOf('matrix');
      if (ind > -1) {
        let str = style.slice(ind);
        let arr = str.split(', ');
        this.offsetX = this.last_offset_x = parseFloat(arr[4]);
        this.offsetY = this.last_offset_y = parseFloat(arr[5]);
      }
    };

    this.onMouseMove = ev => {
      if (this.panning) {
        this.offsetX = this.last_offset_x - (this.last_mouse_x - ev.clientX);
        this.offsetY = this.last_offset_y - (this.last_mouse_y - ev.clientY);
        this.renderAtOffset();
      }
    };

    this.onMouseUp = () => {
      this.panning = false;
    };

    this.onScroll = ev => {
      // const scale = 1 / this.zoom;

      // const mouseX = ev.clientX;
      // const mouseY = ev.clientY;
      // let originX = this.offset_x;
      // let originY = this.offset_y;
      // const wheel = ev.deltaY < 0 ? 1 : -1;
      // const zoom = Math.exp(wheel * 0.2);
      // let newOriginX = mouseX / (scale * zoom) - mouseX / scale;
      // let newOriginY = mouseY / (scale * zoom) - mouseY / scale;

      const delta = ev.deltaY > 0 ? 0.5 : -0.5;
      let newZoom = this.zoom + delta;
      if (newZoom > this.max_zoom) {
        newZoom = 4; //all the way out
      } else if (this.zoom < this.min_zoom) {
        newZoom = 1; //all the way in
      }

      // const focal = {
      //   x: ev.clientX,
      //   y: ev.clientY,
      // };

      // this.zoom = newZoom;

      const width = 6400;
      const height = 6400;

      const oldScale = 1 / this.zoom;
      const newScale = 1 / newZoom;

      const oldWidth = oldScale * width;
      const oldHeight = oldScale * height;

      const newWidth = newScale * width;
      const newHeight = newScale * height;

      // const mDistX = ev.clientX / window.innerWidth;
      // const mDistY = ev.clientY / window.innerHeight;

      const mDistX = 0;
      const mDistY = 0;

      const scaleChange = newScale - oldScale;
      this.offsetX = (scaleChange * 20);
      this.offsetY = (scaleChange * 20);

      console.log('VAR', oldScale, newScale, this.zoom, newZoom, scaleChange, this.zoom);

      this.zoom = newZoom;
      this.renderAtOffset();
    };

    this.onDiagramDblClick = () => {
      // if ( !dialog.is_visible() && ev.nativeEvent.target.id === 'diagram' ) {
      // 	if ( this.zoom === 1 ) {
      // 		this.zoom = this.max_zoom;
      // 	} else {
      // 		this.zoom = 1;
      // 	}
      // 	$( '#diagram-parent' ).panzoom( 'zoom', 1 / this.zoom, {
      // 		focal: ev
      // 	} );
      // }
    };

    this.onNodeClick = window.on_node_click = elem => {
      let file_node = this.getNode(elem.id);
      if (this.link_node) {
        let err = this.addLink(this.link_node, file_node);
        if (err) {
          console.error('Error', 'Cannot create link', err);
          dialog.show_notification('Cannot create link. ' + err);
        }
        this.exitLinkMode();
      } else if (utils.is_shift() || utils.is_ctrl()) {
        let ind = this.drag_set.indexOf(file_node.id);
        if (ind === -1) {
          this.plumb.addToDragSelection(file_node.id);
          this.drag_set.push(file_node.id);
        } else {
          this.plumb.removeFromDragSelection(file_node.id);
          this.drag_set.splice(ind, 1);
        }
      }
    };

    this.onNodeUnclick = window.on_node_unclick = elem => {
      let file_node = this.getNode(elem.id);
      $('#diagram-parent').panzoom('enable');
      file_node.left = elem.style.left;
      file_node.top = elem.style.top;
      this.file.nodes.forEach(node_file => {
        let node = document.getElementById(node_file.id);
        node_file.left = node.style.left;
        node_file.top = node.style.top;
      });
      this.saveFile();
    };

    this.onNodeDblClick = window.on_node_dblclick = elem => {
      let file_node = this.getNode(elem.id);
      if (file_node.type === 'next_file') {
        dialog.show_input_with_select(
          expose.get_state('file-browser').file_list,
          file_node.content,
          content => {
            file_node.content = content;
            document.getElementById(file_node.id).children[0].innerHTML = content;
            this.buildDiagram();
            this.saveFile();
          }
        );
      } else if (
        file_node.type === 'chunk' ||
        file_node.type === 'action' ||
        file_node.type === 'switch_conditional'
      ) {
        dialog.set_shift_req(true);
        dialog.show_input(
          file_node,
          content => {
            dialog.set_shift_req(false);
            file_node.content = content;
            document.getElementById(file_node.id).children[0].innerHTML = content;
            this.buildDiagram();
            this.saveFile();
          },
          () => {
            dialog.set_shift_req(false);
          }
        );
      } else {
        dialog.set_shift_req(false);
        dialog.show_input(file_node, content => {
          file_node.content = content;
          document.getElementById(file_node.id).children[0].innerHTML = content;
          this.buildDiagram();
          //this.renderAtOffset();
          this.saveFile();
        });
      }
    };

    this.onNodeRClick = window.on_node_rclick = elem => {
      context.show_context_menu(this, elem);
    };

    this.onConnRClick = (params, ev) => {
      let from_id = params.sourceId.split('_')[0];
      let to_id = params.targetId.split('_')[0];
      let from = this.getNode(from_id);
      let to = this.getNode(to_id);
      this.deleteLink(from, to);
      ev.preventDefault();
    };

    this.onDeleteClick = window.on_delete_click = elem => {
      dialog.show_confirm('Are you sure you wish to delete this node?', () => {
        this.deleteNode(this.getNode(elem.id));
        if (this.drag_set.includes(elem.id)) {
          this.drag_set.forEach(id => {
            if (id !== elem.id) {
              const node = this.getNode(id);
              if (node.type !== 'root') {
                this.deleteNode(node);
              }
            }
          });
          this.drag_set = [];
          this.plumb.clearDragSelection();
        }
      });
    };

    document.oncontextmenu = () => {
      if (this.disable_context) {
        this.disable_context = false;
        return false;
      } else {
        return true;
      }
    };

    this.connectLink = link => {
      let connection = this.plumb.connect({
        source: link.from + '_from',
        target: link.to + '_to',
        paintStyle: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 8 },
        endpointStyle: {
          fill: css.colors.PRIMARY,
          outlineStroke: css.colors.TEXT_LIGHT,
          outlineWidth: 5,
        },
        connector: [
          'Flowchart',
          {
            midpoint: 0.6,
            curviness: 30,
            cornerRadius: 3,
            stub: 0,
            alwaysRespectStubs: true,
          },
        ],
        endpoint: ['Dot', { radius: 2 }],
        overlays: [['Arrow', { location: 0.6, width: 20, length: 20 }]],
      });
      connection.bind('contextmenu', this.onConnRClick);
    };

    this.centerOnNode = node_id => {
      let n = this.getNode(node_id);
      if (n) {
        let area = document.getElementById('player-resizer').getBoundingClientRect();
        let node = document.getElementById(node_id).getBoundingClientRect();
        this.offsetX = -(parseInt(n.left) - (area.width - 200) / 2 + node.width / 2);
        this.offsetY = -(parseInt(n.top) - area.height / 2 + node.height / 2);
        this.renderAtOffset();
      }
    };
    state.centerOnNode = this.centerOnNode;

    this.copySelection = () => {
      const node_mapping = {};
      const links = [];
      const nodes = this.drag_set.map(id => {
        const node = this.getNode(id);
        const new_node = Object.assign({}, node);
        new_node.id = utils.random_id(10);
        node_mapping[node.id] = new_node.id;
        return new_node;
      });
      this.drag_set.forEach(id => {
        const children = this.getChildren(this.getNode(id));
        children.forEach(child => {
          if (this.drag_set.includes(child.id)) {
            links.push({
              from: node_mapping[id],
              to: node_mapping[child.id],
            });
          }
        });
      });
      this.copy_set = { nodes, links };
    };
    state.copySelection = this.copySelection;

    this.pasteSelection = () => {
      if (this.copy_set) {
        let root_ind = -1;

        const new_links = JSON.parse(JSON.stringify(this.copy_set.links));
        const new_nodes = this.copy_set.nodes.map((node, i) => {
          const new_id = utils.random_id(10);
          const new_node = Object.assign({}, node);
          new_links.forEach(link => {
            if (link.to === node.id) {
              link.to = new_id;
            }
            if (link.from === node.id) {
              link.from = new_id;
            }
          });
          new_node.id = new_id;
          new_node.left = parseInt(node.left) + 25 + 'px';
          new_node.top = parseInt(node.top) + 25 + 'px';
          if (new_node.type === 'root') {
            root_ind = i;
          }
          return new_node;
        });

        if (root_ind > -1) {
          const new_root = new_nodes.splice(root_ind, 1)[0];
          const old_root = this.file.nodes[0];
          old_root.content = new_root.content;
          new_links.forEach(link => {
            if (link.from === new_root.id) {
              link.from = old_root.id;
            }
          });
        }

        new_nodes.forEach(node => {
          this.file.nodes.push(node);
        });
        new_links.forEach(link => {
          this.file.links.push(link);
        });
        this.drag_set = [];
        this.plumb.clearDragSelection();
        this.buildDiagram();
        new_nodes.forEach(node => {
          this.plumb.addToDragSelection(node.id);
          this.drag_set.push(node.id);
        });
        this.saveFile();
      }
    };
    state.pasteSelection = this.pasteSelection;

    //remove (node-error, node-active) from nodes
    this.removeAllExtraClasses = () => {
      $('.jtk-draggable')
        .removeClass('item-active')
        .removeClass('item-error')
        .css('outline', '');
    };
    state.removeAllExtraClasses = this.removeAllExtraClasses;

    utils.set_on_copy(() => {
      if (!dialog.is_visible()) {
        this.copySelection();
      }
    });
    utils.set_on_paste(() => {
      if (!dialog.is_visible()) {
        this.pasteSelection();
      }
    });

    this.state = state;
    this.expose('board');
  }

  componentWillReceiveProps(props) {
    this.file = props.file;
  }

  componentDidMount() {
    jsPlumb.ready(() => {
      this.buildDiagram();
      this.renderAtOffset();
    });
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('wheel', this.onScroll);
  }
  componentWillUnmount() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('wheel', this.onScroll);
    this.exitLinkMode();
  }
  componentDidUpdate() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.plumb.empty(document.getElementById('diagram'));
    jsPlumb.ready(() => {
      this.buildDiagram();
      this.renderAtOffset();
    });
  }
  renderAtOffset() {
    const scale = 1 / this.zoom;
    const offset = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${scale}, ${scale})`;
    console.log('RENDER AT OFFSET', this.offsetX, this.offsetY, scale);
    document.getElementById('diagram-parent').style.transform = offset;
  }

  saveFile() {
    clearTimeout(this.savetimeout);
    this.savetimeout = setTimeout(() => {
      const file = this.file;
      if (file !== null) {
        utils.post('/file/' + file.name, file, () => {
          console.log('Succesfully saved.');
        });
      }
    }, 500);
  }

  buildDiagram() {
    let file = this.file;
    if (file) {
      let html = file.nodes.reduce((prev, curr) => {
        return prev + this.getNodeHTML(curr);
      }, '');
      this.plumb && this.plumb.reset();
      window.plumb = this.plumb = jsPlumb.getInstance({
        PaintStyle: { strokeWidth: 1 },
        Anchors: [['TopRight']],
        Container: document.getElementById('diagram'),
      });
      let diagram = document.getElementById('diagram');
      diagram.innerHTML = html;
      //$('#diagram-parent').panzoom();
      // $('#diagram-parent').panzoom('option', {
      //   increment: 0.3,
      //   minScale: 1 / 4,
      //   maxScale: 1,
      //   which: 2,
      //   onZoom: ev => {
      //     let zoom = parseFloat(ev.target.style.transform.slice(7));
      //     this.getPlumb().setZoom(zoom);
      //   },
      // });

      // HACK: somehow this fixes the problem where zoom level messes up node dragging
      // setTimeout(() => {
      //   let zoom = parseFloat(
      //     document.getElementById('diagram-parent').style.transform.slice(7)
      //   );
      //   this.getPlumb().setZoom(zoom);
      // }, 100);

      this.plumb.draggable($('.node'));

      // this.plumb.draggable(
      //   file.nodes.map(node => {
      //     return node.id;
      //   }),
      //   {
      //     containment: true,
      //   }
      // );
      this.plumb.batch(() => {
        file.links.forEach(this.connectLink);
      });
    }
  }

  getPlumb() {
    return this.plumb;
  }

  enterLinkMode(parent) {
    setTimeout(() => {
      this.link_node = parent;
      document.getElementById('diagram-area').className = 'no-drag linking';
    }, 150);
  }
  exitLinkMode() {
    this.link_node = false;
    document.getElementById('diagram-area').className = 'no-drag movable';
  }

  getNode(id) {
    if (this.file) {
      for (let i in this.file.nodes) {
        if (this.file.nodes[i].id === id) {
          return this.file.nodes[i];
        }
      }
      return null;
    } else {
      return null;
    }
  }

  getChildren(node) {
    return this.file.links
      .filter(link => {
        return link.from === node.id;
      })
      .map(link => {
        return this.getNode(link.to);
      });
  }

  getParents(node) {
    return this.file.links
      .filter(link => {
        return link.to === node.id;
      })
      .map(link => {
        return this.getNode(link.from);
      });
  }

  getLinkIndex(from_id, to_id) {
    if (this.file) {
      for (let i in this.file.links) {
        if (this.file.links[i].from === from_id && this.file.links[i].to === to_id) {
          return i;
        }
      }
      return -1;
    } else {
      return -1;
    }
  }

  nodeHasChild(node) {
    if (this.file) {
      for (let i in this.file.links) {
        if (this.file.links[i].from === node.id) {
          return true;
        }
      }
      return false;
    } else {
      return false;
    }
  }

  nodeCanHaveChild(node) {
    if (node.type !== 'choice' && node.type !== 'switch') {
      if (this.nodeHasChild(node)) {
        return false;
      } else {
        return true;
      }
    }
    return true;
  }

  addLink(from, to) {
    let link = this.getLinkIndex(from.id, to.id);
    if (link !== -1) {
      return 'That specific link already exists.';
    }

    if (from.type === 'text' && this.nodeHasChild(from)) {
      return 'That text node already has a child.';
    }
    if (from.type === 'chunk' && this.nodeHasChild(from)) {
      return 'That chunk node already has a child.';
    }
    if (to.type === 'root') {
      return 'You cannot link to the root node.';
    }
    if (from.type === 'choice_conditional' && to.type !== 'choice_text') {
      return 'You can only link a Choice Conditional to a Choice Text.';
    }
    if (from.type === 'switch' && to.type !== 'switch_conditional') {
      return 'You can only link a Switch Conditional to a Switch node.';
    }
    if (
      (to.type === 'choice_text' || to.type === 'choice_conditional') &&
      this.getParents(to).length
    ) {
      if (this.getParents(to).length) {
        return 'You can only link to a Choice Text or Choice Conditional without a parent.';
      }
    }
    if (to.type === 'pass_text' || to.type === 'fail_text') {
      return 'You cannot link to Pass or Fail nodes.';
    }
    if (from.type === 'next_file') {
      return 'You cannot link from a Next File node.';
    }

    link = {
      from: from.id,
      to: to.id,
    };
    this.file.links.push(link);
    this.saveFile();
    this.buildDiagram();
  }

  addNode(parent, type, defaultText) {
    let id = utils.random_id(10);
    let parentElem = document.getElementById(parent.id);
    let rect = parentElem.getBoundingClientRect();
    let node = {
      id: id,
      type: type,
      content: defaultText || 'This node currently has no actual content.',
      left: parent.left,
      top: parseInt(parent.top) + (rect.height + 30) + 'px',
    };
    this.file.nodes.push(node);
    let link = {
      to: id,
      from: parent.id,
    };
    this.file.links.push(link);
    this.saveFile();
    this.buildDiagram();
    return node;
  }

  addSwitchNode(parent) {
    let node = this.addNode(parent, 'switch', 'switch');
    let id_default = utils.random_id(10);
    let parent_elem = document.getElementById(parent.id);
    let rect = parent_elem.getBoundingClientRect();
    let node_default = {
      id: id_default,
      type: 'switch_default',
      content: 'default',
      left: parseInt(node.left),
      top: parseInt(parent.top) + (rect.height + 120) + 'px',
    };
    this.file.nodes.push(node_default);
    this.file.links.push({
      to: id_default,
      from: node.id,
    });
    this.saveFile();
    this.buildDiagram();
    return node;
  }

  addPassFailNode(parent) {
    let node = this.addNode(parent, 'pass_fail', 'Math.random() > 0.5 ? true : false;');
    let idPass = utils.random_id(10);
    let idFail = utils.random_id(10);
    let parentElem = document.getElementById(parent.id);
    let rect = parentElem.getBoundingClientRect();
    let nodePass = {
      id: idPass,
      type: 'pass_text',
      content: '',
      left: parseInt(node.left) - 115 + 'px',
      top: parseInt(parent.top) + (rect.height + 90) + 'px',
    };
    let nodeFail = {
      id: idFail,
      type: 'fail_text',
      content: '',
      left: parseInt(node.left) + 115 + 'px',
      top: parseInt(parent.top) + (rect.height + 90) + 'px',
    };
    this.file.nodes.push(nodePass, nodeFail);
    this.file.links.push({
      to: idPass,
      from: node.id,
    });
    this.file.links.push({
      to: idFail,
      from: node.id,
    });
    this.saveFile();
    this.buildDiagram();
    return node;
  }

  deleteLink(from, to) {
    let ind = this.getLinkIndex(from.id, to.id);
    if (to.type === 'pass_text' || from.type === 'pass_fail') {
      return;
    }
    if (ind > -1) {
      dialog.show_confirm('Are you sure you wish to delete this link?', () => {
        this.file.links.splice(ind, 1);
        this.buildDiagram();
      });
    } else {
      console.error(
        'ERROR',
        'no link exists that you just clicked on',
        from,
        to,
        this.file.links
      );
    }
  }

  deleteNode(node) {
    let _delete = node => {
      for (let i in this.file.nodes) {
        if (node === this.file.nodes[i]) {
          this.file.nodes.splice(i, 1);
          break;
        }
      }

      this.file.links = this.file.links.filter(link => {
        if (link.to === node.id || link.from === node.id) {
          return false;
        } else {
          return true;
        }
      });

      this.buildDiagram();
    };

    if (node.type === 'pass_fail' || node.type === 'switch') {
      let children = this.getChildren(node);
      for (let i in children) {
        _delete(children[i]);
      }
      _delete(node);
    } else if (
      node.type === 'pass_text' ||
      node.type === 'fail_text' ||
      node.type === 'switch_default'
    ) {
      let parents = this.getParents(node);
      for (let i in parents) {
        this.deleteNode(parents[i]);
      }
    } else {
      _delete(node);
    }
    this.saveFile();
  }

  getNodeHTML(node) {
    let style = {
      left: node.left || null,
      top: node.top || null,
      width: node.width || null,
      height: node.height || null,
    };
    let style_str = '';
    for (let i in style) {
      if (style[i]) {
        style_str += `${i}:${style[i]}; `;
      }
    }
    let content_style = '';
    if (
      node.type === 'next_file' ||
      node.type === 'pass_fail' ||
      node.type === 'choice_conditional'
    ) {
      content_style = 'style="overflow:hidden;text-overflow:ellipsis"';
    }
    let className = 'item-' + node.type;
    console.log('NODE ID', node.id);
    return (
      `<div class="node ${className}" ` +
      `style="${style_str}" id="${node.id}" ` +
      `onmousedown="on_node_click(${node.id})" ` +
      `onmouseup="on_node_unclick(${node.id})" ` +
      `ondblclick="on_node_dblclick(${node.id})" ` +
      `oncontextmenu="on_node_rclick(${node.id})" ` +
      `>` +
      `<div class="item-content" ${content_style}><span class="no-select">${node.content}</span></div>` +
      `<div class="anchor-to" id="${node.id}_to"></div>` +
      `<div class="anchor-from" id="${node.id}_from"></div>` +
      (node.type === 'root'
        ? ''
        : `<div onclick="on_delete_click(${node.id})" class="item-delete" style="color:red;cursor:pointer;padding:5px;position:absolute;right:0px;top:0px" id="${node.id}_delete"><span class="no-select">X</span></div>`) +
      `</div>`
    );
  }

  render() {
    return React.createElement(
      'div',
      {
        id: 'diagram-area',
        className: 'no-drag movable',
        onMouseDown: ev => {
          this.panning = true;
          this.last_mouse_x = ev.pageX;
          this.last_mouse_y = ev.pageY;
          this.last_offset_x = this.offsetX;
          this.last_offset_y = this.offsetY;
          ev.preventDefault();
        },
        onDragStart: ev => {
          ev.preventDefault();
          return false;
        },
        onDrop: ev => {
          ev.preventDefault();
          return false;
        },
        style: {
          position: 'relative',
          width: '6400px',
          height: '6400px',
        },
      },
      React.createElement(
        'div',
        {
          id: 'diagram-parent',
          onDoubleClick: this.onDiagramDblClick,
          style: {
            width: '100%',
            height: '100%',
          },
        },
        React.createElement('div', {
          id: 'diagram',
          className: 'no-drag',
          style: {
            width: '100%',
            height: '100%',
            backgroundColor: css.colors.BG,
          },
        })
      )
    );
  }
};
