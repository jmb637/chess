'use strict';

/**
 * Tests for the rules of chess.
 */

const chessDirectory = '../scripts/chess';
const board = require(chessDirectory + '/board.js');
const pieceColor = require(chessDirectory + '/pieceColor.js');
const pieceType = require(chessDirectory + '/pieceType.js');
const position = require(chessDirectory + '/position.js');
const status = require(chessDirectory + '/status.js');

function runTests() {
  testFullGame();
  testCastling();
  testEnPassant();
  testPawnPromotion();
  testOpenerFalsePositives();

  console.log('All chess tests passed.');
}

function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(`${String(actual)} !== ${String(expected)}`);
  }
}

function simpleTryMove(
  boardID,
  fromRow,
  fromColumn,
  toRow,
  toColumn,
  promotionType = pieceType.QUEEN
) {
  const from = position.getPosition(fromRow, fromColumn);
  const to = position.getPosition(toRow, toColumn);
  return board.tryMove(boardID, from, to, promotionType);
}

function testFullGame() {
  const boardID = board.getBoardID();
  board.initializeBoard(boardID);

  assertEqual(simpleTryMove(boardID, 1, 4, 3, 4), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 2, 5, 2), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 1, 3, 3, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 3, 4, 3), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 1, 2, 2), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 4, 3, 3, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 2, 2, 3, 4), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 1, 6, 3), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 4, 4, 6), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 6, 5, 5), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 5, 2, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 4, 5, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 6, 2, 5), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 7, 5, 7), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 4, 6, 5, 4), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 3, 6, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 4, 0, 6), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 5, 5, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 2, 3, 5, 6), status.CHECK);
  assertEqual(simpleTryMove(boardID, 7, 4, 7, 3), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 2, 3, 5), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 1, 4, 1), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 1, 0, 3, 0), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 2, 6, 1), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 5, 0, 4), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 5, 5, 4, 3), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 5, 2, 6), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 3, 7, 2), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 0, 4, 1), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 5, 2, 4, 1), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 3, 2, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 1, 5, 2), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 5, 6, 4, 5), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 5, 4, 4, 5), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 4, 6, 4), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 5, 6, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 1, 2, 3, 2), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 4, 1, 3, 2), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 2, 3, 3, 2), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 2, 6, 1), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 2, 5, 0), status.CHECKMATE);

  board.freeBoardID(boardID);
}

function testCastling() {
  const boardID = board.getBoardID();
  board.initializeBoard(boardID);

  assertEqual(simpleTryMove(boardID, 1, 3, 3, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 4, 4, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 3, 2, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 5, 6, 4), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 2, 1, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 6, 5, 5), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 1, 2, 2), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 4, 7, 6), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 0, 4, 0, 2), status.STANDARD);

  const whiteKingColor = board.getPieceColor(boardID, position.getPosition(0, 2));
  const whiteKingType = board.getPieceType(boardID, position.getPosition(0, 2));
  assertEqual(whiteKingColor, pieceColor.WHITE);
  assertEqual(whiteKingType, pieceType.KING);

  const whiteRookColor = board.getPieceColor(boardID, position.getPosition(0, 3));
  const whiteRookType = board.getPieceType(boardID, position.getPosition(0, 3));
  assertEqual(whiteRookColor, pieceColor.WHITE);
  assertEqual(whiteRookType, pieceType.ROOK);

  const blackKingColor = board.getPieceColor(boardID, position.getPosition(7, 6));
  const blackKingType = board.getPieceType(boardID, position.getPosition(7, 6));
  assertEqual(blackKingColor, pieceColor.BLACK);
  assertEqual(blackKingType, pieceType.KING);

  const blackRookColor = board.getPieceColor(boardID, position.getPosition(7, 5));
  const blackRookType = board.getPieceType(boardID, position.getPosition(7, 5));
  assertEqual(blackRookColor, pieceColor.BLACK);
  assertEqual(blackRookType, pieceType.ROOK);

  board.freeBoardID(boardID);
}

function testEnPassant() {
  const boardID = board.getBoardID();
  board.initializeBoard(boardID);

  assertEqual(simpleTryMove(boardID, 1, 7, 3, 7), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 0, 4, 0), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 7, 4, 7), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 6, 4, 6), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 4, 7, 5, 6), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 4, 0, 3, 0), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 1, 1, 3, 1), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 3, 0, 2, 1), status.STANDARD);

  const whitePawnColor = board.getPieceColor(boardID, position.getPosition(5, 6));
  const whitePawnType = board.getPieceType(boardID, position.getPosition(5, 6));
  assertEqual(whitePawnColor, pieceColor.WHITE);
  assertEqual(whitePawnType, pieceType.PAWN);

  const takenBlackPawnType = board.getPieceType(boardID, position.getPosition(4, 6));
  assertEqual(takenBlackPawnType, pieceType.NONE);

  const blackPawnColor = board.getPieceColor(boardID, position.getPosition(2, 1));
  const blackPawnType = board.getPieceType(boardID, position.getPosition(2, 1));
  assertEqual(blackPawnColor, pieceColor.BLACK);
  assertEqual(blackPawnType, pieceType.PAWN);

  const takenWhitePawnType = board.getPieceType(boardID, position.getPosition(3, 1));
  assertEqual(takenWhitePawnType, pieceType.NONE);

  board.freeBoardID(boardID);

}

function testPawnPromotion() {
  const boardID = board.getBoardID();
  board.initializeBoard(boardID);

  assertEqual(simpleTryMove(boardID, 1, 7, 3, 7), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 6, 0, 4, 0), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 3, 7, 4, 7), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 4, 0, 3, 0), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 4, 7, 5, 7), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 3, 0, 2, 0), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 5, 7, 6, 6), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 2, 0, 1, 1), status.STANDARD);

  assertEqual(simpleTryMove(boardID, 6, 6, 7, 7, pieceType.QUEEN), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 1, 1, 0, 0, pieceType.KNIGHT), status.STANDARD);

  const whitePromotionColor = board.getPieceColor(boardID, position.getPosition(7, 7));
  const whitePromotionType = board.getPieceType(boardID, position.getPosition(7, 7));
  assertEqual(whitePromotionColor, pieceColor.WHITE);
  assertEqual(whitePromotionType, pieceType.QUEEN);

  const blackPromotionColor = board.getPieceColor(boardID, position.getPosition(0, 0));
  const blackPromotionType = board.getPieceType(boardID, position.getPosition(0, 0));
  assertEqual(blackPromotionColor, pieceColor.BLACK);
  assertEqual(blackPromotionType, pieceType.KNIGHT);

  board.freeBoardID(boardID);
}

function testOpenerFalsePositives() {
  const boardID = board.getBoardID();
  board.initializeBoard(boardID);

  assertEqual(simpleTryMove(boardID, 0, 0, 1, 0), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 1, 1, 1), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 2, 1, 2), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 3, 1, 3), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 4, 1, 4), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 5, 1, 5), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 6, 1, 6), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 7, 1, 7), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 0, 2, 0), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 1, 2, 1), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 2, 2, 2), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 3, 2, 3), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 4, 2, 4), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 5, 2, 5), status.INVALID);

  assertEqual(simpleTryMove(boardID, 0, 6, 2, 6), status.INVALID);
  assertEqual(simpleTryMove(boardID, 0, 7, 2, 7), status.INVALID);

  assertEqual(simpleTryMove(boardID, 1, 3, 3, 3), status.STANDARD);
  assertEqual(simpleTryMove(boardID, 7, 0, 6, 0), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 1, 6, 1), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 2, 6, 2), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 3, 6, 3), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 4, 6, 4), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 5, 6, 5), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 6, 6, 6), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 7, 6, 7), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 0, 5, 0), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 1, 5, 1), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 2, 5, 2), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 3, 5, 3), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 4, 5, 4), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 5, 5, 5), status.INVALID);
  assertEqual(simpleTryMove(boardID, 7, 6, 5, 6), status.INVALID);

  assertEqual(simpleTryMove(boardID, 7, 7, 5, 7), status.INVALID);

  board.freeBoardID(boardID);
}

runTests();
