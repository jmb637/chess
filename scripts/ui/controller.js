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
      text += '<b>' + turnColorText + '</b> is in check.\n';
    }
    case status.STANDARD: {
      text += '<b>' + turnColorText + '\'s</b> turn to move...';
      break;
    }
    case status.CHECKMATE: {
      text += '<b>' + turnColorText + '</b> has been checkmated.\n';
      text += '<b>' + oppositeTurnColorText + '</b> wins!';
      break;
    }
    case status.STALEMATE: {
      text += '<b>Stalemate.</b>';
      break;
    }
  }

  statusLabel.innerHTML = text;
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
