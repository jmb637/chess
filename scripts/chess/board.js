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
