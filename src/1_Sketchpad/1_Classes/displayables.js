/**
 * Represents a drawable user stroke on the canvas.
 * Wraps a `line` object containing stroke data and renders it via `ctx.lineTo()`.
 */
export class LineDisplayble {
  /**
   * @param {{
   *   points: Point[],
   *   thickness: number,
   *   hue: string|CanvasGradient|CanvasPattern
   * }} line - The line stroke to display.
   */
  constructor(line) { this.line = line; }

  /**
   * Renders the stroke on a canvas context.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   */
  display(ctx) {
    // set ctx line thickness
    ctx.lineWidth = this.line.thickness;

    // begin path and move to first point
    ctx.beginPath();
    ctx.moveTo(this.line.points[0].x, this.line.points[0].y); 
    
    // draw line segments to each remaining point
    for (const { x, y } of this.line.points) {
      ctx.lineTo(x, y);
    }

    // set stroke color and draw the full path
    ctx.strokeStyle = this.line.hue;
    ctx.stroke();
  }
}

/**
 * Represents a visual tool cursor. 
 * Used to render the user's brush position when not actively drawing.
 */
export class MouseDisplayable {
  /**
   * @param {{x: number, y: number, hue: string, active: boolean}} mouse - Current mouse state.
   * @param {number} lineThickness - Radius to draw for cursor preview.
   */
  constructor(mouse, lineThickness) { 
    this.mouse = mouse; 
    this.lineThickness = lineThickness;
  }
  
  /**
   * Renders a circular cursor if the mouse is inactive.
   * 
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   */
  display(ctx) {
    // only render if mouse is not actively drawing
    if (!this.mouse.active) {
      ctx.lineWidth = 2;
      ctx.beginPath();

      // draw a circle centered at mouse position      
      ctx.arc(
        this.mouse.x,
        this.mouse.y,
        this.lineThickness,  // radius
        0,
        2 * Math.PI,
        false,
      );

      // fill circle with hue of current tool
      ctx.fillStyle = this.mouse.hue;
      ctx.fill();
    }
  }

  hide(){
    this.lineThickness = 0;
    this.mouse.x = -1;
    this.mouse.y = -1;
  }
}