export const conf = {
    lineThickness: 5,   // default line thickness in pixels for user-drawn strokes
    sizeThreshold: 5,	// minimum number of points required for a stroke to be recorded
    structures: {       // definitions for all structure types the user can draw
        "House" : { color: '#f54242', regionType: "box"   },
        "Forest": { color: '#009632', regionType: "box"   },
        "Fence" : { color: '#4263f5ff', regionType: "box" },
        "Path"  : { color: '#ffae00ff', regionType: "trace" },
    }
}