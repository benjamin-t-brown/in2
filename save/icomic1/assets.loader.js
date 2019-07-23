'use strict';

const { scene } = require('engine');
const createjs = window.createjs = require( 'soundjs' ).createjs;

const exp = {};

exp.load = function(cb) {
	exp.loadAnimations();
	exp.loadPictures(() => {
		exp.loadSounds(cb);
	});
};

exp.loadAnimations = function() {
	scene.createAnimation('conscience_bg', () => {
		let a = new Animation('conscience_bg', true);
		a.addSprite('Conscience_bg1', 10);
		a.addSprite('Conscience_bg2', 10);
		a.addSprite('Conscience_bg3', 10);
		a.addSprite('Conscience_bg4', 10);
		a.addSprite('Conscience_bg5', 10);
		return a;
	});

	scene.createAnimation('Conscience_entrance', () => {
		let a = new Animation('Conscience_entrance', false);
		a.addSprite('Conscience_entrance1', 4);
		a.addSprite('Conscience_entrance2', 4);
		a.addSprite('Conscience_entrance3', 4);
		a.addSprite('Conscience_entrance4', 4);
		a.addSprite('Conscience_entrance5', 4);
		a.addSprite('Conscience_entrance6', 4);
		return a;
	});

	scene.createAnimation('Ada_actor_idle1', () => {
		let a = new Animation('Ada_actor_idle1', true);
		a.addSprite('Ada_actor_idle1_1', 30 * 1);
		a.addSprite('Ada_actor_idle1_2', 4);
		a.addSprite('Ada_actor_idle1_3', 4);
		a.addSprite('Ada_actor_idle1_4', 30 * 1);
		a.addSprite('Ada_actor_idle1_5', 6);
		return a;
	});

	scene.createAnimation('Ada_actor_idle2', () => {
		let a = new Animation('Ada_actor_idle2', true);
		a.addSprite('Ada_actor_idle2_1', 30 * 1);
		a.addSprite('Ada_actor_idle2_2', 4);
		a.addSprite('Ada_actor_idle2_3', 30 * 1);
		a.addSprite('Ada_actor_idle2_2', 4);
		return a;
	});

	scene.createAnimation('Ada_actor_idle3', () => {
		let a = new Animation('Ada_actor_idle3', true);
		a.addSprite('Ada_actor_idle3_1', 30 * 4);
		a.addSprite('Ada_actor_idle3_2', 4);
		a.addSprite('Ada_actor_idle3_3', 4);
		a.addSprite('Ada_actor_idle3_4', 4);
		a.addSprite('Ada_actor_idle3_5', 4);
		a.addSprite('Ada_actor_idle3_4', 4);
		a.addSprite('Ada_actor_idle3_5', 4);
		a.addSprite('Ada_actor_idle3_4', 4);
		a.addSprite('Ada_actor_idle3_5', 4);
		a.addSprite('Ada_actor_idle3_4', 4);
		a.addSprite('Ada_actor_idle3_3', 4);
		a.addSprite('Ada_actor_idle3_2', 4);
		return a;
	});

	scene.createAnimation('Ada_moving_chair', () => {
		let a = new Animation('Ada_moving_chair', false);
		for (let i = 0; i < 23; i++) {
			a.addSprite('Ada_moving_chair_' + (i + 1), 4);
		}
		return a;
	});

	scene.createAnimation('Ada_moving_chair2', () => {
		let a = new Animation('Ada_moving_chair2', false);
		for (let i = 0; i < 23; i++) {
			a.addSprite('Ada_moving_chair2_' + (i + 1), 4);
		}
		return a;
	});

	scene.createAnimation('Jonathan_actor_idle1', () => {
		let a = new Animation('Jonathan_actor_idle1', true);
		a.addSprite('Jonathan_actor_idle1_1', 30 * 2);
		a.addSprite('Jonathan_actor_idle1_2', 4);
		a.addSprite('Jonathan_actor_idle1_3', 4);
		a.addSprite('Jonathan_actor_idle1_4', 4);
		a.addSprite('Jonathan_actor_idle1_3', 4);
		a.addSprite('Jonathan_actor_idle1_4', 4);
		a.addSprite('Jonathan_actor_idle1_3', 4);
		a.addSprite('Jonathan_actor_idle1_4', 4);
		a.addSprite('Jonathan_actor_idle1_3', 4);
		a.addSprite('Jonathan_actor_idle1_2', 4);
		return a;
	});

	scene.createAnimation('Ralgo_actor_idle1', () => {
		let a = new Animation('Ralgo_actor_idle1', true);
		a.addSprite('Ralgo_actor_idle1_1', 45);
		a.addSprite('Ralgo_actor_idle1_2', 4);
		a.addSprite('Ralgo_actor_idle1_1', 4);
		a.addSprite('Ralgo_actor_idle1_2', 4);
		a.addSprite('Ralgo_actor_idle1_1', 4);
		a.addSprite('Ralgo_actor_idle1_2', 4);
		return a;
	});

	scene.createAnimation('Girls_actor_talking', () => {
		let a = new Animation('Girls_actor_talking', true);
		a.addSprite('Girls_talking_1', 4);
		a.addSprite('Girls_talking_2', 4);
		a.addSprite('Girls_talking_3', 4);
		a.addSprite('Girls_talking_4', 8);
		a.addSprite('Girls_talking_3', 4);
		a.addSprite('Girls_talking_2', 4);
		a.addSprite('Girls_talking_1', 4);
		a.addSprite('Girls_talking_5', 4);
		a.addSprite('Girls_talking_6', 4);
		a.addSprite('Girls_talking_7', 4);
		a.addSprite('Girls_talking_8', 4);
		a.addSprite('Girls_talking_5', 4);
		a.addSprite('Girls_talking_6', 4);
		return a;
	});

	scene.createAnimation('Bwow', () => {
		let a = new Animation('Bwow', true);
		a.addSprite('BWOW1_1', 2);
		a.addSprite('BWOW1_2', 2);
		a.addSprite('BWOW1_3', 2);
		a.addSprite('BWOW1_4', 2);
		a.addSprite('BWOW1_5', 2);
		a.addSprite('BWOW1_6', 2);
		a.addSprite('BWOW1_7', 3);
		a.addSprite('BWOW1_8', 3);
		a.addSprite('BWOW2_1', 2);
		a.addSprite('BWOW2_2', 2);
		a.addSprite('BWOW2_3', 2);
		a.addSprite('BWOW2_4', 2);
		a.addSprite('BWOW2_5', 2);
		a.addSprite('BWOW2_6', 3);
		a.addSprite('BWOW2_7', 3);
		a.addSprite('BWOW2_8', 3);
		return a;
	});

	scene.createAnimation('Clock', () => {
		let a = new Animation('Clock', true);
		a.addSprite('clock1', 30);
		a.addSprite('clock2', 30);
		a.addSprite('clock3', 30);
		a.addSprite('clock4', 30);
		a.addSprite('clock5', 30);
		a.addSprite('clock6', 30);
		a.addSprite('clock7', 30);
		a.addSprite('clock8', 30);
		a.addSprite('clock9', 30);
		a.addSprite('clock10', 30);
		a.addSprite('clock11', 30);
		a.addSprite('clock12', 30);
		a.addSprite('clock13', 30);
		a.addSprite('clock14', 30);
		a.addSprite('clock15', 30);
		return a;
	});

	scene.createAnimation('Otis_sleeping', () => {
		let a = new Animation('Otis_sleeping', true);
		a.addSprite('Otis_sleeping1', 30 * 1);
		a.addSprite('Otis_sleeping2', 4);
		a.addSprite('Otis_sleeping3', 30 * 1);
		a.addSprite('Otis_sleeping2', 4);
		return a;
	});

	scene.createAnimation('AVCloset_door', () => {
		let a = new Animation('AVCloset_door', false);
		a.addSprite('AVCloset_door_closed', 15);
		a.addSprite('AVCloset_door_open', 30);
		return a;
	});

	scene.createAnimation('Classroom3_shelf_books', () => {
		let a = new Animation('Classroom3_shelf_books', true);
		a.addSprite('Classroom3_shelf_books_1', 30);
		a.addSprite('Classroom3_shelf_books_2', 7);
		a.addSprite('Classroom3_shelf_books_3', 30);
		a.addSprite('Classroom3_shelf_books_2', 7);
		return a;
	});

	scene.createAnimation('Ada_actor_pull_book', () => {
		let a = new Animation('Ada_actor_pull_book', false);
		for (let i = 0; i < 10; i++) {
			a.addSprite('Ada_actor_pull_book_' + (i + 1), 4);
		}
		return a;
	});

	scene.createAnimation('Open_Window', () => {
		let a = new Animation('Open_Window', false);
		a.addSprite('invisible', 15);
		a.addSprite('Blue', 30);
		return a;
	});
};

exp.loadPictures = function(cb) {
	let on_pic = (p) => {
		console.log('Loaded picture:', p);
		if (scene.isLoaded()) {
			cb();
		}
	};

	scene.loadPicture('invisible', 'assets/img/Comic1/invisible.png', on_pic, true);
	scene.loadPicture('default', 'assets/img/Comic1/default.png', on_pic, true);
	scene.loadPicture('default-bg', 'assets/img/Comic1/default-bg.png', on_pic);
	scene.loadPicture('ConscienceBG', 'assets/img/Comic1/conscience-bg.png', on_pic);

	scene.loadPicture('Conscience_bg1', 'assets/img/Comic1/conscience-bg1.png', on_pic);
	scene.loadPicture('Conscience_bg2', 'assets/img/Comic1/conscience-bg2.png', on_pic);
	scene.loadPicture('Conscience_bg3', 'assets/img/Comic1/conscience-bg3.png', on_pic);
	scene.loadPicture('Conscience_bg4', 'assets/img/Comic1/conscience-bg4.png', on_pic);
	scene.loadPicture('Conscience_bg5', 'assets/img/Comic1/conscience-bg5.png', on_pic);

	scene.loadPicture('Conscience_normal', 'assets/img/Comic1/Conscience_normal.png', on_pic, true);
	scene.loadPicture('Conscience_frowning', 'assets/img/Comic1/Conscience_frowning.png', on_pic, true);
	scene.loadPicture('Conscience_sad', 'assets/img/Comic1/Conscience_sad.png', on_pic, true);
	scene.loadPicture('Conscience_smiling', 'assets/img/Comic1/Conscience_smiling.png', on_pic, true);

	scene.loadPicture('Conscience_entrance', 'assets/img/Comic1/Conscience_entrance.png', on_pic);
	scene.loadSprite('Conscience_entrance1', 'Conscience_entrance', 200 * 0, 0, 200, 200);
	scene.loadSprite('Conscience_entrance2', 'Conscience_entrance', 200 * 1, 0, 200, 200);
	scene.loadSprite('Conscience_entrance3', 'Conscience_entrance', 200 * 2, 0, 200, 200);
	scene.loadSprite('Conscience_entrance4', 'Conscience_entrance', 200 * 3, 0, 200, 200);
	scene.loadSprite('Conscience_entrance5', 'Conscience_entrance', 200 * 4, 0, 200, 200);
	scene.loadSprite('Conscience_entrance6', 'Conscience_entrance', 200 * 5, 0, 200, 200);

	scene.loadPicture('black-bar', 'assets/img/Comic1/black-bar.png', on_pic, true);
	scene.loadPicture('black-bar-left', 'assets/img/Comic1/black-bar-left.png', on_pic, true);
	scene.loadPicture('black-bar-right', 'assets/img/Comic1/black-bar-right.png', on_pic, true);
	scene.loadPicture('black-screen', 'assets/img/Comic1/black-screen.png', on_pic, true);

	scene.loadPicture('Ada_actor_idle1', 'assets/img/Comic1/Ada_actor_idle1.png', on_pic);
	scene.loadSprite('Ada_actor_idle1_1', 'Ada_actor_idle1', 125 * 0, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle1_2', 'Ada_actor_idle1', 125 * 1, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle1_3', 'Ada_actor_idle1', 125 * 2, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle1_4', 'Ada_actor_idle1', 125 * 3, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle1_5', 'Ada_actor_idle1', 125 * 4, 0, 125, 125);

	scene.loadPicture('Ada_actor_idle2', 'assets/img/Comic1/Ada_actor_idle2.png', on_pic);
	scene.loadSprite('Ada_actor_idle2_1', 'Ada_actor_idle2', 300 * 0, 0, 300, 300);
	scene.loadSprite('Ada_actor_idle2_2', 'Ada_actor_idle2', 300 * 1, 0, 300, 300);
	scene.loadSprite('Ada_actor_idle2_3', 'Ada_actor_idle2', 300 * 2, 0, 300, 300);

	scene.loadPicture('Ada_actor_idle3', 'assets/img/Comic1/Ada_actor_idle3.png', on_pic);
	scene.loadSprite('Ada_actor_idle3_1', 'Ada_actor_idle3', 125 * 0, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle3_2', 'Ada_actor_idle3', 125 * 1, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle3_3', 'Ada_actor_idle3', 125 * 2, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle3_4', 'Ada_actor_idle3', 125 * 3, 0, 125, 125);
	scene.loadSprite('Ada_actor_idle3_5', 'Ada_actor_idle3', 125 * 4, 0, 125, 125);

	scene.loadPicture('Ada_moving_chair', 'assets/img/Comic1/Ada_moving_chair.png', on_pic);
	for (let i = 0; i < 23; i++) {
		scene.loadSprite('Ada_moving_chair_' + (i + 1), 'Ada_moving_chair', 400 * i, 0, 400, 200);
	}

	scene.loadPicture('Ada_moving_chair2', 'assets/img/Comic1/Ada_moving_chair2.png', on_pic);
	for (let i = 0; i < 23; i++) {
		scene.loadSprite('Ada_moving_chair2_' + (23 - i), 'Ada_moving_chair2', 400 * i, 0, 400, 200);
	}

	scene.loadPicture('Ada_actor_pull_book', 'assets/img/Comic1/Ada_actor_pull_book.png', on_pic);
	for (let i = 0; i < 10; i++) {
		scene.loadSprite('Ada_actor_pull_book_' + (i + 1), 'Ada_actor_pull_book', 194 * i, 0, 194, 300);
	}

	scene.loadPicture('Jonathan_actor_idle1', 'assets/img/Comic1/Jonathan_actor_idle1.png', on_pic);
	scene.loadSprite('Jonathan_actor_idle1_1', 'Jonathan_actor_idle1', 125 * 0, 0, 125, 125);
	scene.loadSprite('Jonathan_actor_idle1_2', 'Jonathan_actor_idle1', 125 * 1, 0, 125, 125);
	scene.loadSprite('Jonathan_actor_idle1_3', 'Jonathan_actor_idle1', 125 * 2, 0, 125, 125);
	scene.loadSprite('Jonathan_actor_idle1_4', 'Jonathan_actor_idle1', 125 * 3, 0, 125, 125);

	scene.loadPicture('Ralgo_actor_idle1', 'assets/img/Comic1/Ralgo_actor_idle1.png', on_pic);
	scene.loadSprite('Ralgo_actor_idle1_1', 'Ralgo_actor_idle1', 125 * 0, 0, 125, 200);
	scene.loadSprite('Ralgo_actor_idle1_2', 'Ralgo_actor_idle1', 125 * 1, 0, 125, 200);

	scene.loadPicture('Otis_sleeping', 'assets/img/Comic1/Otis_sleeping.png', on_pic);
	scene.loadSprite('Otis_sleeping1', 'Otis_sleeping', 220 * 0, 0, 220, 100);
	scene.loadSprite('Otis_sleeping2', 'Otis_sleeping', 220 * 1, 0, 220, 100);
	scene.loadSprite('Otis_sleeping3', 'Otis_sleeping', 220 * 2, 0, 220, 100);

	scene.loadPicture('Ada_actor_door', 'assets/img/Comic1/Ada_actor_door.png', on_pic, true);
	scene.loadPicture('Ada_actor_struggle1', 'assets/img/Comic1/Ada_actor_struggle1.png', on_pic, true);
	scene.loadPicture('Ada_actor_struggle2', 'assets/img/Comic1/Ada_actor_struggle2.png', on_pic, true);
	scene.loadPicture('Ada_actor_classroom1_right', 'assets/img/Comic1/Ada_actor_classroom1_right.png', on_pic, true);
	scene.loadPicture('Ada_actor_classroom1_up', 'assets/img/Comic1/Ada_actor_classroom1_up.png', on_pic, true);
	scene.loadPicture('Ada_actor_classroom1_left', 'assets/img/Comic1/Ada_actor_classroom1_left.png', on_pic, true);
	scene.loadPicture('Ada_actor_classroom1_leftup', 'assets/img/Comic1/Ada_actor_leftup.png', on_pic, true);
	scene.loadPicture('Ada_actor_avcloset', 'assets/img/Comic1/Ada_actor_avcloset.png', on_pic, true);
	scene.loadPicture('Ada_actor_avcloset2', 'assets/img/Comic1/Ada_actor_avcloset2.png', on_pic, true);
	scene.loadPicture('Ada_actor_reaching', 'assets/img/Comic1/Ada_actor_reaching.png', on_pic, true);

	scene.loadPicture('Jonathan_actor_classroom2_idle', 'assets/img/Comic1/Jonathan_actor_talking.png', on_pic, true);
	scene.loadPicture('Jonathan_actor_lift', 'assets/img/Comic1/John_actor1_lift.png', on_pic, true);
	scene.loadPicture('Jonathan_actor_right', 'assets/img/Comic1/John_actor1_right.png', on_pic, true);
	scene.loadPicture('Jonathan_actor_down', 'assets/img/Comic1/John_actor1.png', on_pic, true);
	scene.loadPicture('Ralgo_actor_classroom2_idle', 'assets/img/Comic1/Ralgo_actor_classroom2_idle.png', on_pic, true);

	scene.loadPicture('clock', 'assets/img/Comic1/clock.png', on_pic);
	scene.loadSprite('clock1', 'clock', 46 * 0, 0, 46, 46);
	scene.loadSprite('clock2', 'clock', 46 * 1, 0, 46, 46);
	scene.loadSprite('clock3', 'clock', 46 * 2, 0, 46, 46);
	scene.loadSprite('clock4', 'clock', 46 * 3, 0, 46, 46);
	scene.loadSprite('clock5', 'clock', 46 * 4, 0, 46, 46);
	scene.loadSprite('clock6', 'clock', 46 * 5, 0, 46, 46);
	scene.loadSprite('clock7', 'clock', 46 * 6, 0, 46, 46);
	scene.loadSprite('clock8', 'clock', 46 * 7, 0, 46, 46);
	scene.loadSprite('clock9', 'clock', 46 * 8, 0, 46, 46);
	scene.loadSprite('clock10', 'clock', 46 * 9, 0, 46, 46);
	scene.loadSprite('clock11', 'clock', 46 * 10, 0, 46, 46);
	scene.loadSprite('clock12', 'clock', 46 * 11, 0, 46, 46);
	scene.loadSprite('clock13', 'clock', 46 * 12, 0, 46, 46);
	scene.loadSprite('clock14', 'clock', 46 * 13, 0, 46, 46);
	scene.loadSprite('clock15', 'clock', 46 * 14, 0, 46, 46);

	scene.loadPicture('BWOW1', 'assets/img/Comic1/bwow1.png', on_pic);
	scene.loadSprite('BWOW1_1', 'BWOW1', 400 * 0, 0, 400, 400);
	scene.loadSprite('BWOW1_2', 'BWOW1', 400 * 1, 0, 400, 400);
	scene.loadSprite('BWOW1_3', 'BWOW1', 400 * 2, 0, 400, 400);
	scene.loadSprite('BWOW1_4', 'BWOW1', 400 * 3, 0, 400, 400);
	scene.loadSprite('BWOW1_5', 'BWOW1', 400 * 4, 0, 400, 400);
	scene.loadSprite('BWOW1_6', 'BWOW1', 400 * 5, 0, 400, 400);
	scene.loadSprite('BWOW1_7', 'BWOW1', 400 * 6, 0, 400, 400);
	scene.loadSprite('BWOW1_8', 'BWOW1', 400 * 7, 0, 400, 400);

	scene.loadPicture('BWOW2', 'assets/img/Comic1/bwow2.png', on_pic);
	scene.loadSprite('BWOW2_1', 'BWOW2', 400 * 0, 0, 400, 400);
	scene.loadSprite('BWOW2_2', 'BWOW2', 400 * 1, 0, 400, 400);
	scene.loadSprite('BWOW2_3', 'BWOW2', 400 * 2, 0, 400, 400);
	scene.loadSprite('BWOW2_4', 'BWOW2', 400 * 3, 0, 400, 400);
	scene.loadSprite('BWOW2_5', 'BWOW2', 400 * 4, 0, 400, 400);
	scene.loadSprite('BWOW2_6', 'BWOW2', 400 * 5, 0, 400, 400);
	scene.loadSprite('BWOW2_7', 'BWOW2', 400 * 6, 0, 400, 400);
	scene.loadSprite('BWOW2_8', 'BWOW2', 400 * 7, 0, 400, 400);

	scene.loadPicture('Classroom3_shelf_books', 'assets/img/Comic1/Classroom3_shelf_books.png', on_pic);
	scene.loadSprite('Classroom3_shelf_books_1', 'Classroom3_shelf_books', 85 * 0, 0, 85, 85);
	scene.loadSprite('Classroom3_shelf_books_2', 'Classroom3_shelf_books', 85 * 1, 0, 85, 85);
	scene.loadSprite('Classroom3_shelf_books_3', 'Classroom3_shelf_books', 85 * 2, 0, 85, 85);

	scene.loadPicture('Girls_talking', 'assets/img/Comic1/Girls_talking.png', on_pic);
	for (let i = 0; i < 8; i++) {
		scene.loadSprite('Girls_talking_' + (i + 1), 'Girls_talking', 150 * i, 0, 150, 150);
	}

	//portraits
	scene.loadPicture('Ada_angry', 'assets/img/Comic1/Ada_angry.png', on_pic, true);
	scene.loadPicture('Ada_annoyed', 'assets/img/Comic1/Ada_annoyed.png', on_pic, true);
	scene.loadPicture('Ada_normal', 'assets/img/Comic1/Ada_normal.png', on_pic, true);
	scene.loadPicture('Ada_normal2', 'assets/img/Comic1/Ada_normal2.png', on_pic, true);
	scene.loadPicture('Ada_talking', 'assets/img/Comic1/Ada_normal2.png', on_pic, true);
	scene.loadPicture('Ada_struggle', 'assets/img/Comic1/Ada_struggle.png', on_pic, true);
	scene.loadPicture('Ada_surprised', 'assets/img/Comic1/Ada_surprised.png', on_pic, true);
	scene.loadPicture('Ada_thoughtful', 'assets/img/Comic1/Ada_thoughtful.png', on_pic, true);
	scene.loadPicture('Ada_worried', 'assets/img/Comic1/Ada_worried.png', on_pic, true);
	scene.loadPicture('Ada_smug', 'assets/img/Comic1/Ada_smug.png', on_pic, true);
	scene.loadPicture('Door_normal', 'assets/img/Comic1/Door_normal.png', on_pic, true);
	scene.loadPicture('Girl1_normal', 'assets/img/Comic1/Girl1_normal.png', on_pic, true);
	scene.loadPicture('Girl1_smelling', 'assets/img/Comic1/Girl1_smelling.png', on_pic, true);
	scene.loadPicture('Mildred', 'assets/img/Comic1/mildred.png', on_pic, true);
	scene.loadPicture('Girls_actor_talking1', 'assets/img/Comic1/Girls_talking1.png', on_pic);
	scene.loadPicture('Girls_actor_talking2', 'assets/img/Comic1/Girls_talking2.png', on_pic);
	scene.loadPicture('Jonathan_normal', 'assets/img/Comic1/Jonathan_normal.png', on_pic, true);
	scene.loadPicture('Jonathan_worried', 'assets/img/Comic1/Jonathan_worried.png', on_pic, true);
	scene.loadPicture('Ralgo_actor_lecturing', 'assets/img/Comic1/Ralgo_actor_lecturing.png', on_pic, true);
	scene.loadPicture('Ralgo_bored', 'assets/img/Comic1/Ralgo_bored.png', on_pic, true);
	scene.loadPicture('Ralgo_normal', 'assets/img/Comic1/Ralgo_normal.png', on_pic, true);
	scene.loadPicture('Otis_normal', 'assets/img/Comic1/Otis_normal.png', on_pic, true);
	scene.loadPicture('Otis_talking', 'assets/img/Comic1/Otis_talking.png', on_pic, true);

	scene.loadPicture('Banana', 'assets/img/Comic1/banana.png', on_pic, true);
	scene.loadPicture('Phone', 'assets/img/Comic1/phone.png', on_pic, true);
	scene.loadPicture('Scissors', 'assets/img/Comic1/scissors.png', on_pic, true);
	scene.loadPicture('Mousepad', 'assets/img/Comic1/mousepad.png', on_pic, true);
	scene.loadPicture('Stapler', 'assets/img/Comic1/Stapler.png', on_pic, true);
	scene.loadPicture('Classroom2_Props', 'assets/img/Comic1/Classroom2-props.png', on_pic, true);
	scene.loadPicture('First_Aid', 'assets/img/Comic1/first-aid.png', on_pic, true);
	scene.loadPicture('Chair', 'assets/img/Comic1/chair.png', on_pic, true);
	scene.loadPicture('Chair2', 'assets/img/Comic1/chair2.png', on_pic, true);
	scene.loadPicture('AVCloset_door_open', 'assets/img/Comic1/AVCloset_door_open.png', on_pic, true);
	scene.loadPicture('AVCloset_door_closed', 'assets/img/Comic1/AVCloset_door_closed.png', on_pic, true);
	scene.loadPicture('Book', 'assets/img/Comic1/Book.png', on_pic, true);
	scene.loadPicture('Book2', 'assets/img/Comic1/Book2.png', on_pic, true);
	scene.loadPicture('Book3', 'assets/img/Comic1/Book3.png', on_pic, true);
	scene.loadPicture('Book4', 'assets/img/Comic1/Book4.png', on_pic, true);
	scene.loadPicture('Ink', 'assets/img/Comic1/Ink.png', on_pic, true);
	scene.loadPicture('Note', 'assets/img/Comic1/Note.png', on_pic, true);
	scene.loadPicture('Wires', 'assets/img/Comic1/Wires.png', on_pic, true);
	scene.loadPicture('Pillow', 'assets/img/Comic1/Pillow.png', on_pic, true);
	scene.loadPicture('Blue', 'assets/img/Comic1/Blue.png', on_pic, true);

	scene.loadPicture('Classroom1_bg', 'assets/img/Comic1/Classroom1-bg.png', on_pic, true);
	scene.loadPicture('Classroom1_fg', 'assets/img/Comic1/Classroom1-fg.png', on_pic, true);
	scene.loadPicture('Classroom1_fg2', 'assets/img/Comic1/Classroom1-fg2.png', on_pic, true);
	scene.loadPicture('Classroom2_bg', 'assets/img/Comic1/Classroom2-bg.png', on_pic, true);
	scene.loadPicture('Classroom2_fg', 'assets/img/Comic1/Classroom2-fg.png', on_pic, true);
	scene.loadPicture('Classroom3_bg', 'assets/img/Comic1/Classroom3-bg.png', on_pic, true);
	scene.loadPicture('Classroom3_fg', 'assets/img/Comic1/Classroom3-fg.png', on_pic, true);
	scene.loadPicture('Classroom4_bg', 'assets/img/Comic1/Classroom4-bg.png', on_pic, true);
	scene.loadPicture('Classroom4_fg', 'assets/img/Comic1/Classroom4-fg.png', on_pic, true);
	scene.loadPicture('AVCloset_bg', 'assets/img/Comic1/AVCloset-bg.png', on_pic, true);
	scene.loadPicture('AVCloset_fg', 'assets/img/Comic1/AVCloset-fg.png', on_pic, true);

	for (let i = 1; i < 9; i++) {
		scene.loadPicture('calc' + i, 'assets/img/Comic1/calc' + i + '.png', on_pic, true);
	}
};

exp.loadSounds = function(cb) {
	const sounds = [
		{
			id: 'bgm1',
			src: 'bgm1.mp3',
		},
		{
			id: 'bgm2',
			src: 'bgm2.mp3',
		},
		{
			id: 'bgm3',
			src: 'bgm3.mp3',
		},
		{
			id: 'bwow',
			src: 'bwow.mp3',
		},
	];

	let ctr = 0;
	createjs.Sound.on('fileload', (event) => {
		ctr++;
		let ins = (scene.sounds[event.id] = createjs.Sound.play(event.id));
		ins.on('complete', () => {
			ins.stop();
			ins.play();
		});
		ins.volume = 1;
		ins.stop();
		console.log('Loaded sound', event.src);
		if (ctr >= sounds.length) {
			cb(null);
		}
	});
	createjs.Sound.registerSounds(sounds, 'assets/snd/');
};
