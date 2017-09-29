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
