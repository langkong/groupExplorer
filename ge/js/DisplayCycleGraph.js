// @flow
/*::
import Log from './Log.md';
import CycleGraph from './CycleGraph.js';
import type {Highlights} from './CycleGraph.js';

type Options = {width?: number, height?: number, container?: JQuery};

export type CycleGraphJSON = {groupURL: string, highlights: Highlights, elements: Array<groupElement>}

export default
 */
class DisplayCycleGraph {
/*::
   static DEFAULT_MIN_CANVAS_HEIGHT: number;
   static DEFAULT_MIN_CANVAS_WIDTH: number;
   static DEFAULT_MIN_RADIUS: number; 
   static DEFAULT_ZOOM_STEP: number;
   static DEFAULT_CANVAS_WIDTH: number;
   static DEFAULT_CANVAS_HEIGHT: number;

   canvas: HTMLCanvasElement;
   context: CanvasRenderingContext2D;
   options: Options;
   zoomFactor: number;
   translate: {dx: number, dy: number};
   transform: THREE.Matrix3;
   cycleGraph: CycleGraph;
   radius: number;
 */
   constructor(options /*: Options */) {
      Log.debug('DisplayCycleGraph');

      DisplayCycleGraph._setDefaults();

      if (options === undefined) {
         options = {};
      }

      this.canvas = (($(`<canvas/>`)[0] /*: any */) /*: HTMLCanvasElement */);
      let width = (options.width === undefined) ? DisplayCycleGraph.DEFAULT_CANVAS_WIDTH : options.width;
      let height = (options.height === undefined) ? DisplayCycleGraph.DEFAULT_CANVAS_HEIGHT : options.height;
      const container = options.container;
      if (container != undefined) {
         // take canvas dimensions from container (if specified), option, or default
         width = container.width();
         height = container.height();
         container.append(this.canvas);
      }
      this.setSize( width, height );
      this.context = this.canvas.getContext('2d');
      this.options = options;
      this.zoomFactor = 1;  // user-supplied scale factor multiplier
      this.translate = {dx: 0, dy: 0};  // user-supplied translation, in screen coordinates
      this.transform = new THREE.Matrix3();  // current cycleGraph -> screen transformation
   }

   setSize(w /*: number */, h /*: number */) {
      this.canvas.width = w;
      this.canvas.height = h;
   }
   getSize() /*: {w: number, h: number} */ {
      return { w: this.canvas.width, h: this.canvas.height };
   }

   static _setDefaults() {
      DisplayCycleGraph.DEFAULT_MIN_CANVAS_HEIGHT = 200;
      DisplayCycleGraph.DEFAULT_MIN_CANVAS_WIDTH = 200;
      DisplayCycleGraph.DEFAULT_MIN_RADIUS = 30;
      DisplayCycleGraph.DEFAULT_ZOOM_STEP = 0.1;  // zoom in/zoom out step
   }

   getImage(cycleGraph /*: CycleGraph */, options /*:: ?: {size?: 'small' | 'large'} */ = {} ) /*: Image */ {
      // Options parameter:
      // size: "small" or "large", default is "small"
      options = {size: (options.hasOwnProperty('size')) ? options.size : 'small'};
      if ( options.size == 'large' )
         this.showLargeGraphic(cycleGraph);
      else
         this.showSmallGraphic(cycleGraph);
      const img = new Image();
      img.src = this.canvas.toDataURL();
      return img;
   }

   // This function makes a small graphic by doing the exact same thing
   // it would do to create a large graphic, with one exception:
   // It passes an optional second parameter to that routine, so that
   // it hides all element names, thus making the vertices in the graph
   // much smaller, and thus the image itself much smaller as well.
   showSmallGraphic(cycleGraph /*: CycleGraph */) {
      this.showLargeGraphic( cycleGraph, true );
   }

   // Draws the visualization at an optimal (large) size.
   // All the data needed about the group and how to lay it out in the
   // plane has been computed at construction time by the cycleGraph
   // object, and we can leverage that here and just do drawing.
   // The second parameter, which defaults to true, says whether to omit
   // the names inside the elements.  (False == normal behavior, true
   // == a smaller graphic in the end, useful for thumbnails.)
   showLargeGraphic(cycleGraph /*: CycleGraph */, hideNames /*: boolean */ = false) {
      // save the cycle graph for use by other members of this object
      this.cycleGraph = cycleGraph;

      const bbox = cycleGraph.bbox;

      // paint the background
      this.context.setTransform(1, 0, 0, 1, 0, 0);  // reset the transform, so repeated calls paint entire background
      this.context.fillStyle = '#C8C8E8';
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // calculate node radius in cycleGraph units
      const max_cg_dimension = Math.max(bbox.right - bbox.left, bbox.top - bbox.bottom);
      const pixels2cg = (val) => val * Math.min((bbox.right-bbox.left)/this.canvas.width, (bbox.top-bbox.bottom)/this.canvas.height);
      const bestSize = (r) => r*Math.max(10, 8 + 2.5*max_cg_dimension/cycleGraph.closestTwoPositions, 200/r); // min size = 200
      if (hideNames) {
         this.radius = pixels2cg(6 * this.canvas.width / bestSize(6));  // size for nodes in thumbnails
      } else {
         this.radius = Math.min(cycleGraph.closestTwoPositions/2.5, max_cg_dimension/10);
      }

      // set up scaling, translation from cycleGraph units to screen pixels
      // leave room around bbox for node radius + space (which we set to another node radius)
      const margin = 2 * this.radius;
      // canvas / bbox ratio
      const raw_scale = Math.min(this.canvas.width / (bbox.right - bbox.left + 2 * margin),
                                 this.canvas.height / (bbox.top - bbox.bottom + 2 * margin) );
      // scale with zoom
      let scale = this.zoomFactor * raw_scale;

      // translate center of scaled bbox to center of canvas
      let x_translate = (this.canvas.width - scale*(bbox.right + bbox.left))/2;
      let y_translate = (this.canvas.height - scale*(bbox.top + bbox.bottom))/2;

      // algorithm doesn't cover trivial group, treat it specially
      if (this.cycleGraph.group.order == 1) {
         const sideLength = Math.min(this.canvas.width, this.canvas.height);
         this.radius = sideLength / 10;
         scale = this.zoomFactor * sideLength / (sideLength + 4 * this.radius);
         x_translate = this.canvas.width / 2;
         y_translate = this.canvas.height / 2;
      }

      // set transform to include translation generated by user drag-and-drop
      this.context.setTransform(scale, 0, 0, scale, x_translate + this.translate.dx, y_translate + this.translate.dy);

      // transform used to position the labels in screen space
      //   calculated even if we don't render labels because they're too small,
      //   since select method also uses this to determine element from node click
      this.transform.set(scale, 0,     x_translate + this.translate.dx,
                         0,     scale, y_translate + this.translate.dy,
                         0,     0,     1);
      // calculate the pre_image of the screen, in order to skip drawing labels on nodes not in view
      const upper_left = new THREE.Vector2(0, 0).applyMatrix3(new THREE.Matrix3().getInverse(this.transform));
      const lower_right = new THREE.Vector2(this.canvas.width, this.canvas.height).applyMatrix3(new THREE.Matrix3().getInverse(this.transform));
      const pre_image = {minX: upper_left.x, minY: upper_left.y, maxX: lower_right.x, maxY: lower_right.y};

      // draw all the paths first, because they're behind the vertices
      this.context.lineWidth = 1/scale;
      this.context.strokeStyle = '#000';
      cycleGraph.cyclePaths.forEach( points => {
         var isDrawing = true; // was the last
         this.context.beginPath();
         points.pts.forEach( ( point, index ) => {
            // is the current point in the view?
            var pointVisible = point.x > pre_image.minX && point.x < pre_image.maxX
                            && point.y > pre_image.minY && point.y < pre_image.maxY;
            if ( index == 0 ) {
                // always move to the start of the path
                this.context.moveTo( point.x, point.y );
            } else if ( isDrawing ) {
                // the entire line segment from index-1 to index is visible; draw it,
                // and you can assume that we already did lineTo() the last point.
                this.context.lineTo( point.x, point.y );
            } else if ( pointVisible ) {
                // the previous point was out of view but this one is in view; draw it,
                // but you can't assume that we already did lineTo() the last point.
                var prev = points.pts[index-1];
                this.context.moveTo( prev.x, prev.y );
                this.context.lineTo( point.x, point.y );
            }
            // update isDrawing to reflect whether the last drawn point was in the view
            isDrawing = pointVisible;
         } );
         this.context.stroke();
      } );

      // draw all elements as vertices, on top of the paths we just drew
      cycleGraph.positions.forEach( ( pos, elt ) => {
         // skip nodes that are off screen
         if ( pos.x + this.radius < pre_image.minX || pos.x - this.radius > pre_image.maxX
           || pos.y + this.radius < pre_image.minY || pos.y - this.radius > pre_image.maxY )
            return;
         // draw the background, defaulting to white, but using whatever
         // highlighting information for backgrounds is in the cycleGraph
         this.context.beginPath();
         this.context.arc( pos.x, pos.y, this.radius, 0, 2 * Math.PI );
         if ( cycleGraph.highlights && cycleGraph.highlights.background
           && cycleGraph.highlights.background[elt] ) {
            this.context.fillStyle = cycleGraph.highlights.background[elt].toString();
         } else {
            this.context.fillStyle = '#fff';
         }
         this.context.fill();

         // over the background, only if there is "top"-style highlighting,
         // draw a little cap on the top of the vertex's circle
         if ( cycleGraph.highlights && cycleGraph.highlights.top
           && cycleGraph.highlights.top[elt] ) {
            this.context.beginPath();
            this.context.arc( pos.x, pos.y, this.radius, -3*Math.PI/4, -Math.PI/4 );
            this.context.fillStyle = cycleGraph.highlights.top[elt].toString();
            this.context.fill();
         }

         // draw the border around the node, defaulting to thin black,
         // but using whatever highlighting information for borders is
         // in the cycleGraph, and if it's there, making it thick
         this.context.beginPath();
         this.context.arc( pos.x, pos.y, this.radius, 0, 2 * Math.PI );
         if ( cycleGraph.highlights && cycleGraph.highlights.border
           && cycleGraph.highlights.border[elt] ) {
            this.context.strokeStyle = cycleGraph.highlights.border[elt].toString();
            this.context.lineWidth = 5/scale;
         } else {
            this.context.strokeStyle = '#000';
            this.context.lineWidth = 1/scale;
         }
         this.context.stroke();
      } );

      // all done except for labels
      if (hideNames) {
         return;
      }

      // pick sensible font size and style for node labels
      // find longest rep, find it's size in 14pt font, and choose a font size that lets rep fit within the default node
      // (this is done in screen coordinates because scaling text from cycleGraph coordinates had too many gotchas -- rwe)
      this.context.setTransform(1,0,0,1,0,0);
      this.context.font = '14pt Arial';
      const longest_label_length = this.context.measureText(cycleGraph.group.longestLabel).width;

      // "1" is to make short, tall names (like g^2) fit heightwise
      // "22" is a magic number that combines diameter/radius, effect of curved edges, point/pixel ratio, etc.
      //   -- but don't make font bigger than 50pt in any case
      const fontScale = Math.min(50, scale * this.radius * Math.min(1, 22 / longest_label_length));

      // skip out if this font would be too small to see anyhow
      if (fontScale < 1.5) {
         return;
      }

      // now draw all the labels, skipping nodes outside of the pre_image
      this.context.font = `${fontScale.toFixed(6)}pt Arial`;
      this.context.textAlign = 'center';
      this.context.textBaseline = 'middle';
      this.context.fillStyle = '#000';

      const pos_vector = new THREE.Vector2();
      cycleGraph.positions.forEach( ( pos, elt ) => {
         // skip nodes that are off the screen
         if (   pos.x < pre_image.minX || pos.x > pre_image.maxX
             || pos.y < pre_image.minY || pos.y > pre_image.maxY) {
            return;
         }

         // write the element name inside it
         const loc = pos_vector.set(pos.x, pos.y).applyMatrix3(this.transform);
         this.context.fillText( cycleGraph.group.labels[elt], loc.x, loc.y );
      } );
   }

   // interface for zoom-to-fit GUI command
   reset() {
      this.zoomFactor = 1;
      this.translate = {dx: 0, dy: 0};
   }

   // increase magnification proportional to its current value,
   zoomIn() {
      this._centeredZoom((1 + DisplayCycleGraph.DEFAULT_ZOOM_STEP) - 1);
   }

   // decrease magnification in a way that allows you to zoom in and out and return to its original value
   zoomOut() {
      this._centeredZoom(1/(1 + DisplayCycleGraph.DEFAULT_ZOOM_STEP) - 1);
   }

   zoom(factor /*: number */) {
      this._centeredZoom(factor -  1);
      return this;
   }

   // changing the translation keeps the center of the model centered in the canvas
   _centeredZoom(dZoom /*: float */) {
      this.zoomFactor = this.zoomFactor * (1 + dZoom);
      this.move(this.translate.dx * dZoom, this.translate.dy * dZoom);
   }

   // deltaX, deltaY are in screen coordinates
   move(deltaX /*: float */, deltaY /*: float */) {
      this.translate.dx += deltaX;
      this.translate.dy += deltaY;
      return this;
   }

   // given screen coordinates, returns element associated with node,
   //   or 'undefined' if not within one radius
   select(screenX /*: number */, screenY /*: number */) /*: void | groupElement */ {
      // compute cycleGraph coordinates from screen coordinates by inverting this.transform
      const cg_coords = new THREE.Vector2(screenX, screenY).applyMatrix3(new THREE.Matrix3().getInverse(this.transform));
      const index = this.cycleGraph.positions.findIndex( (pos) =>
         Math.sqrt( Math.pow( pos.x - cg_coords.x, 2 ) + Math.pow( pos.y - cg_coords.y, 2 ) ) < this.radius
      );
      return (index == -1) ? undefined : index;
   }

   // Be able to answer the question of where in the diagram any given element is drawn.
   // We answer in normalized coordinates, [0,1]x[0,1].
   unitSquarePosition(element /*: groupElement */, cycleGraph /*: CycleGraph */) /*: {x: float, y: float} */ {
      const virtualCoords = new THREE.Vector3( cycleGraph.positions[element].x,
                                               cycleGraph.positions[element].y, 0 ),
            // multiplying a transform by a vector does not translate it, unfortunately:
            untranslatedCanvasCoords = virtualCoords.applyMatrix3( this.transform ),
            // so we do the translation manually:
            translatedCanvasCoords = {
               x: this.transform.elements[6] + untranslatedCanvasCoords.x,
               y: this.transform.elements[7] + untranslatedCanvasCoords.y
            };
      return { x: translatedCanvasCoords.x / this.canvas.width,
               y: translatedCanvasCoords.y / this.canvas.height };
   }

   // two serialization functions
   toJSON(cycleGraph /*: CycleGraph */) /*: CycleGraphJSON */ {
      return {
         groupURL: cycleGraph.group.URL,
         highlights: cycleGraph.highlights,
         elements: cycleGraph.elements
      };
   }
   fromJSON(json /*: CycleGraphJSON */, cycleGraph /*: CycleGraph */) {
      cycleGraph.highlights = json.highlights;
      cycleGraph.elements = json.elements;
   }
}
