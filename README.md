## Chess

This repository contains a chess AI, an implementation of chess, and a web user interface.

The chess AI uses a minimax algorithm with alpha-beta pruning to explore the tree of all possible chess moves. The minimax algorithm explores to a maximum depth and evaluates the board using a heuristic based on piece value and piece position. The AI explores to a variable depth based on the search speed of the user's environment, causing move generation to generally take between 1 and 5 seconds. A minimum of 4 plies are explored, but searching as many as 7 plies has been observed on faster processors given this time constraint.

The implementation of chess is optimized to allow the AI to explore nodes more quickly. To avoid garbage collection, no new objects are created after initialization. For game state like a piece's position, the flyweight pattern is used to avoid new allocation. The board module preallocates all memory used to maintain all of the boards that the AI will generate. A single chess board is represented by a 67 byte section inside of this total block of memory. A chess board must be manually requested from the board module and manually freed by another request to the board module. The board module contains high-level functions to simplify accessing the low-level byte array state representation.

The web user interface is fairly straightforward. Board state is drawn to an HTML5 canvas element. The user interacts with the game by clicking on this canvas as would happen in a typical piece of chess software.

### Browser compatibility

This project does not make any attempts to accommodate older browsers. HTML5 and ES6 language features are used. To preserve the readability of the actual built JavaScript, no polyfills or transpilers are employed in the build process.