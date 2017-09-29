'use strict';

module.exports = Object.freeze({
  NONE: 0,
  WHITE: 1,
  BLACK: 2,
  opposite(color) {
    return color === this.WHITE ? this.BLACK : this.WHITE;
  }
});
