# IN2 - Choice Based Text Adventure Engine

IN2 is a game engine for writing, compiling, and playing choice based text adventure games.  Typical text adventure games require the player to interact with the game via typing a command (see Zork as an example), however this engine is built around the player typing a number 0-9 which corresponds to their choice at any given situation.

As an example:

> You stand looking over the edge of a cliff, gazing at a swirling mist through which you can barely see a light shining in the distance.
> \--------
> 1.) [ROPE] Use your rope to descend the cliff face.
> 2.) Attempt to climb down the cliff.
> 3.) Leave.
> \--------

### Installation

You have two options for installation:
- Use a pre-built binary
- Install from source

A prebuilt version with example scenario "Imagine Nation" written by Benjamin Brown can be found here: [http://fable.digital/in2-ImagineNation.zip](http://fable.digital/in2.zip)

To run from source, IN2 requires the lastest version of [npm and nodejs](https://nodejs.org/en/).  Once you have that, clone this repository somewhere and perform the following steps for initial setup:

```sh
$ cd $REPO_DIR
$ npm install
```

And if you want to use the scenario editor, do the following:

```sh
$ cd $REPO_DIR/tree-builder
$ npm install
$ npm run build
```

Once that's done you can either download a scenario from the in2 scenario archives at [http://fable.digital/archives](http://fable.digital/archives), or build your own.

### Scenarios and Archives

[http://fable.digital/archives](http://fable.digital/archives)

To play a game on IN2, you will need to have a scenario.  IN2 Scenario Archives is the place to go for pre-built scenarios running on the IN2 engine.  A scenario for IN2 is simply a single file called "main.compiled.js".  To play this file, copy it to the following directory:

```sh
$ cp main.compiled.js $REPO_DIR/src/
```

To run IN2 with this scenario, perform the following:
```sh
$ cd $REPO_DIR && npm run game
```

If all goes well, you should have your scenario up and running.

### Scenario Editor

IN2 comes with a scenario editor called "tree-builder".  Since a scenario is essentially a very large conversation tree, this interface helps you program and compile scenarios visually instead of programatically.

"tree-builder" is a single-page web app.  To run it, you must first run the included http server:

```sh
$ cd $REPO_DIR/tree-builder
$ node src-srv
```

This will start an http-sever running at localhost:8888.

At this point you can visit [localhost:8888](localhost:8888) in your browser to access the program.

For documentation on how to use "tree-builder" see the included README within the tree-builder subdirectory.
