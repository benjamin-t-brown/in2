# IN2 - Dialogue Tree Maker

IN2 is a tool for writing large, complex dialogue trees.  Features include:
	- filterable boards and entities for simple organization
	- easily draggable nodes
	- logic-based options (only show text if some condition is met)
	- auto saving on every change
	- copy and pasting structures
	- custom code boxes that can execute arbitrary commands
	- expandabilty to support any kind of engine that can represent a JSON tree structure.

## Screenshots:


## Example Usages:

Typical text adventure games require the player to interact with the game via typing a command, however you can achieve a similar result by constructing the game as a massive dialogue tree.  Players are confronted with a promt and interact with it by pressiong 0-9 which corresponds to their choice.

Some examples.

*Text-based Adventures*
```
> You stand looking over the edge of a cliff, gazing at a swirling mist through which
> you can barely see a light shining in the distance.
> --------
> 1.) [ROPE] Use your rope to descend the cliff face.
> 2.) Attempt to climb down the cliff.
> 3.) Leave.
> --------
```

*Interactive Comics*
![https://imgur.com/IKPLPmi](https://i.imgur.com/IKPLPmi.png)
Taken from [Adalais in the Classroom](https://benjamin-t-brown.github.io/icomic1/)

*RPG Dialogue Trees*
![Screenshot 1](https://i.imgur.com/o69t2tM.png)
Taken from [Sadelica](https://benjamin-t-brown.github.io/sadelica/)

### Installation and Running

This program runs a server locally so that the web browser can be used as a UI device, and also so that it can save files to disk.

To install (after cloning the repository), requires nodejs.
```sh
$ cd $REPO_DIR/src
$ npm install
```

To run the server
```sh
cd $REPO_DIR/src
node src-srv
```

Then navigate to "http://localhost:8080"
