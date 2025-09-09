// Used to extract the tile ID matrices from a tilemap's layers.

import Phaser from "../../lib/PhaserModule.js"

export default class TilemapDataMiner extends Phaser.Scene {
	tilemapLayers = [];
	currentTilemapIndex = 0;

	constructor() {
		super("tilemapDataMinerScene");
	}

	preload() {
		this.load.setPath("../../assets/");
		this.load.image("tilemap_tiles", "tinyTown_Tilemap_Packed.png");
		this.load.tilemapTiledJSON("map", "maps/map4.tmj");
	}

	create()
	{
		// ENTER DATA HERE
		const key = "map";
		const width = 40;	// in tiles
		const height = 25;	// in tiles
		const layerNames = [
			"Ground",
			"Structures"
		];
		const tileWidth = 16;
		const tileHeight = 16;


		this.createTilemap(key, width, height, layerNames);
		this.getGroundAndStructuresData(width, height);
		this.printMatrix(this.groundData);
		this.printMatrix(this.structuresData);
		this.createGroundAndStructuresTilemaps(tileWidth, tileHeight);
		this.setupControls();
	}

	/**
	 * @param {string} key 
	 * @param {number} width 
	 * @param {number} height
	 * @param {string[]} layerNames
	 */
	createTilemap(key, width, height, layerNames) {
		this.tilemap = this.add.tilemap(key, 16, 16, width, height);
		this.tileset = this.tilemap.addTilesetImage("kenney-tiny-town", "tilemap_tiles");
		this.layers = [];
		for (const name of layerNames) {
			this.layers.push(this.tilemap.createLayer(name, this.tileset, 0, 0));
		}
		this.tilemapLayers.push(this.layers);
	}

	/**
	 * @param {number} width 
	 * @param {number} height 
	 */
	getGroundAndStructuresData(width, height) {
		this.groundData = [];
		this.structuresData = [];
		for (let y = 0; y < height; y++) {
			this.groundData[y] = [];
			this.structuresData[y] = [];
			for (let x = 0; x < width; x++) {
				this.groundData[y][x] = -1;
				this.structuresData[y][x] = -1;
			}
		}

		// Fill in definite tiles
		for (const layer of this.layers) {
			const data = layer.layer.data;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const id = data[y][x].index;
					if (id < 1) {
						continue;
					} else if ([1, 2, 3].includes(id)) {	// id is 1, 2, or 3
						this.groundData[y][x] = id;
					} else {
						this.structuresData[y][x] = id;
					}
				}
			}
		}

		// Fill in missing grass tiles
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const id = this.groundData[y][x];
				if (id < 1) {
					this.groundData[y][x] = this.getWeightedRandomGrassID();
				}
			}
		}
	}

	getWeightedRandomGrassID() {
		// used https://dev.to/jacktt/understanding-the-weighted-random-algorithm-581p
		const ids = [1,	2, 3];
		const weights = [45, 45, 10];	// 45%, 45%, 10% - this is the actual ratio from the pathfinder map
		let total = 0;
		for (const weight of weights) {
			total += weight;
		}

		const random = Math.random() * total;

		let cursor = 0;
		for (let i = 0; i < weights.length; i++) {
			cursor += weights[i];
			if (cursor >= random) {
				return ids[i];
			}
		}
		throw new Error("Math did not check out");
	}

	/** @param {number[][]} matrix */
	printMatrix(matrix) {
		let result = "[\n";
		for (const row of matrix) {
			result += "[";
			for (const id of row) {
				result += id + ",";
			}
			result += "],\n";
		}
		result += "]";
		console.log(result);
	}

	/**
	 * @param {number} tileWidth 
	 * @param {number} tileHeight 
	 */
	createGroundAndStructuresTilemaps(tileWidth, tileHeight) {
		this.groundTilemap = this.make.tilemap({
			data: this.groundData,
			tileWidth: tileWidth,
			tileHeight: tileHeight
		});
		this.groundTilemapLayer = this.groundTilemap.createLayer(0, this.tileset, 0, 0);
		this.groundTilemapLayer.setVisible(false);
		this.tilemapLayers.push([this.groundTilemapLayer]);

		this.structuresTilemap = this.make.tilemap({
			data: this.structuresData,
			tileWidth: tileWidth,
			tileHeight: tileHeight
		});
		this.structuresTilemapLayer = this.structuresTilemap.createLayer(0, this.tileset, 0, 0);
		this.structuresTilemapLayer.setVisible(false);
		this.tilemapLayers.push([this.structuresTilemapLayer]);
	}

	setupControls() {
		this.prevTilemap_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
		this.nextTilemap_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

		this.prevTilemap_Key.on("down", () => this.changeTilemap(-1));
		this.nextTilemap_Key.on("down", () => this.changeTilemap(1));

		const controls = `
		<h2>Controls</h2>
		Change Tilemap: LEFT/RIGHT
		`;

	}

	/** @param {number} di delta index */
	changeTilemap(di) {
		for (const layer of this.tilemapLayers[this.currentTilemapIndex]) {
			layer.setVisible(false);
		}

		let i = this.currentTilemapIndex;
		const len = this.tilemapLayers.length;
		this.currentTilemapIndex = this.changeIndexWrapping(i, len, di);
		for (const layer of this.tilemapLayers[this.currentTilemapIndex]) {
			layer.setVisible(true);
		}

		i = this.currentTilemapIndex;
		for (const layer of this.tilemapLayers[this.changeIndexWrapping(i, len, di)]) {
			layer.setVisible(false);
		}
	}

	/**
	 * @param {number} i current index
	 * @param {number} len length of array
	 * @param {number} di delta index
	 * @returns {number} the new index
	 */
	changeIndexWrapping(i, len, di) {
		return (i + di + (di<0 ? len : 0)) % len;	// got formula from https://banjocode.com/post/javascript/iterate-array-with-modulo
	}
}