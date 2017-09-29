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
