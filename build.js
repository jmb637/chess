'use strict';

const browserify = require('browserify');
const fs = require('fs');

const b = browserify();
b.add('./scripts/ui/controller.js');
const destination = fs.createWriteStream('./chess.js');
b.bundle().pipe(destination);
