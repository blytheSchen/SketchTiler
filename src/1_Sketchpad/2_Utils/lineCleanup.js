/**
 * @fileoverview Line simplification and smoothing utilities.
 * Includes:
 * - Ramer-Douglas-Peucker for shape-preserving simplification
 * - Chaikin's Algorithm for soft curve smoothing
 */

const sketchCanvas = document.getElementById("sketch-canvas");

/**
 * Simplifies a path using the Ramer-Douglas-Peucker algorithm.
 * Reduces the number of points while preserving the general shape of the line.
 *
 * @param {Point[]} points - Original set of stroke points.
 * @param {number} tolerance - Minimum perpendicular distance required to keep a point.
 * @returns {Point[]} Simplified list of points.
 */
export function ramerDouglasPeucker(points, tolerance) {
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  // Find the point with the maximum perpendicular distance
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  // If the maximum distance is greater than the tolerance, recursively simplify
  if (dmax > tolerance) {
    const left = ramerDouglasPeucker(points.slice(0, index + 1), tolerance);
    const right = ramerDouglasPeucker(points.slice(index), tolerance);
    return [...left.slice(0, left.length - 1), ...right];
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Computes the perpendicular distance from a point to a line segment.
 * https://www.geeksforgeeks.org/perpendicular-distance-between-a-point-and-a-line-in-2-d/
 * 
 * @param {Point} point - The point to test.
 * @param {Point} start - Start of the line.
 * @param {Point} end - End of the line.
 * @returns {number} Distance from the point to the line.
 */
function perpendicularDistance(point, start, end) {
  const xDiff = end.x - start.x;
  const yDiff = end.y - start.y;

  // determinant of the triange defined by (start, end, point) 
  const determinant = yDiff * point.x - xDiff * point.y + end.x * start.y - end.y * start.x;

  // length of the line segment (hypotenuse of right triangle).
  const length = Math.sqrt(Math.pow(yDiff, 2) + Math.pow(xDiff, 2));

  const numerator = Math.abs(determinant);
  const denominator = length;

  return numerator / denominator;
}

/**
 * Smooths a path using Chaikin's algorithm.
 * Produces a soft curve from a polygonal stroke.
 * https://medium.com/@jrespinozah/creating-smooth-curves-with-chaikins-algorithm-a0ad91d98ef7 
 *
 * @param {Point[]} points - Original list of stroke points.
 * @param {number} [iterations=2] - Number of smoothing passes.
 * @returns {Point[]} Smoothed set of points.
 */
export function chaikinSmooth(points, iterations = 2) {
  let result = points;

  // multiple smoothing passes
  for (let iter = 0; iter < iterations; iter++) {
    const newPoints = [result[0]];  // preserve start point

    // loop through each segment between two consecutive points
    for (let i = 0; i < result.length - 1; i++) {
      const p1 = result[i];
      const p2 = result[i + 1];

      // Chaikin subdivision: 1/4 and 3/4 interpolation
      // this "cuts the corner" and forms the basis of the smooth curve
      const a = {
        x: 0.75 * p1.x + 0.25 * p2.x,
        y: 0.75 * p1.y + 0.25 * p2.y
      };
      const b = {
        x: 0.25 * p1.x + 0.75 * p2.x,
        y: 0.25 * p1.y + 0.75 * p2.y
      };

      // snap to canvas bounds
      if(a.x < 0) a.x = 0;
      else if(a.x >= sketchCanvas.width) a.x = sketchCanvas.width-1;
      
      if(a.y < 0) a.y = 0;
      else if(a.y >= sketchCanvas.height) a.y = sketchCanvas.height-1;

      newPoints.push(a, b);
    }

    newPoints.push(result[result.length - 1]);  // preserve end point
    result = newPoints;
  }

  return result;
}

