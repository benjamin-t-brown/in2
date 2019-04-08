# IN2 - Compilers

The srcCompile folder of IN2 provides the area to place a game engine compiler for the trees created with the tool.  There are two compilers at the moment: one for JavaScript dialogue trees, and one for a custom C++ game engine on this github account.  These can be extended to any engine.

IN2 has startup configuration to utilize a compiler when writing output.  The default compiler creates a JavaScript file that can be executed with the rudimentary engine code, which runs the output in a terminal.  This compiler is a javascript file that determines the output of each node as it iterates through a tree.

	* compiler.js (default) - compiles a JavaScript file that can be run in the provided engine
	* compiler.cpp.js - compiles a C++ file that relies on outside tools to be run

When running IN2, clicking on the "compile" button will compile the currently selected file using the active compiler.  The output is placed inside the "out" folder under the name "{filename}.compiled.(js/cpp)".  Clicking on the "compile all" button will aggregate all the files together into a file called "main.compiled.(js/cpp)".  Errors that are thrown by the compiler are sent back via stdout to the invoking server.

## Content Testing

If you want to run a completed dialogue tree (js only) you can compile it, then run the following command.

```

```