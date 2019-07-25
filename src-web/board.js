import React, { createRef } from 'react';
import injectSheet from 'react-jss';
import expose from 'expose';
import utils from 'utils';
import context from 'context';
import dialog from 'dialog';
import css from 'css';
const $ = (window.$ = require('jquery'));
const jsPlumb = window.jsPlumb;

const BOARD_SIZE_PIXELS = 6400;

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

class Board extends expose.Component {
  constructor(props) {
    super(props);
    const state = {};

    this.diagramContainer = createRef();
    this.diagramParent = createRef();
    this.diagram = createRef();

    this.plumb = null;
    this.file = props.file;
    this.panning = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.lastOffsetX = 0;
    this.lastOffsetY = 0;
    this.linkNode = null;
    this.dragSet = [];
    this.zoom = 1;
    this.maxZoom = 1;
    this.minZoom = 0.2;

    this.onKeydown = ev => {
      if (this.linkNode && ev.keyCode === 27) {
        this.exitLinkMode();
      } else if (this.dragSet.length && ev.keyCode === 27) {
        this.dragSet = [];
        this.plumb.clearDragSelection();
      }
    };

    this.onMouseDown = ev => {
      if (dialog.is_visible() || ev.which === 3) {
        return;
      }
      this.panning = true;
      this.lastOffsetX = this.offsetX;
      this.lastOffsetY = this.offsetY;
      this.lastMouseX = ev.clientX;
      this.lastMouseY = ev.clientY;
    };

    this.onMouseMove = ev => {
      if (this.panning) {
        this.offsetX =
          this.lastOffsetX + (this.lastMouseX - ev.clientX) * (1 / this.zoom);
        this.offsetY =
          this.lastOffsetY + (this.lastMouseY - ev.clientY) * (1 / this.zoom);
        this.renderAtOffset();
      }
    };

    this.onMouseUp = () => {
      this.panning = false;
    };

    this.onScroll = ev => {
      const { offsetX, offsetY, scale } = utils.zoomWithFocalAndDelta({
        parentElem: this.diagramContainer.current,
        deltaY: ev.deltaY,
        scale: this.zoom,
        areaWidth: BOARD_SIZE_PIXELS,
        areaHeight: BOARD_SIZE_PIXELS,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        focalX: ev.clientX,
        focalY: ev.clientY,
        maxZoom: this.maxZoom,
        minZoom: this.minZoom,
      });

      this.zoom = scale;
      this.offsetX = offsetX;
      this.offsetY = offsetY;

      utils.renderAt({
        elem: this.diagramParent.current,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        scale: this.zoom,
        offsetWithScale: true,
      });

      this.getPlumb().setZoom(this.zoom);
    };

    this.onDiagramDblClick = () => {};

    this.onNodeClick = window.on_node_click = elem => {
      let file_node = this.getNode(elem.id);
      if (this.linkNode) {
        let err = this.addLink(this.linkNode, file_node);
        if (err) {
          console.error('Error', 'Cannot create link', err);
          dialog.show_notification('Cannot create link. ' + err);
        }
        this.exitLinkMode();
      } else if (utils.is_shift() || utils.is_ctrl()) {
        let ind = this.dragSet.indexOf(file_node.id);
        if (ind === -1) {
          this.plumb.addToDragSelection(file_node.id);
          this.dragSet.push(file_node.id);
        } else {
          this.plumb.removeFromDragSelection(file_node.id);
          this.dragSet.splice(ind, 1);
        }
      }
    };

    this.onNodeUnclick = window.on_node_unclick = elem => {
      let file_node = this.getNode(elem.id);
      //$('#diagram-parent').panzoom('enable');
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
        if (this.dragSet.includes(elem.id)) {
          this.dragSet.forEach(id => {
            if (id !== elem.id) {
              const node = this.getNode(id);
              if (node.type !== 'root') {
                this.deleteNode(node);
              }
            }
          });
          this.dragSet = [];
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
      const nodes = this.dragSet.map(id => {
        const node = this.getNode(id);
        const new_node = Object.assign({}, node);
        new_node.id = utils.random_id(10);
        node_mapping[node.id] = new_node.id;
        return new_node;
      });
      this.dragSet.forEach(id => {
        const children = this.getChildren(this.getNode(id));
        children.forEach(child => {
          if (this.dragSet.includes(child.id)) {
            links.push({
              from: node_mapping[id],
              to: node_mapping[child.id],
            });
          }
        });
      });
      this.copySet = { nodes, links };
    };
    state.copySelection = this.copySelection;

    this.pasteSelection = () => {
      if (this.copySet) {
        let rootInd = -1;

        const newLinks = JSON.parse(JSON.stringify(this.copySet.links));
        const newNodes = this.copySet.nodes.map((node, i) => {
          const newId = utils.random_id(10);
          const newNode = Object.assign({}, node);
          newLinks.forEach(link => {
            if (link.to === node.id) {
              link.to = newId;
            }
            if (link.from === node.id) {
              link.from = newId;
            }
          });
          newNode.id = newId;
          newNode.left = parseInt(node.left) + 25 + 'px';
          newNode.top = parseInt(node.top) + 25 + 'px';
          if (newNode.type === 'root') {
            rootInd = i;
          }
          return newNode;
        });

        if (rootInd > -1) {
          const newRoot = newNodes.splice(rootInd, 1)[0];
          const oldRoot = this.file.nodes[0];
          oldRoot.content = newRoot.content;
          newLinks.forEach(link => {
            if (link.from === newRoot.id) {
              link.from = oldRoot.id;
            }
          });
        }

        newNodes.forEach(node => {
          this.file.nodes.push(node);
        });
        newLinks.forEach(link => {
          this.file.links.push(link);
        });
        this.dragSet = [];
        this.plumb.clearDragSelection();
        this.buildDiagram();
        newNodes.forEach(node => {
          this.plumb.addToDragSelection(node.id);
          this.dragSet.push(node.id);
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
    this.plumb.empty(this.diagram.current);
    jsPlumb.ready(() => {
      this.buildDiagram();
      this.renderAtOffset();
    });
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
    const file = this.file;
    if (file) {
      const html = file.nodes.reduce((prev, curr) => {
        return prev + this.getNodeHTML(curr);
      }, '');
      this.plumb && this.plumb.reset();
      window.plumb = this.plumb = jsPlumb.getInstance({
        PaintStyle: { strokeWidth: 1 },
        Anchors: [['TopRight']],
        Container: this.diagram.current,
      });
      const diagram = this.diagram.current;
      diagram.innerHTML = html;
      this.plumb.draggable(
        file.nodes.map(node => {
          return node.id;
        }),
        {
          containment: true,
        }
      );
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
      this.linkNode = parent;
      this.diagramArea.current.class =
        'no-drag linking ' + this.props.classes.diagramArea;
    }, 150);
  }
  exitLinkMode() {
    this.linkNode = false;
    this.diagramArea.current.class = 'no-drag movable ' + this.props.classes.diagramArea;
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

  renderAtOffset() {
    utils.renderAt({
      elem: this.diagramParent.current,
      scale: this.zoom,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <div
        id="diagram-area"
        className={'no-drag movable ' + classes.diagramArea}
        ref={this.diagramContainer}
        onMouseDown={ev => {
          ev.preventDefault();
        }}
        onDragStart={ev => {
          ev.preventDefault();
          return false;
        }}
        onDrop={ev => {
          ev.preventDefault();
          return false;
        }}
      >
        <div
          id="diagram-parent"
          ref={this.diagramParent}
          className={classes.diagramParent}
        >
          <div id="diagram" ref={this.diagram} className={'no-drag ' + classes.diagram} />
        </div>
      </div>
    );
  }
}

const styles = theme => ({
  diagramArea: {
    position: 'relative',
    width: BOARD_SIZE_PIXELS + 'px',
    height: BOARD_SIZE_PIXELS + 'px',
  },
  diagramParent: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
  diagram: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: theme.colors.BG,
  },
});

export default injectSheet(styles)(Board);
