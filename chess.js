(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Contains functions for generating the "best" chess move for a given board state.
 * All functions in this module are stateless and cause no side effects.
 */

const board = require('./board.js');
const pieceColor = require('./pieceColor.js');
const pieceType = require('./pieceType.js');
const position = require('./position.js');
const rules = require('./rules.js');
const status = require('./status.js');

/**
 * Uses the minimax algorithm to find the "best" move.
 * Searches to a varying depth based on search speed.
 * Uses some randomness to avoid getting stuck in a cycle.
 * @param {Number} boardID a board id from the getBoardID function
 * @return the move with the highest score found
 */
function generateBestMove(boardID, depth = null) {
  if (depth === null) {
    const start = performance.now();
    let currentDepth = 4;
    let bestMove = generateBestMove(boardID, currentDepth);

    while (performance.now() - start < 650) {
      ++currentDepth;
      bestMove = generateBestMove(boardID, currentDepth);
    }

    return bestMove;
  }

  let bestMove;
  const topMoves = [];
  const maxTopLength = 3;
  for (let move of validMoves(boardID)) {
    const copyID = board.getBoardID();
    board.copyBoard(boardID, copyID);
    board.commitMove(copyID, move.from, move.to);

    if (bestMove === undefined) {
      move.score = -minimax(copyID, depth - 1);
      board.freeBoardID(copyID);
      bestMove = move;
      topMoves.push(move);
      continue;
    }

    move.score = -minimax(copyID, depth - 1, bestMove.score);
    board.freeBoardID(copyID);

    if (move.score > bestMove.score) {
      bestMove = move;
      topMoves.push(move);
      if (topMoves.length > maxTopLength) {
        topMoves.shift();
      }
    } else {
      const worstTopMove = topMoves[topMoves.length - 1];
      if (move.score > worstTopMove.score) {
        topMoves[topMoves.length - 1] = move;
      }
    }
  }

  const worstTopMove = topMoves[topMoves.length - 1];
  if (bestMove.score - worstTopMove.score < 10) {
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  } else {
    return bestMove;
  }
}

/**
 * @param {Number} boardID a board id from the getBoardID function
 * @return all potentially legal moves for the active player when taking into account only
 * piece type and position -- not the entire state of the board
 */
function* potentialMoves(boardID) {
  const turnColor = board.getTurnColor(boardID);
  const pawnRowDifference = turnColor === pieceColor.WHITE ? 1 : -1;

  for (let fromRow = 0; fromRow < 8; ++fromRow) {
    for (let fromColumn = 0; fromColumn < 8; ++fromColumn) {
      const from = position.getPosition(fromRow, fromColumn);
      const color = board.getPieceColor(boardID, from);
      if (color === turnColor) {
        const type = board.getPieceType(boardID, from);

        for (let to of position.getReachablePositionsByType(from, color, type)) {
          yield { from, to };
        }
      }
    }
  }
}

function* validMoves(boardID) {
  for (let move of potentialMoves(boardID)) {
    if (rules.validateMove(boardID, move.from, move.to)) {
      yield move;
    }
  }
}

function* validBoardIDs(boardID) {
  for (let move of potentialMoves(boardID)) {
    const newBoardID = rules.getValidBoardID(boardID, move.from, move.to);
    if (newBoardID !== -1) {
      yield newBoardID;
    }
  }
}

function minimax(
  boardID,
  depth,
  otherMax = Number.MIN_SAFE_INTEGER,
  ownMax = Number.MIN_SAFE_INTEGER
) {
  const boardStatus = rules.getBoardStatus(boardID);
  switch (boardStatus) {
    case status.INVALID: {
      throw new Error(`status: ${boardStatus}`);
    }
    case status.CHECKMATE: {
      return -10000;
    }
    case status.STALEMATE: {
      return 0;
    }
  }

  if (depth === 0) {
    let score = 0;

    if (boardStatus === status.CHECK) {
      score -= 5;
    }

    const turnColor = board.getTurnColor(boardID);
    for (let row = 0; row < 8; ++row) {
      for (let column = 0; column < 8; ++column) {
        const pos = position.getPosition(row, column);
        const type = board.getPieceType(boardID, pos);

        if (type !== pieceType.NONE) {
          const color = board.getPieceColor(boardID, pos);
          const value = getPieceValue(pos, color, type);

          if (color === turnColor) {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }

    return score;
  }

  let maxScore = ownMax;
  for (let id of validBoardIDs(boardID)) {
    const score = -minimax(id, depth - 1, maxScore, otherMax);
    board.freeBoardID(id);

    if (score > maxScore) {
      if (-score <= otherMax) {
        return score;
      }

      maxScore = score;
    }
  }

  return maxScore;
}

function getPieceValue(pos, color, type) {
  let value = 0;

  if (color === pieceColor.WHITE) {
    if (pos.row >= 1) {
      ++value;
    }
  } else {
    if (pos.row <= 6) {
      ++value;
    }
  }

  switch (type) {
    case pieceType.BISHOP: {
      value += 30;
      break;
    }
    case pieceType.KING: {
      value += 10000;
      break;
    }
    case pieceType.KNIGHT: {
      if (color === pieceColor.WHITE) {
        if (pos.row >= 1) {
          ++value;
        }
      } else {
        if (pos.row <= 6) {
          ++value;
        }
      }

      value += 30;
      break;
    }
    case pieceType.QUEEN: {
      value += 90;
      break;
    }
    case pieceType.PAWN: {
      if (pos.column >= 1 && pos.column <= 6) {
        if (color === pieceColor.WHITE) {
          if (pos.row >= 3) {
            value += 2;
          }
        } else {
          if (pos.row <= 4) {
            value += 2;
          }
        }
      }

      value += 10;
      break;
    }
    case pieceType.ROOK: {
      value += 50;
      break;
    }
  }

  return value;
}

exports.generateBestMove = generateBestMove;
exports.potentialMoves = potentialMoves;

},{"./board.js":2,"./pieceColor.js":3,"./pieceType.js":4,"./position.js":5,"./rules.js":6,"./status.js":7}],2:[function(require,module,exports){
'use strict';

/**
 * Models a chess board. No new chess boards are created after initialization. Instead,
 * a byte array is allocated at initialization to hold multiple board states. This requires
 * users to manually notify this module to free a board.
 * All state for any given chess board is contained in a 67 byte sequence.
 * The first 64 bytes hold the piece color and piece type for the 64 chess tiles.
 * The 65th byte contains the position of the white king.
 * The 66th byte contains the position of the black king and the color of the current active player.
 * The 67th byte contains what column an en passant can be used against and whether each player can
 * castle for each side.
 */

const pieceColor = require('./pieceColor.js');
const pieceType = require('./pieceType.js');
const position = require('./position.js');
const rules = require('./rules.js');
const status = require('./status.js');

const majorPieceOrder = [
  pieceType.ROOK,
  pieceType.KNIGHT,
  pieceType.BISHOP,
  pieceType.QUEEN,
  pieceType.KING,
  pieceType.BISHOP,
  pieceType.KNIGHT,
  pieceType.ROOK
];

let boardCount = 32;
const boardSize = 67;
const bytes = new Uint8Array(boardCount * boardSize);

const freeBoardIDs = [];
for (let i = 0; i < boardCount; ++i) {
  freeBoardIDs.unshift(i * boardSize);
}

/**
 * @return an integer required by all other functions in this file that corresponds to board state
 */
function getBoardID() {
  if (freeBoardIDs.length === 0) {
    throw new Error('Insufficient board count');
  }

  return freeBoardIDs.pop();
}

/**
 * Returns the previously valid board id to the pool.
 * @param {Number} id 
 */
function freeBoardID(id) {
  freeBoardIDs.push(id);
}

/**
 * Changes the board state to the standard chess starting positions.
 * @param {Number} id 
 */
function initializeBoard(id) {
  bytes.fill(0, id, id + boardSize);
  setTurnColor(id, pieceColor.WHITE);

  for (let row = 0; row < 8; ++row) {
    for (let column = 0; column < 8; ++column) {
      switch (row) {
        case 0: {
          const type = majorPieceOrder[column];
          setPiece(id, position.getPosition(row, column), pieceColor.WHITE, type);
          break;
        }
        case 1: {
          setPiece(id, position.getPosition(row, column), pieceColor.WHITE, pieceType.PAWN);
          break;
        }
        case 6: {
          setPiece(id, position.getPosition(row, column), pieceColor.BLACK, pieceType.PAWN);
          break;
        }
        case 7: {
          const type = majorPieceOrder[column];
          setPiece(id, position.getPosition(row, column), pieceColor.BLACK, type);
          break;
        }
      }
    }
  }
}

/**
 * Copies the board state from one board to another.
 * @param {Number} sourceID 
 * @param {Number} destinationID 
 */
function copyBoard(sourceID, destinationID) {
  bytes.copyWithin(destinationID, sourceID, sourceID + boardSize);
}

/**
 * @param {Number} id
 * @return the color of the currently active player 
 */
function getTurnColor(id) {
  return bytes[id + boardSize - 2] & 0b11;
}

/**
 * @param {Number} id 
 * @param color a piece color value
 */
function setTurnColor(id, color) {
  const index = id + boardSize - 2;
  bytes[index] = (bytes[index] & 0b11111100) | color;
}

/**
 * @param {Number} id 
 * @param color a piece color value
 * @return position of the king 
 */
function getKingPosition(id, color) {
  if (color === pieceColor.WHITE) {
    const index = id + boardSize - 3;
    return position.getPosition(bytes[index] >> 3, bytes[index] & 0b111);
  } else {
    const index = id + boardSize - 2;
    return position.getPosition(bytes[index] >> 5, (bytes[index] >> 2) & 0b111);
  }
}

/**
 * 
 * @param {Number} id 
 * @param color a piece color value 
 * @param side either the QUEEN piece type or the KING piece type
 * @return a boolean 
 */
function canCastle(id, color, side) {
  const index = id + boardSize - 1;

  let bitIndex = 0;
  if (color === pieceColor.BLACK) {
    bitIndex += 2;
  }

  if (side === pieceType.QUEEN) {
    bitIndex += 1;
  }

  const mask = 1 << bitIndex;
  return (bytes[index] & mask) === 0;
}

function blockCastling(id, color, side) {
  const index = id + boardSize - 1;

  let bitIndex = 0;
  if (color === pieceColor.BLACK) {
    bitIndex += 2;
  }

  if (side === pieceType.QUEEN) {
    bitIndex += 1;
  }

  const mask = 1 << bitIndex;
  bytes[index] = bytes[index] | mask;
}

/**
 * @param {Number} id 
 * @return the column that en passant can be used against or 8 if there is no valid column
 */
function getEnPassantColumn(id) {
  const byte = bytes[id + boardSize - 1];
  return byte >> 4;;
}

function setEnPassantColumn(id, value) {
  const index = id + boardSize - 1;
  bytes[index] = (value << 4) | (bytes[index] & 0b1111);
}

/**
 * @param {Number} id 
 * @param {Position} pos 
 * @return the piece color for the piece at the given position
 */
function getPieceColor(id, pos) {
  const posOffset = pos.row * 8 + pos.column;
  return bytes[id + posOffset] >> 3;
}

/**
 * @param {Number} id 
 * @param {Position} pos 
 * @return the piece type for the piece at the given position
 */
function getPieceType(id, pos) {
  const posOffset = pos.row * 8 + pos.column;
  return bytes[id + posOffset] & 0b111;
}

function setPiece(id, pos, color, type) {
  const posOffset = pos.row * 8 + pos.column;
  const bits = (color << 3) | type;
  bytes[id + posOffset] = bits;

  if (type === pieceType.KING) {
    if (color === pieceColor.WHITE) {
      const index = id + boardSize - 3;
      bytes[index] = (pos.row << 3) | pos.column;
    } else {
      const index = id + boardSize - 2;
      bytes[index] = (pos.row << 5) | (pos.column << 2) | (bytes[index] & 0b11);
    }
  }
}

/**
 * Attempts to perform a move. No side effects occur if the move is invalid.
 * @param {Number} id 
 * @param {Position} from 
 * @param {Position} to 
 * @param promotionType a piece type value
 * @return a status representing the effect of the move
 */
function tryMove(id, from, to, promotionType = pieceType.QUEEN) {
  if (rules.validateMove(id, from, to)) {
    commitMove(id, from, to, promotionType);
    return rules.getBoardStatus(id);
  }

  return status.INVALID;
}

/**
 * Directly commit the move without performing validation first.
 * @param {Number} id 
 * @param {Position} from 
 * @param {Position} to 
 * @param promotionType a piece type value
 */
function commitMove(id, from, to, promotionType = pieceType.QUEEN) {
  const fromColor = getPieceColor(id, from);
  const fromType = getPieceType(id, from);

  const rowDifference = to.row - from.row;
  if (fromType === pieceType.PAWN && Math.abs(rowDifference) === 2) {
    setEnPassantColumn(id, from.column);
  } else {
    setEnPassantColumn(id, 8);

    const columnDifference = to.column - from.column;
    const toType = getPieceType(id, to);

    const castling = fromType === pieceType.KING && Math.abs(columnDifference) === 2;
    const enPassant =
      fromType === pieceType.PAWN &&
      Math.abs(columnDifference) === 1 &&
      toType === pieceType.NONE;
    if (castling) {
      const rookColumn = columnDifference > 0 ? 7 : 0;
      const betweenColumn = from.column + Math.sign(columnDifference);
      setPiece(id, position.getPosition(from.row, rookColumn), pieceColor.NONE, pieceType.NONE);
      setPiece(id, position.getPosition(from.row, betweenColumn), fromColor, pieceType.ROOK);
    } else if (enPassant) {
      setPiece(id, position.getPosition(from.row, to.column), pieceColor.NONE, pieceType.NONE);
    }
  }

  const promotionRow = fromColor === pieceColor.WHITE ? 7 : 0;
  const promotion = fromType === pieceType.PAWN && to.row === promotionRow;
  setPiece(id, from, pieceColor.NONE, pieceType.NONE);
  if (promotion) {
    setPiece(id, to, fromColor, promotionType);
  } else {
    setPiece(id, to, fromColor, fromType);
  }

  const oppositeColor = pieceColor.opposite(fromColor);
  if (fromType === pieceType.KING) {
    blockCastling(id, fromColor, pieceType.QUEEN);
    blockCastling(id, fromColor, pieceType.KING);
  } else {
    const majorRow = fromColor === pieceColor.WHITE ? 0 : 7;
    if (fromType === pieceType.ROOK && from.row === majorRow) {
      if (from.column === 0) {
        blockCastling(id, fromColor, pieceType.QUEEN);
      } else if (from.column === 7) {
        blockCastling(id, fromColor, pieceType.KING);
      }
    }

    if (to.row === promotionRow) {
      if (to.column === 0) {
        blockCastling(id, oppositeColor, pieceType.QUEEN);
      } else if (to.column === 7) {
        blockCastling(id, oppositeColor, pieceType.KING);
      }
    }
  }

  setTurnColor(id, oppositeColor);
}

exports.getBoardID = getBoardID;
exports.freeBoardID = freeBoardID;
exports.initializeBoard = initializeBoard;
exports.copyBoard = copyBoard;
exports.getTurnColor = getTurnColor;
exports.getKingPosition = getKingPosition;
exports.canCastle = canCastle;
exports.getEnPassantColumn = getEnPassantColumn;
exports.getPieceColor = getPieceColor;
exports.getPieceType = getPieceType;
exports.tryMove = tryMove;
exports.commitMove = commitMove;

},{"./pieceColor.js":3,"./pieceType.js":4,"./position.js":5,"./rules.js":6,"./status.js":7}],3:[function(require,module,exports){
'use strict';

module.exports = Object.freeze({
  NONE: 0,
  WHITE: 1,
  BLACK: 2,
  opposite(color) {
    return color === this.WHITE ? this.BLACK : this.WHITE;
  }
});

},{}],4:[function(require,module,exports){
'use strict';

module.exports = Object.freeze({
  NONE: 0,
  BISHOP: 1,
  KING: 2,
  KNIGHT: 3,
  QUEEN: 4,
  PAWN: 5,
  ROOK: 6
});

},{}],5:[function(require,module,exports){
'use strict';

/**
 * Uses an object pool of 64 immutable positions to handle requests for new positions.
 * No new positions are created after initialization. Potential moves for each position
 * are also precomputed.
 */

const pieceColor = require('./pieceColor.js');
const pieceType = require('./pieceType.js');

class Position {
  constructor(row, column) {
    this.row = row;
    this.column = column;

    Object.freeze(this);
  }
}

const positions = [];

for (let row = 0; row < 8; ++row) {
  for (let column = 0; column < 8; ++column) {
    positions.push(new Position(row, column));
  }
}

const allReachablePositions = [];
const allBishopReachablePositions = [];
const allKingReachablePositions = [];
const allKnightReachablePositions = [];
const allWhitePawnReachablePositions = [];
const allBlackPawnReachablePositions = [];
const allQueenReachablePositions = [];
const allRookReachablePositions = [];

for (let row = 0; row < 8; ++row) {
  for (let column = 0; column < 8; ++column) {
    const reachablePositions = [];
    const bishopReachablePositions = [];
    const kingReachablePositions = [];
    const knightReachablePositions = [];
    const whitePawnReachablePositions = [];
    const blackPawnReachablePositions = [];
    const queenReachablePositions = [];
    const rookReachablePositions = [];

    for (let r = 0; r < 8; ++r) {
      for (let c = 0; c < 8; ++c) {
        if (r === row && c === column) {
          continue;
        }

        const rowDifference = r - row;
        const columnDifference = c - column;

        const orthogonal = rowDifference === 0 || columnDifference === 0;
        const diagonal = Math.abs(rowDifference) === Math.abs(columnDifference);
        const lateral = Math.abs(columnDifference) === 2 && Math.abs(rowDifference) === 1;
        const longitudinal = Math.abs(rowDifference) === 2 && Math.abs(columnDifference) === 1;

        if (orthogonal) {
          rookReachablePositions.push(getPosition(r, c));
          queenReachablePositions.push(getPosition(r, c));
        }

        if (diagonal) {
          bishopReachablePositions.push(getPosition(r, c));
          queenReachablePositions.push(getPosition(r, c))
        }

        if (lateral || longitudinal) {
          knightReachablePositions.push(getPosition(r, c));
        }

        if (Math.abs(rowDifference) <= 1 && Math.abs(columnDifference) <= 1) {
          kingReachablePositions.push(getPosition(r, c));
        }

        if (Math.abs(columnDifference) <= 1) {
          if (rowDifference === 1) {
            whitePawnReachablePositions.push(getPosition(r, c));
          } else if (rowDifference === -1) {
            blackPawnReachablePositions.push(getPosition(r, c));
          }
        }

        if (orthogonal || diagonal || lateral || longitudinal) {
          reachablePositions.push(getPosition(r, c));
        }
      }
    }

    if (row === 1) {
      whitePawnReachablePositions.push(getPosition(row + 2, column));
    } else if (row === 6) {
      blackPawnReachablePositions.push(getPosition(row - 2, column));
    }

    allReachablePositions.push(reachablePositions);
    allBishopReachablePositions.push(bishopReachablePositions);
    allKingReachablePositions.push(kingReachablePositions);
    allKnightReachablePositions.push(knightReachablePositions);
    allWhitePawnReachablePositions.push(whitePawnReachablePositions);
    allBlackPawnReachablePositions.push(blackPawnReachablePositions);
    allQueenReachablePositions.push(queenReachablePositions);
    allRookReachablePositions.push(rookReachablePositions);
  }
}

/**
 * @param {Number} row in range [0, 7] 
 * @param {Number} column in range [0, 7]
 * @return a position containing the row and column
 */
function getPosition(row, column) {
  return positions[row * 8 + column];
}

/**
 * @param {Position} from 
 * @return an array of all potentially reachable positions for any piece type without
 * taking into account board state
 */
function getReachablePositions(from) {
  return allReachablePositions[from.row * 8 + from.column];
}

/**
 * @param {Position} from
 * @param color a piece color value
 * @param type a piece type value
 * @return an array of all potentially reachable positions for some type of piece without
 * taking into account board state
 */
function getReachablePositionsByType(from, color, type) {
  const index = from.row * 8 + from.column;

  switch (type) {
    case pieceType.NONE: {
      throw new Error('Invalid type');
    }
    case pieceType.BISHOP: {
      return allBishopReachablePositions[index];
    }
    case pieceType.KING: {
      return allKingReachablePositions[index];
    }
    case pieceType.KNIGHT: {
      return allKnightReachablePositions[index];
    }
    case pieceType.QUEEN: {
      return allQueenReachablePositions[index];
    }
    case pieceType.PAWN: {
      if (color === pieceColor.WHITE) {
        return allWhitePawnReachablePositions[index];
      } else {
        return allBlackPawnReachablePositions[index];
      }
    }
    case pieceType.ROOK: {
      return allRookReachablePositions[index];
    }
  }
}

exports.getPosition = getPosition;
exports.getReachablePositions = getReachablePositions;
exports.getReachablePositionsByType = getReachablePositionsByType;

},{"./pieceColor.js":3,"./pieceType.js":4}],6:[function(require,module,exports){
'use strict';

/**
 * Contains functions for enforcing the standard rules of chess.
 * All functions in this module are stateless and cause no side effects beyond
 * new board allocation.
 */

const ai = require('./ai.js');
const board = require('./board.js');
const pieceColor = require('./pieceColor.js');
const pieceType = require('./pieceType.js');
const position = require('./position.js');
const status = require('./status.js');

/**
 * @param {Number} boardID
 * @return a board status value for the current active player 
 */
function getBoardStatus(boardID) {
  const check = isInCheck(boardID, board.getTurnColor(boardID));
  const validMove = hasValidMove(boardID);

  if (check) {
    if (validMove) {
      return status.CHECK;
    }

    return status.CHECKMATE;
  }

  if (validMove) {
    return status.STANDARD
  }

  return status.STALEMATE;
}

/**
 * @param {Number} boardID 
 * @param {Position} from 
 * @param {Position} to 
 * @return a boolean based on whether or not the move is legal
 */
function validateMove(boardID, from, to) {
  const id = getValidBoardID(boardID, from, to);

  if (id === -1) {
    return false;
  }
  else {
    board.freeBoardID(id);
    return true;
  }
}

/**
 * @param {Number} boardID 
 * @param {Position} from 
 * @param {Position} to 
 * @return a board id for the state of the board after the move completes or
 * -1 if the move is illegal
 */
function getValidBoardID(boardID, from, to) {
  const turnColor = board.getTurnColor(boardID);
  if (
    validateGenerics(boardID, from, to, turnColor) &&
    validateSpecifics(boardID, from, to, turnColor)
  ) {
    const copyID = board.getBoardID();
    board.copyBoard(boardID, copyID);
    board.commitMove(copyID, from, to);

    if (isInCheck(copyID, turnColor)) {
      board.freeBoardID(copyID);
      return -1;
    } else {
      return copyID;
    }
  }

  return -1;
}

function validateGenerics(boardID, from, to, turnColor) {
  const fromColor = board.getPieceColor(boardID, from);
  const toColor = board.getPieceColor(boardID, to);
  return fromColor === turnColor && toColor !== turnColor;
}

function validateSpecifics(boardID, from, to, turnColor) {
  const fromType = board.getPieceType(boardID, from);

  switch (fromType) {
    case pieceType.NONE: {
      return false;
    }
    case pieceType.BISHOP: {
      return validateBishopMove(boardID, from, to);
    }
    case pieceType.KING: {
      return validateKingMove(boardID, from, to, turnColor);
    }
    case pieceType.KNIGHT: {
      return validateKnightMove(boardID, from, to);
    }
    case pieceType.QUEEN: {
      return validateQueenMove(boardID, from, to);
    }
    case pieceType.PAWN: {
      return validatePawnMove(boardID, from, to, turnColor);
    }
    case pieceType.ROOK: {
      return validateRookMove(boardID, from, to);
    }
  }
}

function isInCheck(boardID, turnColor) {
  const kingPosition = board.getKingPosition(boardID, turnColor);
  return isAttacked(boardID, kingPosition, pieceColor.opposite(turnColor));
}

function isAttacked(boardID, target, attackerColor) {
  for (let from of position.getReachablePositions(target)) {
    const color = board.getPieceColor(boardID, from);
    if (color === attackerColor && validateSpecifics(boardID, from, target, attackerColor)) {
      return true;
    }
  }

  return false;
}

function hasValidMove(boardID) {
  for (let move of ai.potentialMoves(boardID)) {
    if (validateMove(boardID, move.from, move.to)) {
      return true;
    }
  }

  return false;
}

function validateBishopMove(boardID, from, to) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;
  const diagonal = Math.abs(rowDifference) === Math.abs(columnDifference);
  return diagonal && simplePathIsClear(boardID, from, to);
}

function validateKingMove(boardID, from, to, turnColor) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;

  const adjacent = Math.abs(rowDifference) <= 1 && Math.abs(columnDifference) <= 1;
  if (adjacent) {
    return true;
  }

  const castlingAttempted = rowDifference === 0 && Math.abs(columnDifference) === 2;
  if (!castlingAttempted) {
    return false;
  }

  const castleColumn = columnDifference > 0 ? 7 : 0;
  let castlingAllowed;
  if (castleColumn === 0) {
    castlingAllowed = board.canCastle(boardID, turnColor, pieceType.QUEEN);
  } else {
    castlingAllowed = board.canCastle(boardID, turnColor, pieceType.KING);
  }

  const between = position.getPosition(from.row, from.column + Math.sign(columnDifference));
  const attackerColor = pieceColor.opposite(turnColor);
  const pathIsSafe = () =>
    board.getPieceType(boardID, between) === pieceType.NONE &&
    !isAttacked(boardID, from, attackerColor) &&
    !isAttacked(boardID, between, attackerColor);

  return castlingAllowed && pathIsSafe();
}

function validateKnightMove(boardID, from, to) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;

  const lateral = Math.abs(columnDifference) === 2 && Math.abs(rowDifference) === 1;
  const longitudinal = Math.abs(rowDifference) === 2 && Math.abs(columnDifference) === 1;

  return lateral || longitudinal;
}

function validateQueenMove(boardID, from, to) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;

  const orthogonal = rowDifference === 0 || columnDifference === 0;
  const diagonal = Math.abs(rowDifference) === Math.abs(columnDifference);

  return (orthogonal || diagonal) && simplePathIsClear(boardID, from, to);
}

function validatePawnMove(boardID, from, to, turnColor) {
  const columnDifference = to.column - from.column;
  if (Math.abs(columnDifference) > 1) {
    return false;
  }

  const rowDifference = to.row - from.row;
  if (Math.abs(rowDifference) > 2) {
    return false;
  }

  let standardRowDifference;
  let initialRow;
  let enPassantCaptureRow;
  if (turnColor === pieceColor.WHITE) {
    standardRowDifference = 1;
    initialRow = 1;
    enPassantCaptureRow = 5;
  } else {
    standardRowDifference = -1;
    initialRow = 6;
    enPassantCaptureRow = 2;
  }

  const isDirectCapture = board.getPieceType(boardID, to) !== pieceType.NONE;
  const standardMove = () =>
    columnDifference === 0 &&
    rowDifference === standardRowDifference &&
    !isDirectCapture;
  const doubleMove = () =>
    from.row === initialRow &&
    columnDifference === 0 &&
    rowDifference === 2 * standardRowDifference &&
    !isDirectCapture &&
    board.getPieceType(
      boardID,
      position.getPosition(from.row + standardRowDifference, from.column)
    ) === pieceType.NONE;
  const standardCapture = () =>
    Math.abs(columnDifference) === 1 &&
    rowDifference === standardRowDifference &&
    isDirectCapture;
  const enPassant = () =>
    Math.abs(columnDifference) === 1 &&
    rowDifference === standardRowDifference &&
    !isDirectCapture &&
    to.row === enPassantCaptureRow &&
    to.column === board.getEnPassantColumn(boardID);

  return standardMove() || doubleMove() || standardCapture() || enPassant();
}

function validateRookMove(boardID, from, to) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;
  const orthogonal = rowDifference === 0 || columnDifference === 0;
  return orthogonal && simplePathIsClear(boardID, from, to);
}

function simplePathIsClear(boardID, from, to) {
  const rowDifference = to.row - from.row;
  const columnDifference = to.column - from.column;

  const rowChange = Math.sign(rowDifference);
  const columnChange = Math.sign(columnDifference);

  let row = from.row;
  let column = from.column;
  while (true) {
    row += rowChange;
    column += columnChange;

    if (row === to.row && column === to.column) {
      return true;
    }

    if (board.getPieceType(boardID, position.getPosition(row, column)) !== pieceType.NONE) {
      return false;
    }
  }
}

exports.getBoardStatus = getBoardStatus;
exports.validateMove = validateMove;
exports.getValidBoardID = getValidBoardID;

},{"./ai.js":1,"./board.js":2,"./pieceColor.js":3,"./pieceType.js":4,"./position.js":5,"./status.js":7}],7:[function(require,module,exports){
'use strict';

module.exports = Object.freeze({
  INVALID: 'Invalid',
  STANDARD: 'Standard',
  CHECK: 'Check',
  CHECKMATE: 'Checkmate',
  STALEMATE: 'Stalemate'
});

},{}],8:[function(require,module,exports){
'use strict';

/**
 * Handles user input and manages the state of the UI.
 */

const ai = require('../chess/ai.js');
const board = require('../chess/board.js');
const painter = require('./painter.js');
const pieceColor = require('../chess/pieceColor.js');
const pieceType = require('../chess/pieceType.js');
const position = require('../chess/position.js');
const rules = require('../chess/rules.js');
const status = require('../chess/status.js');

const boardID = board.getBoardID();
board.initializeBoard(boardID);
let playerColor = pieceColor.WHITE;
let selection = null;
let context = null;

window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');

  painter.drawBoard(context, boardID, playerColor, selection);
  const boardStatus = rules.getBoardStatus(boardID)
  updateStatusLabel();

  canvas.addEventListener('click', (event) => {
    const pos = getPositionFromCoords(canvas, event.clientX, event.clientY);
    handleAction(pos);
  });

  const resetButton = document.getElementById("reset");
  resetButton.addEventListener('click', resetBoard);

  const changeColorButton = document.getElementById("change_color");
  changeColorButton.addEventListener('click', changePlayerColor);
});

function updateStatusLabel() {
  const statusLabel = document.getElementById("status");
  const boardStatus = rules.getBoardStatus(boardID);
  const turnColor = board.getTurnColor(boardID);

  let turnColorText;
  let oppositeTurnColorText;
  if (turnColor === pieceColor.BLACK) {
    turnColorText = 'Black';
    oppositeTurnColorText = 'White';
  } else {
    turnColorText = 'White';
    oppositeTurnColorText = 'Black';
  }

  let text = "";
  switch (boardStatus) {
    case status.CHECK: {
      text += turnColorText + ' is in check.\n';
    }
    case status.STANDARD: {
      text += turnColorText + '\'s turn to move...';
      break;
    }
    case status.CHECKMATE: {
      text += turnColorText + ' has been checkmated.\n';
      text += oppositeTurnColorText + ' wins!';
      break;
    }
    case status.STALEMATE: {
      text += 'Stalemate.';
      break;
    }
  }

  statusLabel.innerText = text;
}

function getPositionFromCoords(canvas, clientX, clientY) {
  const boundingRectangle = canvas.getBoundingClientRect();

  const x = Math.floor(clientX - boundingRectangle.left);
  const y = Math.floor(clientY - boundingRectangle.top);

  const column = Math.floor((x / canvas.width) * 8);
  let row;
  if (playerColor === pieceColor.BLACK) {
    row = Math.floor(((y / canvas.height) * 8));
  } else {
    row = 7 - Math.floor(((y / canvas.height) * 8));
  }

  return position.getPosition(row, column);
}

function handleAction(pos) {
  if (selection === null) {
    if (board.getPieceColor(boardID, pos) === playerColor) {
      selection = pos;
      painter.drawTile(context, boardID, playerColor, pos, true);
    }

    return;
  }

  if (board.getPieceColor(boardID, pos) === playerColor) {
    if (pos.row === selection.row && pos.column === selection.column) {
      painter.drawTile(context, boardID, playerColor, selection, false);
      selection = null;
    } else {
      painter.drawTile(context, boardID, playerColor, selection, false);
      painter.drawTile(context, boardID, playerColor, pos, true);
      selection = pos;
    }

    return;
  }

  handleMove(selection, pos);
}

function handleMove(from, to) {
  const boardStatus = board.tryMove(boardID, selection, to);

  if (boardStatus === status.INVALID) {
    return;
  }

  selection = null;
  painter.drawBoard(context, boardID, playerColor, selection);
  updateStatusLabel();

  if (boardStatus === status.STANDARD || boardStatus === status.CHECK) {
    applyAIMove();
  }
}

function applyAIMove() {
  setTimeout(() => {
    const bestMove = ai.generateBestMove(boardID);
    const boardStatus = board.tryMove(boardID, bestMove.from, bestMove.to);
    updateStatusLabel();
    painter.drawBoard(context, boardID, playerColor, selection);
  }, 10);
}

function resetBoard() {
  selection = null;
  board.initializeBoard(boardID);
  painter.drawBoard(context, boardID, playerColor, selection);

  if (board.getTurnColor(boardID) !== playerColor) {
    applyAIMove();
  }
}

function changePlayerColor() {
  selection = null;
  playerColor = pieceColor.opposite(playerColor);
  painter.drawBoard(context, boardID, playerColor, selection);

  if (board.getTurnColor(boardID) !== playerColor) {
    applyAIMove();
  }
}

},{"../chess/ai.js":1,"../chess/board.js":2,"../chess/pieceColor.js":3,"../chess/pieceType.js":4,"../chess/position.js":5,"../chess/rules.js":6,"../chess/status.js":7,"./painter.js":9}],9:[function(require,module,exports){
'use strict';

/**
 * All drawing to the canvas is done by this module.
 */

const board = require('../chess/board.js');
const pieceColor = require('../chess/pieceColor.js');
const pieceType = require('../chess/pieceType.js');
const position = require('../chess/position.js');

const white = 'rgb(240, 240, 240)';
const black = 'rgb(60, 60, 60)';
const selectionColor = 'rgb(255, 158, 15)';
const lineWidth = 6;

/**
 * @param context a 2d context from a canvas element 
 * @param {Number} boardID 
 * @param playerColor a piece color value for the player's color 
 * @param {Position} selection 
 */
function drawBoard(context, boardID, playerColor, selection) {
  context.save();

  const canvas = context.canvas;
  const tileWidth = canvas.width / 8;
  const tileHeight = canvas.height / 8;

  for (let row = 0; row < 8; ++row) {
    for (let column = 0; column < 8; ++column) {
      const pos = position.getPosition(row, column);
      const isSelected = selection !== null && pos === selection;
      drawTile(context, boardID, playerColor, pos, isSelected);
    }
  }

  context.restore();
}

/**
 * @param context a 2d context from a canvas element 
 * @param {Number} boardID 
 * @param playerColor a piece color value for the player's color 
 * @param {Position} pos the tile's position on the board 
 * @param {Boolean} isSelected
 */
function drawTile(context, boardID, playerColor, pos, isSelected) {
  context.save();

  const canvas = context.canvas;
  const tileWidth = canvas.width / 8;
  const tileHeight = canvas.height / 8;

  const x = pos.column * tileWidth;
  let y;
  if (playerColor === pieceColor.BLACK) {
    y = pos.row * tileHeight;
  } else {
    y = canvas.height - tileHeight - (pos.row * tileHeight);
  }

  drawTileBackground(context, x, y, tileWidth, tileHeight, pos);
  drawPiece(context, boardID, x, y, tileWidth, tileHeight, pos);
  if (isSelected) {
    drawSelection(context, x, y, tileWidth, tileHeight);
  }

  context.restore();
}

function drawTileBackground(context, x, y, tileWidth, tileHeight, pos) {
  if ((pos.row + pos.column) % 2 === 0) {
    context.fillStyle = black;
  } else {
    context.fillStyle = white;
  }

  context.fillRect(x, y, tileWidth, tileHeight);
}

function drawPiece(context, boardID, x, y, tileWidth, tileHeight, pos) {
  const color = board.getPieceColor(boardID, pos);
  if (color === pieceColor.NONE) {
    return;
  }

  let id;
  for (let key of Object.keys(pieceColor)) {
    if (pieceColor[key] === color) {
      id = key.toLowerCase() + '_';
      break;
    }
  }

  const type = board.getPieceType(boardID, pos);
  for (let key of Object.keys(pieceType)) {
    if (pieceType[key] === type) {
      id += key.toLowerCase();
      break;
    }
  }

  const image = document.getElementById(id);
  context.drawImage(image, x, y, tileWidth, tileHeight);
}

function drawSelection(context, x, y, tileWidth, tileHeight) {
  context.strokeStyle = selectionColor;
  context.lineWidth = lineWidth;

  const interiorX = x + lineWidth / 2;
  const interiorY = y + lineWidth / 2;
  const interiorTileWidth = tileWidth - lineWidth;
  const interiorTileHeight = tileHeight - lineWidth;
  context.strokeRect(interiorX, interiorY, interiorTileWidth, interiorTileHeight);
}

exports.drawBoard = drawBoard;
exports.drawTile = drawTile;

},{"../chess/board.js":2,"../chess/pieceColor.js":3,"../chess/pieceType.js":4,"../chess/position.js":5}]},{},[8]);
