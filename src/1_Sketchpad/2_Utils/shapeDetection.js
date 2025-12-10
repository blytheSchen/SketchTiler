/**
 * @fileoverview Shape detection utilities for sketch input.
 * Uses point simplification and angle analysis to classify strokes as circles, rectangles, or triangles.
 */
import { ramerDouglasPeucker } from "./lineCleanup.js";

const sketchCanvas = document.getElementById("sketch-canvas");

/**
 * Attempts to classify a point array as a known shape.
 * @param {Point[]} pts - Stroke points.
 * @returns {{name: string, points: Point[]}|false} Shape name and normalized points, or false if no match.
 */
export function getShape(pts) {
    window.generatedTriangles = null;
    
    const circle = isCircle(pts);
    if (circle) return { name: "circle", points: circle };

    const rect = isRect(pts);
    if (rect) return { name: "rect", points: rect };

    const tri = isTriangle(pts);
    if (tri) return { name: "triangle", points: tri };

    if (isClosed(pts)) {
        // Clean up the lines slightly so we don't have 1000s of tiny triangles
        const simplifiedPts = ramerDouglasPeucker(pts, 10);
        
        if (!isClockwise(simplifiedPts)) {
            simplifiedPts.reverse();
        }

        // Triangulate the polygon
        const triangles = triangulate(simplifiedPts);

        window.generatedTriangles = triangles;

        // Does not show for very long, but this is the debugging code
        setTimeout(() => {
            const ctx = sketchCanvas.getContext("2d");
            drawDebugTriangles(ctx, triangles);
        }, 1000); // Waits 1000ms (1 second) before drawing
        
        return { name: "polygon", triangles: triangles, points: simplifiedPts };
    }

    return false;
}

/**
 * Determines whether a stroke forms a triangle.
 * @param {Point[]} pts
 * @returns {Point[]|false}
 */
function isTriangle(pts){
	if (!isClosed(pts)) return false;
    
    // simplify long strokes
    const anglePts = (pts.length > 5) ? ramerDouglasPeucker(pts, 10) : pts;  
    
    // check for 3 sharp angles
    if (countSharpAngles(anglePts) === 3){ 
        // normalize points to a trangle shape
        return normalizeTriangle(anglePts); 
    }

    return false;
}

/**
 * Determines whether a stroke forms a rectangle.
 * @param {Point[]} pts
 * @returns {Point[]|false}
 */
function isRect(pts){
	if (!isClosed(pts)) return false;

    // simplify long strokes
    const anglePts = (pts.length > 4) ? ramerDouglasPeucker(pts, 10) : pts;   
    
    // check for 4 sharp angles
    if (countSharpAngles(anglePts) === 4){ 
        // normalize points to a rectangle shape
        return normalizeRect(anglePts);
    }

    return false;
}

/**
 * Determines whether a stroke forms a circle.
 * @param {Point[]} pts
 * @param {number} [threshold=500] - Max allowed radius variance.
 * @returns {Point[]|false}
 */
function isCircle(pts, threshold = 500) {
	if (!isClosed(pts)) return false;

    // reject strokes with too few points
    if (pts.length < 10) return false;

    // reject strokes with too small perimeter
    const totalDist = pts.reduce(   // get perimeter from pts
        (sum, p, i) => {
            if (i === 0) return 0;
            const prev = pts[i - 1];
            return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
        }, 0
    );
    if (totalDist < 100) return false;  
    
    // simplify larger strokes
    const anglePts = (pts.length < 50) ? pts : ramerDouglasPeucker(pts, 10); 

    // check for sharp angles to prevent polygons from being classified as circles
    if (countSharpAngles(anglePts) > 2) return false;

    // all pre-checks done, now checking for circle attributes
    // get center point
	const center = getCentroid(pts);

	// for each point, compute euclidean distance to the center 
	const distances = pts.map(p => Math.hypot(p.x - center.x, p.y - center.y));

	// calculate average radius
	const avg = distances.reduce((a, b) => a + b, 0) / distances.length;

	// calculate how far each distance is from avg
	const variance = distances.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / distances.length;
  
	// higher threshold = more sloppiness allowed
	if(variance < threshold){
        // normalize points to a circle shape
        return normalizeCircle(center, avg);
    }

    return false;
}

/**
 * Normalizes a rectangle shape from rough points.
 * @param {Point[]} pts
 * @returns {Point[]}
 */
function normalizeRect(pts){
    const points = [];

    // get topleft-most point
    const topLeft = pts.reduce((acc, p) => ({
        x: Math.min(acc.x, p.x),
        y: Math.min(acc.y, p.y)
    }), { x: Infinity, y: Infinity });

    // snap topLeft to canvas bounds
    if(topLeft.x < 0) topLeft.x = 0;
    if(topLeft.y < 0) topLeft.y = 0;
      
    // get bottomright-most point
    const bottomRight = pts.reduce((acc, p) => ({
        x: Math.max(acc.x, p.x),
        y: Math.max(acc.y, p.y)
    }), { x: -Infinity, y: -Infinity });

    // snap bottomright to canvas bounds
    if(bottomRight.x >= sketchCanvas.width-1) bottomRight.x = sketchCanvas.width-1;
    if(bottomRight.y >= sketchCanvas.height-1) bottomRight.y = sketchCanvas.height-1;

    // write corners to points array
    points.push(topLeft);                           // top left
    points.push({x: bottomRight.x, y: topLeft.y});  // top right
    points.push(bottomRight);                       // bottom right
    points.push({x: topLeft.x, y: bottomRight.y});  // bottom left
    points.push(topLeft);                           // closes shape

    return points;
}

/**
 * Normalizes triangle by ensuring it's closed.
 * @param {Point[]} pts
 * @returns {Point[]}
 */
function normalizeTriangle(pts){
    pts.pop();
    pts.push(pts[0]);
    return pts;
}


/**
 * Generates evenly spaced circle points from center and radius.
 * @param {Point} center
 * @param {number} radius
 * @param {number} [numPoints=60]
 * @returns {Point[]}
 */
function normalizeCircle(center, radius, numPoints = 60) { 
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;

      // calculate point position on circle, drawn around center
      // x = r cos(θ), y = r sin(θ) 
      // https://www.mathopenref.com/coordparamcircle.html#:~:text=A%20circle%20can%20be%20defined,%CE%B8
      let point = {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      }

      // snap point coords to canvas bounds
      if(point.x < 0) point.x = 0;
      else if(point.x >= sketchCanvas.width-1) point.x = sketchCanvas.width-1;
      
      if(point.y < 0) point.y = 0;
      else if(point.y >= sketchCanvas.height-1) point.y = sketchCanvas.height-1;

      // add point to array
      points.push(point);
    }

    points.push(points[0]); // close circle
    return points;
}
   

/**
 * Computes centroid of a set of points.
 * @param {Point[]} pts
 * @returns {Point} - Centroid of `pts`
 */
function getCentroid(pts) {
    // get sum of x- and y-coords
	const sum = pts.reduce((acc, p) => (
		{ x: acc.x + p.x, y: acc.y + p.y }
	));

    // average of x- and y-coords
	return { 
        x: sum.x / pts.length, 
        y: sum.y / pts.length 
    };
}


/**
 * Determines if a stroke is closed by checking if end point is near start.
 * @param {Point[]} pts
 * @param {number} [threshold=60]
 * @returns {boolean}
 */
function isClosed(pts, threshold = 60) {
	// compute euclidean distance between start and end point
	const dist = Math.hypot(
		pts[0].x - pts[pts.length - 1].x, 
		pts[0].y - pts[pts.length - 1].y
	);
	return dist < threshold;
}

/**
 * Counts sharp angles between adjacent point triplets.
 * @param {Point[]} points
 * @param {number} [angleThreshold=110] Max angle (in degrees) to be considered "sharp".
 * @returns {number} The number of sharp angles detected in the path
 */
export function countSharpAngles(points, angleThreshold = 110) {
    let sharpAngles = 0;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];  // previous point
        const b = points[i];      // current (corner) point
        const c = (i === points.length - 1) 
        ? points[1]               // wrap if last point
        : points[i + 1];          // next point

        // construct vectors from b to a and b to c
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };

        // compute the dot product between the vectors
        const dot = ab.x * cb.x + ab.y * cb.y;

        // get the magnitudes (lengths) of each vector
        const magAB = Math.hypot(ab.x, ab.y);
        const magCB = Math.hypot(cb.x, cb.y);

        // compute cosine of the angle using the dot product formula
        const cosAngle = dot / (magAB * magCB);

        // convert from radians to degrees
        const angle = Math.acos(cosAngle) * (180 / Math.PI);

        // if the angle is less than the threshold, count it as sharp
        if (angle < angleThreshold) {
            sharpAngles++;
        }
    }

    return sharpAngles;
}

function triangulate(pts) {
    console.log("Triangulating polygon with", pts.length, "points");
    // Clone points so we don't destroy the original drawing data
    let vertices = [...pts]; 
    const triangles = [];

    // Ear Clipping Loop
    while (vertices.length > 3) {
        for (let i = 0; i < vertices.length; i++) {
            // Get 3 consecutive points
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const c = vertices[(i + 2) % vertices.length];

            // 1. Check if angle at B is convex (less than 180)
            if (isConvex(a, b, c)) {
                // 2. Check if no other point is inside this triangle
                if (!containsPoints(a, b, c, vertices)) {
                    // It's an ear! Clip it.
                    triangles.push([a, b, c]);
                    
                    // Remove vertex b from the list
                    vertices.splice((i + 1) % vertices.length, 1);
                    break; 
                }
            }
        }
    }
    
    // The remaining 3 vertices form the final triangle
    triangles.push([vertices[0], vertices[1], vertices[2]]);
    
    return triangles;
}
  
/**
 * Checks if the angle at vertex b (formed by a->b->c) is convex (less than 180 degrees).
 * This assumes the polygon vertices are ordered (usually clockwise).
 */
function isConvex(a, b, c) {
    // Cross product of vectors (b-a) and (c-b)
    // In screen coordinates (y points down), the sign tells us the turn direction.
    const crossProduct = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    
    // This is why there is that reverse() call earlier - we want clockwise order
    return crossProduct < 0; 
}

/**
 * Checks if any vertex in the remaining polygon list lies INSIDE the triangle abc.
 * We must ignore a, b, and c themselves.
 */
function containsPoints(a, b, c, vertices) {
    for (let i = 0; i < vertices.length; i++) {
        const p = vertices[i];
        // Skip the vertices that make up the triangle itself
        if (p === a || p === b || p === c) continue;

        if (pointInTriangle(p, a, b, c)) {
            return true;
        }
    }
    return false;
}

function pointInTriangle(p, a, b, c) {
    const v0 = { x: c.x - a.x, y: c.y - a.y };
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: p.x - a.x, y: p.y - a.y };

    const dot00 = (v0.x * v0.x) + (v0.y * v0.y);
    const dot01 = (v0.x * v1.x) + (v0.y * v1.y);
    const dot02 = (v0.x * v2.x) + (v0.y * v2.y);
    const dot11 = (v1.x * v1.x) + (v1.y * v1.y);
    const dot12 = (v1.x * v2.x) + (v1.y * v2.y);

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v < 1);
}

function isClockwise(pts) {
    // Sum over the edges: (x2 - x1) * (y2 + y1)
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
        const current = pts[i];
        const next = pts[(i + 1) % pts.length];
        sum += (next.x - current.x) * (next.y + current.y);
    }
    return sum > 0;
}

// DEBUGGER: Draws the calculated triangles onto the canvas.
function drawDebugTriangles(ctx, triangles) {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;

    for (const tri of triangles) {
        ctx.beginPath();
        ctx.moveTo(tri[0].x, tri[0].y);
        ctx.lineTo(tri[1].x, tri[1].y);
        ctx.lineTo(tri[2].x, tri[2].y);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Draw the vertices as dots so we can see the "corners"
    ctx.fillStyle = 'green';
    for (const tri of triangles) {
        for(const p of tri){
             ctx.beginPath();
             ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
             ctx.fill();
        }
    }

    // Draw Bounding Box (Blue)
    // Calculate bounds from the triangles
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const tri of triangles) {
        for (const p of tri) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
    }
    
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 4;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    ctx.restore();
}