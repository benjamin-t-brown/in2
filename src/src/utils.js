'use strict';

const React = require('react');

let mouse_x = 0;
let mouse_y = 0;
let shift = false;
let ctrl = false;
let on_copy = function() {};
let on_paste = function() {};

window.addEventListener('mousemove', (ev) => {
	mouse_x = ev.clientX;
	mouse_y = ev.clientY;
});

window.addEventListener('keydown', (ev) => {
	if (ev.keyCode === 17) {
		ctrl = true;
	} else if (ev.keyCode === 16) {
		shift = true;
	} else if (ev.keyCode === 67 && ctrl) {
		on_copy();
	} else if (ev.keyCode === 86 && ctrl) {
		on_paste();
	}
});

window.addEventListener('keyup', (ev) => {
	if (ev.keyCode === 17) {
		ctrl = false;
	} else if (ev.keyCode === 16) {
		shift = false;
	}
});

module.exports = {
	getCurrentTime: function() {
		return +new Date();
	},
	set_on_copy: function(cb) {
		on_copy = cb;
	},
	set_on_paste: function(cb) {
		on_paste = cb;
	},
	random_id: function(len) {
		var text = '';
		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghigklmnopqrstufwxyz';
		for (var i = 0; i < len; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	},
	normalize: function(x, A, B, C, D) {
		return C + ((x - A) * (D - C)) / (B - A);
	},
	get_random_value_from_array: function(arr) {
		var ind = Math.floor(module.exports.normalize(Math.random(), 0, 1, 0, arr.length));
		return arr[ind];
	},
	inArr: function(x, arr) {
		for (var i in arr) {
			if (x == arr[i]) { //eslint-disable-line eqeqeq
				return true;
			}
		}
		return false;
	},
	in_rectangle: function(x, y, rx, ry, rw, rh) {
		return x >= rx && x <= rx + rw && (y >= ry && ry <= rx + rh);
	},
	to_ratio: function(useconds) {
		return useconds / 1000000;
	},
	to_micro_seconds: function(ms) {
		return Math.round(ms * 1000);
	},
	to_radians: function(degrees) {
		return (degrees / 180.0) * Math.PI;
	},
	to_degrees: function(radians) {
		return (radians * 180.0) / Math.PI;
	},
	hex_to_array: function(hex) {
		return [hex.substring(1, 3), hex.substring(3, 5), hex.substring(5, 7), hex.substring(7, 9)].map(function(_color, i) {
			var color = parseInt(_color, 16);
			if (i === 3) {
				color = isNaN(color) ? 1 : color / 255;
			}
			return color;
		});
	},
	hex_to_RGBA: function(hex) {
		var arr = this.hex_to_array(hex);
		return 'rgba(' + arr.join(',') + ')';
	},
	array_to_hex: function(arr) {
		if (!Array.instanceOf(arr)) {
			return undefined;
		}
		var _convert = function(c, i) {
			if (i === 3) {
				c = Math.round(c * 255);
			}
			var hex = Number(c).toString(16);
			return hex.length < 2 ? '0' + hex : hex;
		};
		return '#' + arr.map(_convert).join('');
	},
	rgb_to_hex: function(rgb, g, b) {
		var _digit = function(d) {
			d = parseInt(d).toString(16);
			while (d.length < 2) {
				d = '0' + d;
			}
			return d;
		};
		if (arguments.length === 1) {
			var m = rgb.match(/rgba\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/);
			if (!m) {
				console.log('Unparsable color:', rgb);
			} else {
				return (
					'#' +
					m
						.slice(1, 4)
						.map(_digit)
						.join('')
				);
			}
		} else if (arguments.length === 3) {
			return '#' + _digit(rgb) + _digit(g) + _digit(b);
		} else {
			return '#000000';
		}
	},
	get_mouse_pos() {
		return {
			x: mouse_x,
			y: mouse_y,
		};
	},
	is_shift() {
		return shift;
	},
	is_ctrl() {
		return ctrl;
	},
	get: function(url, cb) {
		var opts = {
			method: 'GET',
			headers: {},
		};
		var initial_time = +new Date();
		fetch(url, opts)
			.then(function(response) {
				response.json().then(function(d) {
					if (d.err) {
						console.error('Internal Server Error', d.err, url);
					} else {
						cb(d, +new Date() - initial_time);
					}
				});
			})
			.catch((err) => {
				console.error('Fetch GET Error', err, url);
			});
	},
	del: function(url, cb) {
		var opts = {
			method: 'DELETE',
			headers: {},
		};
		var initial_time = +new Date();
		fetch(url, opts)
			.then(function(response) {
				response.json().then(function(d) {
					if (d.err) {
						console.error('Internal Server Error', d.err, url);
					} else {
						cb(d, +new Date() - initial_time);
					}
				});
			})
			.catch((err) => {
				console.error('Fetch DEL Error', err, url);
			});
	},
	post: function(url, data, cb) {
		var opts = {
			method: 'POST',
			body: JSON.stringify(data),
			headers: {},
		};
		var initial_time = +new Date();
		fetch(url, opts)
			.then(function(response) {
				response.json().then(function(d) {
					if (d.err) {
						console.error('Internal Server Error', d.err, url);
					} else {
						cb(d, +new Date() - initial_time);
					}
				});
			})
			.catch((err) => {
				console.error('Fetch POST Error', err, url);
			});
	},
};

window.utils = module.exports;
