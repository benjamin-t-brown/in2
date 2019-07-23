'use strict';

const $ = require('jquery');
const expose = require('expose');

const utils = require('utils');
const createjs = (window.createjs = require('soundjs').createjs);
const loader = require('../save/assets.loader.js');

const _console_log = (text) => {
	expose.get_state('player-area').add_line(text || '');
};

class KeyCatcher {
	constructor() {
		this.disabled = false;
		this.cb = () => {};

		this.on_keypress = (ev) => {
			if (this.disabled) {
				return;
			}
			this.cb(String.fromCharCode(ev.which));
		};

		window.addEventListener('keydown', this.on_keypress);
	}

	setKeypressEvent(cb) {
		this.cb = cb;
	}

	disable() {
		this.disabled = true;
	}

	enable() {
		this.disabled = false;
	}
}

let disable_next_say_wait = false;
let last_choose_node_id = null;
let last_choose_nodes_selected = [];

class Core {
	constructor() {
		this.catcher = new KeyCatcher();
	}

	init() {
		disable_next_say_wait = false;
		last_choose_node_id = null;
		last_choose_nodes_selected = [];
	}

	centerAtActiveNode() {
		const board = expose.get_state('board');
		board.removeAllExtraClasses();
		const active_node_id = exports.player().get('current_in2_node');
		const active_file_name = exports.player().get('current_in2_file');
		if (active_node_id) {
			expose.get_state('file-browser').loadFileExternal(active_file_name, () => {
				const elem = document.getElementById(active_node_id);
				if (elem) {
					board.centerOnNode(active_node_id);
					$('#' + active_node_id).css('outline', '4px solid green');
				}
			});
		}
	}

	say(text, cb) {
		this.centerAtActiveNode();
		if (typeof text === 'object') {
			if (text.length === 1) {
				_console_log(text);
			} else {
				exports.say(text[0], () => {
					exports.say(text.slice(1), cb);
				});
				return;
			}
		} else {
			if (text.length <= 1) {
				return cb();
			} else {
				_console_log(text);
			}
		}

		if (disable_next_say_wait) {
			setTimeout(() => {
				cb();
			}, 1);
			return;
		}
		_console_log();
		_console_log('&nbsp&nbsp&nbsp&nbsp&nbspPress any key to continue...');
		this.catcher.setKeypressEvent(() => {
			expose.get_state('player-area').remove_line();
			cb();
		});
	}

	choose(text, node_id, choices) {
		this.centerAtActiveNode();
		if (text) {
			_console_log(text);
			_console_log();
		}
		_console_log('---------');
		const actual_choices = choices.filter((choice) => {
			if (choice.condition()) {
				return true;
			} else {
				return false;
			}
		});
		if (last_choose_node_id === node_id) {
			// actual_choices = actual_choices.filter( ( choice ) => {
			// 	return last_choose_nodes_selected.indexOf( choice.text ) === -1;
			// } );
		} else {
			last_choose_node_id = node_id;
			last_choose_nodes_selected = [];
		}
		let ctr = 1;
		actual_choices.forEach((choice) => {
			_console_log('  ' + ctr + '.) ' + choice.text);
			ctr++;
		});
		_console_log('---------');
		this.catcher.setKeypressEvent((key) => {
			const choice = actual_choices[key - 1];
			if (choice) {
				last_choose_nodes_selected.push(choice.text);
				this.catcher.setKeypressEvent(() => {});
				disable_next_say_wait = true;
				choice.cb();
				_console_log();
				disable_next_say_wait = false;
			}
		});
	}

	picture(picture_name) {
		exports._scene.setBackground(picture_name);
		//expose.get_state( 'picture' ).setPicture( picture_name );
	}

	exit() {
		console.log('BYE!');
	}
}

class Player {
	constructor() {
		this.state = {
			inventory: [],
			booleans: {},
			combat: {},
		};
		this.name = 'default';
	}

	init() {
		this.state = {
			inventory: [],
		};
	}

	print() {
		_console_log(this.state);
	}

	get(path) {
		let _helper = (paths, obj) => {
			let k = paths.shift();
			if (!paths.length) {
				return obj[k] === undefined ? null : obj[k];
			}

			let next_obj = obj[k];
			if (next_obj !== undefined) {
				return _helper(paths, next_obj);
			} else {
				return null;
			}
		};

		return _helper(path.split('.'), this.state);
	}

	set(path, val) {
		val = val === undefined ? true : val;
		let _helper = (keys, obj) => {
			let k = keys.shift();
			if (k === undefined) {
				return;
			}
			if (!keys.length) {
				obj[k] = val;
				return;
			}

			if (!obj[k]) {
				obj[k] = {};
			}
			_helper(keys, obj[k]);
		};

		_helper(path.split('.'), this.state);
	}

	setIfUnset(path, val) {
		if (this.get(path) === null) {
			this.set(path, val);
		}
	}

	compare(str1, str2, key1, key2) {
		let a = this.get(key1);
		let b = this.get(key2);
		let ret = (a === str1 && b === str2) || (a === str2 && b === str1);
		return ret;
	}

	hasItem(name) {
		return this.state.inventory.indexOf(name) > -1;
	}
	addItem(name) {
		if (name) {
			this.state.inventory.push(name);
		}
	}
	removeItem(name) {
		const ind = this.state.inventory.indexOf(name);
		if (ind > -1) {
			this.state.inventory.splice(ind, 1);
		}
	}
}

class Transition {
	constructor(frames, fade_in, cb) {
		this.frame = 0;
		this.max_frame = frames;
		this.opacity = 1;
		this.fade_in = fade_in;
		this.cb = cb;
	}

	update() {
		if (this.fade_in) {
			this.opacity = this.frame / this.max_frame + 0.1;
		} else {
			this.opacity = 1 - this.frame / this.max_frame + 0.1;
		}
		this.frame++;
	}

	isDone() {
		return this.frame >= this.max_frame;
	}

	apply(ctx) {
		ctx.globalAlpha = this.opacity;
	}

	unapply(ctx) {
		ctx.globalAlpha = 1.0;
	}
}

class Animation {
	constructor(name, loop) {
		this.name = name;
		this.loop = loop || false;
		this.sprites = [];

		this.current_frame = 0;
		this.current_max_frames = 0;
		this.current_sprite_index = 0;
	}

	addSprite(name, nframes) {
		this.sprites.push({
			max_frames: nframes,
			name: name,
		});
		if (this.sprites.length === 1) {
			this.current_max_frames = nframes;
		}
	}

	update() {
		this.current_frame++;
		if (this.current_frame >= this.current_max_frames) {
			this.current_sprite_index++;
			if (this.current_sprite_index >= this.sprites.length) {
				if (this.loop) {
					this.current_sprite_index = 0;
				} else {
					this.current_sprite_index--;
				}
			}
			this.current_frame = 0;
			this.current_max_frames = this.sprites[this.current_sprite_index].max_frames;
		}
	}

	getSprite() {
		return this.sprites[this.current_sprite_index].name;
	}
}

class Sprite {
	constructor(img_name, clip_x, clip_y, clip_w, clip_h) {
		this.img = img_name;
		this.clip_x = clip_x;
		this.clip_y = clip_y;
		this.clip_w = clip_w;
		this.clip_h = clip_h;
	}
}

class Scene {
	constructor() {
		this.running = false;
		this.fps = 30;
		this.actors = {};
		this.actor_list = [];
		this.pictures = {};
		this.sprites = {};
		this.animations = {};
		this.sounds = {};
		this.canvas_id = '';
		this.canvas = null;
		this.ctx = null;
		this.ctr = 0;
		this.is_sound_enabled = true;

		createjs.Sound.alternateExtensions = ['ogg', 'aac'];
	}
	loadSounds(cb) {
		if (!createjs.Sound.initializeDefaultPlugins()) {
			console.error('Could not load sounds.');
			this.is_sound_enabled = false;
			return;
		}
		cb();
	}
	loadSprite(name, pic, x, y, w, h) {
		this.sprites[name] = new Sprite(pic, x, y, w, h);
	}
	playSound(name, fade) {
		if (!this.is_sound_enabled) {
			return;
		}
		const snd = this.sounds[name];
		if (snd) {
			if (fade) {
				let max_volume = 1;
				let ctr = 0;
				let max = 50;
				setTimeout(
					function a() {
						if (ctr >= max) {
							this.setVolume(name, max_volume);
							snd.play();
							return;
						}

						this.setVolume(name, utils.normalize(ctr, 0, max, 0, max_volume));

						ctr++;
						setTimeout(a.bind(this), 2000 / max);
					}.bind(this),
					2000 / max,
				);
			}
			this.setVolume(name, 1);
			snd.play();
		} else {
			console.error('No sound is named', name);
		}
	}
	stopSound(name, fade) {
		if (!name) {
			for (let i in this.sounds) {
				this.sounds[i].stop();
			}
			return;
		}

		if (!this.is_sound_enabled) {
			return;
		}
		const snd = this.sounds[name];
		if (this.sounds[name]) {
			if (fade) {
				let max_volume = 1;
				let ctr = 0;
				let max = 50;
				setTimeout(
					function a() {
						if (ctr >= max) {
							snd.stop();
							return;
						}

						this.setVolume(name, max_volume - utils.normalize(ctr, 0, max, 0, max_volume));

						ctr++;
						setTimeout(a.bind(this), 2000 / max);
					}.bind(this),
					2000 / max,
				);
			} else {
				snd.stop();
			}
		} else {
			console.error('No sound is named', name);
		}
	}
	setVolume(name, v) {
		if (!this.is_sound_enabled) {
			return;
		}
		const snd = this.sounds[name];
		if (snd) {
			//snd.pause();
			snd.volume = v;
			//snd.play();
		}
	}
	loadPicture(name, url, cb, anim) {
		if (this.pictures[name]) {
			return;
		}
		this.num_loading++;
		const img = new Image();
		this.pictures[name] = false;
		img.onload = () => {
			this.num_loaded++;
			this.pictures[name] = img;
			this.sprites[name] = new Sprite(name, 0, 0, img.width, img.height);
			if (anim) {
				this.createAnimationFromPicture(name);
			}
			cb(name);
		};
		img.src = url;
	}
	createAnimation(name, cb) {
		this.animations[name] = cb;
	}
	createAnimationFromPicture(name) {
		this.createAnimation(name, () => {
			let a = new Animation(name, false);
			a.addSprite(name, 1);
			return a;
		});
	}
	loadAnimations() {}
	isLoaded() {
		for (let i in this.pictures) {
			if (this.pictures[i] === false) {
				return false;
			}
		}
		return !!(Object.keys(this.pictures).length && Object.keys(this.sounds).length);
	}
	load(canvas_id, cb) {
		this.stopSound();
		if (canvas_id) {
			if (this.isLoaded()) {
				cb();
				return;
			}

			this.canvas = document.getElementById(canvas_id);
			this.ctx = this.canvas.getContext('2d');
			this.drawLoading();

			this.loadSounds(() => {
				console.log('Sounds loaded.');
				loader.load(() => {
					if (this.isLoaded()) {
						console.log('Done loading!');
						this.loop();
						cb();
					}
				});
			});
			this.loadAnimations();
		} else {
			cb();
		}
	}

	drawSprite(sprite_name, x, y) {
		let s = this.sprites[sprite_name];
		if (s) {
			if (s !== true) {
				let img = this.pictures[s.img];
				if (img) {
					this.ctx.drawImage(img, s.clip_x, s.clip_y, s.clip_w, s.clip_h, x, y, s.clip_w, s.clip_h);
				} else {
					console.warn('no image named', s.img, exports.picture);
				}
			}
		} else {
			this.running = false;
			console.error('no sprite named', sprite_name, this.sprites);
		}
	}

	drawLoading() {
		if (this.ctx) {
			this.ctx.fillStyle = 'black';
			this.ctx.fillRect(0, 0, 400, 400);
			this.ctx.fillStyle = 'red';
			//this.ctx.textAlign = 'center';
			this.ctx.font = '30px Arial';
			this.ctx.fillText('LOADING...', 10, 50);
		}
	}

	loop() {
		if (!this.isLoaded()) {
			this.drawLoading();
		} else {
			this.running = true;
			for (let i in this.actor_list) {
				let act = this.actor_list[i];
				let spr = act.anim.getSprite();
				let t = act.transition;
				if (t) {
					t.update();
					t.apply(this.ctx);
				}
				this.drawSprite(spr, act.x, act.y);
				if (t) {
					t.unapply(this.ctx);
					if (t.isDone()) {
						act.transition = null;
						t.cb();
					}
				}
				act.anim.update();
			}

			if (this.credits) {
				this.ctx.fillStyle = 'orange';
				//this.ctx.textAlign = 'center';
				this.ctx.font = '24px monospace';
				this.ctx.fillText('Written by Benjamin Brown', 36, 120);
			}
		}

		if (this.running) {
			setTimeout(() => {
				exports._scene.loop();
			}, 1000 / this.fps);
		}
	}
	addActor(name, x, y, anim) {
		this.actors[name] = {
			name: name,
			x: x,
			y: y,
			anim: this.animations.default(),
			anim_name: anim || 'invisible',
			orig_anim_name: anim || 'invisible',
			base_x: 0,
			base_y: 0,
			base_anim_name: 'invisible',
		};
		this.actor_list.push(this.actors[name]);
		if (anim) {
			this.setAnimation(name, anim, false);
		}
	}
	clearActors() {
		this.actors = {};
		this.actor_list = [];
	}
	setActorBase(name, x, y, anim) {
		let act = this.actors[name];
		if (!act) {
			console.error('Cannot set actor base, No actor exists named:', name);
			this.running = false;
		} else {
			act.base_x = x;
			act.base_y = y;
			act.base_anim_name = anim;
		}
	}
	restoreActorBase(name) {
		let act = this.actors[name];
		if (!act) {
			console.error('Cannot restore actor base, No actor exists named:', name);
			this.running = false;
		} else {
			act.x = act.base_x;
			act.y = act.base_y;
			this.setAnimation(name, act.base_anim_name);
		}
	}
	setActor(name, x, y) {
		let act = this.actors[name];
		if (!act) {
			console.error('Cannot set actor, No actor exists named:', name);
			this.running = false;
		} else {
			act.x = x;
			act.y = y;
		}
	}
	setAnimation(name, anim, fade) {
		let a = this.animations[anim];
		let act = this.actors[name];
		if (a) {
			if (act) {
				if (fade) {
					act.anim_name = anim;
					act.transition = new Transition(5, false, () => {
						act.anim = a();
						act.transition = new Transition(5, true, () => {});
					});
				} else {
					act.anim = a();
					act.transition = null;
					act.anim_name = anim;
				}
			} else {
				console.error('Cannot set animation, No actor exists named:', name);
				this.running = false;
			}
		} else {
			console.error('Cannot set animation, No animation exists named:', anim, this.animations);
			this.running = false;
		}
	}

	fadeOutActors(list) {
		list.forEach((act_name) => {
			let act = this.actors[act_name];
			if (act) {
				act.orig_anim_name = act.anim_name;
			}
			this.setAnimation(act_name, 'invisible', true);
		});
	}
	fadeInActors(list) {
		list.forEach((act_name) => {
			let act = this.actors[act_name];
			if (act) {
				this.setAnimation(act_name, act.orig_anim_name, true);
			} else {
				console.error('Cannot fade in actor "', act, '" does not exist');
			}
		});
	}

	startConversation(black_bar_actor, black_bar_name, actors) {
		this.conversation_black_bar_actor = black_bar_actor;
		this.conversation_actors = actors;
		this.conv_act1_x = 0;
		this.conv_act2_x = 0;

		this.setAnimation(black_bar_actor, black_bar_name, true);
		let act1 = actors[0];
		if (act1) {
			this.conv_act1_x = 225;
			if (black_bar_name.indexOf('left') > -1) {
				this.conv_act1_x = -10;
			}
			this.setAnimation(act1.name, act1.anim, true);
			this.setActor(act1.name, this.conv_act1_x, 200);
		}

		let act2 = actors[1];
		if (act2) {
			this.conv_act2_x = -30;
			if (black_bar_name.indexOf('left') > -1) {
				this.conv_act2_x = -10;
			}
			this.setAnimation(act2.name, act2.anim, true);
			this.setActor(act2.name, this.conv_act2_x, 200);
		}

		if (!act2) {
			this.conv_act1_x = 100;
			if (black_bar_name.indexOf('left') > -1) {
				this.conv_act1_x = -10;
			}
			this.setActor(act1.name, this.conv_act1_x, 200);
		}
	}
	endConversation() {
		this.setAnimation(this.conversation_black_bar_actor, 'invisible', true);
		let actors = this.conversation_actors;
		let act1 = actors[0];
		if (act1) {
			this.setAnimation(act1.name, 'invisible', true);
		}

		let act2 = actors[1];
		if (act2) {
			this.setAnimation(act2.name, 'invisible', true);
		}
	}
	setConv(actor_name, anim) {
		let actors = this.conversation_actors;
		let act1 = actors[0];
		let act2 = actors[1];
		if (actors.length > 1) {
			if (act1.name === actor_name) {
				this.setAnimation(act1.name, anim || act1.anim, false);
				this.setAnimation(act2.name, act2.anim, false);
				this.setActor(act1.name, this.conv_act1_x - 25, 200);
				this.setActor(act2.name, this.conv_act2_x, 220);
			} else if (act2.name === actor_name) {
				this.setAnimation(act1.name, act1.anim, false);
				this.setAnimation(act2.name, anim || act2.anim, false);
				this.setActor(act1.name, this.conv_act1_x, 220);
				this.setActor(act2.name, this.conv_act2_x + 25, 200);
			} else {
				this.setAnimation(act1.name, act1.anim, false);
				this.setAnimation(act2.name, act2.anim, false);
				this.setActor(act1.name, this.conv_act1_x, 200);
				this.setActor(act2.name, this.conv_act2_x, 200);
			}
		} else {
			this.setAnimation(act1.name, anim || act1.anim, false);
			this.setActor(act1.name, this.conv_act1_x, 200);
		}
	}
}

exports._core = new Core();
exports._player = new Player();
exports._scene = new Scene();

window.scene = exports._scene;
window.player = exports._player;
window.core = exports._core;

exports.init = function(canvas_id, cb) {
	exports._core.init();
	exports._core.catcher.enable();
	exports._player.init();
	exports._scene.load(canvas_id, cb);
	if (!exports._scene.running) {
		exports._scene.loop();
	}
};

exports.core = function() {
	return exports._core;
};

exports.player = function() {
	return exports._player;
};

exports.disable = function() {
	exports._core.catcher.disable();
	exports._scene.stopSound();
};

exports.enable = function() {
	exports._core.catcher.enable();
};

exports.scene = function() {
	return exports._scene;
};

exports.init('', function() {});
