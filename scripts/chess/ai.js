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
