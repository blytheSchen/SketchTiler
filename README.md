# SketchTiler
SketchTiler is a tilemap generation tool that transforms hand-drawn sketches into structured, game-ready maps. It enables quick ideation and prototyping using a simple structure pen interface and wave function collapse.

**Ideal for:**
- Game level design
- Conceptual prototyping
- Creative sketch-to-map workflows

> This project is part of ongoing research. A link to our IEEE demo paper will be added here soon!

| Sketch input | Output (w/ suggestion layer) |
|--------------|------------------|
| ![](/img/sketchImage.png) | ![](/img/map_suggestions.png) | 

## How to use
No build step required, this project is static HTML/JS/CSS. Clone the repo and serve the project using any simple static server. For example:

**Using Python 3 (built-in):**
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

**Using npm (http-server):**
```bash
# install once if you don't have it
npm install -g http-server

# then, from the project root
http-server .
```
Then open the URL shown in your terminal (usually [http://localhost:8080](http://localhost:8080)).

**Using VS Code Live Server extension:**
- Right-click `index.html` → *Open with Live Server*.

## How it works
### Structure Pens + Metadata
In SketchTiler's sketchpad, structure pens ("House", "Forest") tag each stroke with structural metadata. This data helps define regions for generation.

SketchTiler then:
1. Parses these regions
2. Calls corresponding structure generators
3. Renders a suggestion layer

### Wave Function Collapse
All procedural generation in SketchTiler is powered by wave function collapse (WFC). WFC works by treating each cell in a grid as a “superposition” of all possible tiles. As cells are resolved (or collapsed) into specific tiles, the algorithm propagates adjacency constraints outward, ensuring that the surrounding cells remain consistent. This process repeats until the grid forms a coherent map that respects the rules learned from example data.

In SketchTiler, WFC is applied in two stages:
- *Structure generators*: Mini WFC models trained on example houses, forests, etc.
- *Suggestion Layer*: A general WFC model trained on full tilemaps. Suggests background context around user-defined structures.

Structure generators are used to generate user-sketched structures. The suggestion layer generates natural transitions and background context around the placed structures, ensuring the overall map feels coherent and complete.

This two-pass pipeline lets users directly control the macro structure of their map through sketching, while WFC handles the micro details and stylistic consistency.

## Output
Use the export buttons to download sketch data and/or tilemap data. Each zip file contains a snapshot of the associated canvas and a JSON file containing data that can be used in future SketchTiler sessions (sketch exports) or in a Phaser scene (map exports). 

![](/img/map_gif.gif)(Sketchtiler-generated map in a Phaser game)

## Future work
SketchTiler is still an active research prototype. Planned improvements include:

**WFC improvements**
- Optimizations for speed and memory efficiency
- Support for larger and more complex maps

**AI integration**
- Sketch-based suggestions via an AI-powered co-sketching agent that can add additional structures or complete unfinished sketches
- Natural language prompts for structure placement (e.g., “add a forest here”)

## Acknowledgements
- Professor Jim Whitehead and the Augmented Design Lab at UC Santa Cruz
- Maxim Gumin's [WFC algorithm](https://github.com/mxgmn/WaveFunctionCollapse)
- Kenney Assets [Tiny Town Tileset](https://kenney.nl/assets/tiny-town)
