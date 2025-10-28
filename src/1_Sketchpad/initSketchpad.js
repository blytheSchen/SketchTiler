/**
 * @fileoverview
 * Initializes and sizes the sketchpad, grid canvas, and sketch canvas
 * based on the current TILEMAP configuration. Also renders a visual grid overlay.
 */

import TILEMAP from "../4_Phaser/tilemap.js";
import "./sketchpad.js"; // so the file is executed

const tilesetInfo = TILEMAP["tiny_town"];

/**
 * Initializes the sketchpad dimensions and rendering settings.
 * Sets canvas sizes based on TILEMAP settings and draws a grid overlay.
 */
export default function initSketchpad() {
  const width = tilesetInfo.WIDTH * tilesetInfo.TILE_WIDTH;
  const height = tilesetInfo.HEIGHT * tilesetInfo.TILE_WIDTH;

  const sketchpad = document.getElementById("sketchpad");
  sketchpad.style.width = `${width}px`;
  sketchpad.style.height = `${height}px`;

  const gridCanvas = document.getElementById("grid-canvas");
  gridCanvas.width = width;
  gridCanvas.height = height;
  drawGrid(gridCanvas);

  const sketchCanvas = document.getElementById("sketch-canvas");
  sketchCanvas.width = width;
  sketchCanvas.height = height;
  sketchCanvas.getContext("2d").font = "30px serif";
}

/**
 * Draws a uniform grid on `canvas`.
 * Each grid cell has the same dimensions as a tilemap tile.
 * @param {HTMLElement} canvas
 */

export function drawGrid(canvas, scale = 1.0, panX = 0, panY = 0) {
  const ctx = canvas.getContext("2d");

  const gridWidth = tilesetInfo.WIDTH * tilesetInfo.TILE_WIDTH;
  const gridHeight = tilesetInfo.HEIGHT * tilesetInfo.TILE_WIDTH;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scale, 0, 0, scale, panX, panY);

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, gridWidth, gridHeight);

  ctx.strokeStyle = "#DBDBDB";
  ctx.lineWidth = 1 / scale;

  for (let x = 0; x <= gridWidth; x += tilesetInfo.TILE_WIDTH) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gridHeight);
    ctx.stroke();
  }

  for (let y = 0; y <= gridHeight; y += tilesetInfo.TILE_WIDTH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gridWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

