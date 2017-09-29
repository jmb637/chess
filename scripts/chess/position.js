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
