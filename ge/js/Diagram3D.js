// @flow
/*
 * Structure used to describe Cayley diagram, symmetry object to DrawDiagram
 */

/*::
import BitSet from './BitSet.js';
import GEUtils from './GEUtils.js';
import XMLGroup from './XMLGroup.js';

type PointConstructor = [float, float, float] | THREE.Vector3;
export type NodeOptions = {color?: color, radius?: float, lineStyle?: number};
export type LineOptions = {arrow?: groupElement, arrowhead?: boolean, color?: color, offset?: float, style?: number} ;
export type Diagram3DOptions = {background?: color, isGenerated?: boolean};
*/

const _Diagram3D_STRAIGHT = 0;
const _Diagram3D_CURVED = 1;

class _Diagram3D_Point {
/*::
   point: THREE.Vector3;
  +isPoint: boolean;
 */
   constructor(point /*: ?PointConstructor */) {
      if (point == undefined) {
         this.point = new THREE.Vector3(0, 0, 0);
      } else if (Array.isArray(point)) {
         this.point = new THREE.Vector3(...point);
      } else {
         this.point = point;
      }
      this.isPoint = true;
   }
}

/*
 * Node extends point with information about the sphere drawn at this 3D location.
 * Values not used are 'undefined'.
 *   element: group element associated with this node
 *   color: this node's color, if different from the parent diagram's default color
 *   label: label drawn next to node (element label)
 *   radius: radius of the sphere drawn at this location
 *   lineStyle: line style generated by the element at this node
 * Highlight information is kept separate to support 'clear all highlighting' function
 *   colorHighlight: highlight node with this color
 *   ringHighlight: draw ring of this color around node
 *   squareHighlight: draw square of this color around node
 */
class _Diagram3D_Node extends _Diagram3D_Point {
/*::
   element: groupElement;
   color: color;
   label: mathml;
   radius: ?float;
   lineStyle: number;
   colorHighlight: ?color;
   ringHighlight: ?color;
   squareHighlight: ?color;
   curvedGroup: Array<Diagram3D.Node>;
 */
   constructor(element /*: groupElement */,
               point /*: ?PointConstructor */,
               options /*: NodeOptions */ = {}) {
      super(point);
      this.element = element;
      this.color = options.color || '#DDDDDD';
      this.label = '';
      this.radius = options.radius;
      this.lineStyle = (options.lineStyle != undefined) ? options.lineStyle : Diagram3D.STRAIGHT;
      this.colorHighlight = undefined;
      this.ringHighlight = undefined;
      this.squareHighlight = undefined;
      this.isPoint = false;
   }
}

class _Diagram3D_Line {
/*::
   vertices: Array<Diagram3D.Point>;
   color: ?color;
   arrowhead: boolean;
   arrow: ?groupElement;
   offset: ?float;
   style: number;
  +length: float;
   middle: THREE.Vector3;
   center: THREE.Vector3;
 */
   constructor(vertices /*: Array<Diagram3D.Point> */,
               options /*: LineOptions */ = {}) {
      this.vertices = vertices;
      this.color = options.color;
      this.arrowhead = (options.arrowhead != undefined) ? options.arrowhead : true;
      this.arrow = options.arrow;
      this.offset = options.offset;
      this.style = (options.style != undefined) ? options.style : Diagram3D.STRAIGHT;
   }

   get length() /*: float */ {
      const [length, _] = this.vertices.reduce( ([length, prev], vertex) => {
         if (prev === undefined) {
            return [length, vertex];
         } else {
            return [length + prev.point.distanceTo(vertex.point), vertex];
         }
      }, [0, undefined] );
      return length;
   }
}


/*:: export default */
class Diagram3D {
/*::
   static STRAIGHT: number;
   static CURVED: number;
   static Point: Class<_Diagram3D_Point>;
   static Node: Class<_Diagram3D_Node>;
   static Line: Class<_Diagram3D_Line>;
   group: XMLGroup;
   nodes: Array<Diagram3D.Node>;
   lines: Array<Diagram3D.Line>;
   _right_multiplication: boolean;
   node_labels: Array<mathml>;
   background: ?color;
   zoomLevel: float;
   lineWidth: float;
   nodeScale: number;
   fogLevel: number;
   labelSize: number;
   arrowheadPlacement: number;
  +emitStateChange: ?() => void;
   arrowColors: Array<color>;
  +isCayleyDiagram: boolean;
   isGenerated: boolean;
 */
   constructor(group /*: XMLGroup */,
               nodes /*: Array<Diagram3D.Node> */ = [],
               lines /*: Array<Diagram3D.Line> */ = [],
               options /*: Diagram3DOptions */ = {}) {
      this.group = group;
      this.nodes = nodes;
      this.lines = lines;
      this._right_multiplication = true;
      this.node_labels = group.representation;
      this.background = options.background;
      this.zoomLevel = 1;
      this.lineWidth = 7;
      this.nodeScale = 1;
      this.fogLevel = 0;
      this.labelSize = 1;
      this.arrowheadPlacement = 1;
      this.isCayleyDiagram = false;
      this.isGenerated = (options.isGenerated != undefined) ? options.isGenerated : true;
   }

   setNodeColor(color /*: color */) /*: Diagram3D */ {
      this._setNodeField('color', this.group.elements, color);
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   setNodeLabels(labels /*: Array<mathml> */ = this.node_labels) /*: Diagram3D */ {
      this.node_labels = labels;
      if (this.node_labels !== undefined) {
         this.nodes.forEach( (nd /*: Diagram3D.Node */) => nd.label = this.node_labels[nd.element] );
      }
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   arrowMult(a /*: groupElement */, b /*: groupElement */) /*: groupElement */ {
      return this._right_multiplication ? this.group.mult(a,b) : this.group.mult(b,a);
   }

   // set multiplication direction; change lines when changing direction
   set right_multiplication(right_multiplication /*: boolean */) /*: Diagram3D */ {
      if (this._right_multiplication != right_multiplication) {
         this._right_multiplication = right_multiplication;
         this.lines.forEach( (line) => {
            if (line.vertices.length == 2 && !line.vertices[0].isPoint) {
               const startNode = ((line.vertices[0] /*: any */) /*: Diagram3D.Node */);
               line.vertices[1] = this.nodes[this.arrowMult( startNode.element, ((line.arrow /*: any */) /*: groupElement */) )];
            }
         } );
      }
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   // add a line from each element to arrow*element; set arrow in line
   // if arrow is Array, add all lines
   addLines(arrow /*: groupElement */) /*: Diagram3D */ {
      this.group.elements.forEach( (el) => {
         const product = this.arrowMult(el, arrow);
         if (el == this.arrowMult(product, arrow)) {  // no arrows if bi-directional
            if (el < product) {  // don't add 2nd line if bi-directional
               this.lines.push(new Diagram3D.Line([this.nodes[el], this.nodes[product]],
                                                  {arrow: arrow, arrowhead: false, style: this.nodes[arrow].lineStyle}))
            }
         } else {
            this.lines.push(new Diagram3D.Line([this.nodes[el], this.nodes[product]],
                                               {arrow: arrow, arrowhead: true, style: this.nodes[arrow].lineStyle}))
         }
      } )
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   // remove all lines with indicated arrow; if arrow is undefined, remove all lines
   removeLines(arrow /*: ?groupElement */ = undefined) /*: Diagram3D */ {
      this.lines = (arrow == undefined) ? [] : this.lines.filter( (line) => line.arrow != arrow );
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   setLineColors() /*: Diagram3D */ {
      const arrows = new BitSet(this.group.order,
                                this.lines.reduce( (els, line) /*: Array<groupElement> */ => {
                                   if (line.arrow != undefined) els.push(line.arrow);
                                   return els;
                                }, [] )
                               ).toArray();
      const colors = this.arrowColors
                  || Array.from({length: arrows.length},
                                (_, inx) => '#' + new THREE.Color(GEUtils.fromRainbow(inx/arrows.length, 1.0, 0.2)).getHexString());
      this.lines.forEach( (line) => line.color = colors[arrows.indexOf( line.arrow )] );
      if ( this.emitStateChange ) this.emitStateChange();
      return this;
   }

   deDupAndSetArrows() {
      const hash = (point) => (((10 + point.x)*10 + point.y)*10 + point.z)*10;
      const linesByEndpoints = new Map();
      this.lines.forEach( (line) => {
         const start = hash(line.vertices[0].point);
         const end = hash(line.vertices[1].point);
         const forwardHash = 100000*start + end;
         const reverseHash = 100000*end + start;
         const rev = linesByEndpoints.get(reverseHash);
         if (rev != undefined) {
            rev.arrowhead = false;
         } else {
            line.arrowhead = true;
            linesByEndpoints.set(forwardHash, line);
         }
      } );
      this.lines = Array.from(linesByEndpoints.values());
      if ( this.emitStateChange ) this.emitStateChange();
   }

   // Normalize scene: translate to centroid, radius = 1
   normalize() {
      const centroid = this.nodes
                           .reduce( (cent, nd) => cent.add(nd.point), new THREE.Vector3(0,0,0) )
                           .multiplyScalar(1/this.nodes.length);
      const squaredRadius = this.nodes
                                .reduce( (sqrad,nd) => Math.max(sqrad, nd.point.distanceToSquared(centroid)), 0 );
      const scale = (squaredRadius == 0) ? 1 : 1/Math.sqrt(squaredRadius);  // in case there's only one element
      const translation_transform = (new THREE.Matrix4()).makeTranslation(...centroid.multiplyScalar(-1).toArray());
      const xForm = (new THREE.Matrix4()).makeScale(scale, scale, scale).multiply(translation_transform);

      this.nodes.forEach( (node) => node.point.applyMatrix4(xForm) );
      this.lines.forEach( (line) => line.vertices
                                        .forEach( (vertex) => {
                                           if (!vertex.hasOwnProperty('element')) {
                                              vertex.point.applyMatrix4(xForm)
                                           }
                                        } ) );
      if ( this.emitStateChange ) this.emitStateChange();
   }

   get radius() /*: float */ {
      const centroid = this.nodes
                           .reduce( (cent, nd) => cent.add(nd.point), new THREE.Vector3(0,0,0) )
                           .multiplyScalar(1/this.nodes.length);
      const squaredRadius = this.nodes
                                .reduce( (sqrad,nd) => Math.max(sqrad, nd.point.distanceToSquared(centroid)), 0 );
      return (squaredRadius == 0) ? 1 : Math.sqrt(squaredRadius);  // in case there's only one element
   }

   _setNodeField(field /*: string */, elements /*: Array<groupElement> */, value /*: mixed */) {
      elements.forEach( (index) => (this.nodes[index] /*: {[key: string]: mixed } */)[field] = value );
   }

   highlightByNodeColor(elements /*: Array<Array<groupElement>> */) {
      this._setNodeField('colorHighlight', this.group.elements, undefined);
      elements.forEach( (els, colorIndex) => {
         const hue = 360 * colorIndex / elements.length;
         const color = `hsl(${hue}, 53%, 30%)`;
         this._setNodeField('colorHighlight', els, color);
      } );
      if ( this.emitStateChange ) this.emitStateChange();
   }

   highlightByRingAroundNode(elements /*: Array<Array<groupElement>> */) {
      this._setNodeField('ringHighlight', this.group.elements, undefined);
      if (elements.length == 1) {
         this._setNodeField('ringHighlight', elements[0], 'hsl(120, 53%, 30%)');
      } else {
         elements.forEach( (els, colorIndex) => {
            const hue = 360 * colorIndex / elements.length;
            const color = `hsl(${hue}, 53%, 30%)`;
            this._setNodeField('ringHighlight', els, color);
         } );
      }
      if ( this.emitStateChange ) this.emitStateChange();
   }

   highlightBySquareAroundNode(elements /*: Array<Array<groupElement>> */) {
      this._setNodeField('squareHighlight', this.group.elements, undefined);
      if (elements.length == 1) {
         this._setNodeField('squareHighlight', elements[0], 'hsl(240, 53%, 30%)');
      } else {
         elements.forEach( (els, colorIndex) => {
            const hue = 360 * colorIndex / elements.length;
            const color = `hsl(${hue}, 53%, 30%)`;
            this._setNodeField('squareHighlight', els, color);
         } );
      }
      if ( this.emitStateChange ) this.emitStateChange();
   }

   clearHighlights() {
      this._setNodeField('colorHighlight', this.group.elements, undefined);
      this._setNodeField('ringHighlight', this.group.elements, undefined);
      this._setNodeField('squareHighlight', this.group.elements, undefined);
      if ( this.emitStateChange ) this.emitStateChange();
   }
}


Diagram3D.STRAIGHT = _Diagram3D_STRAIGHT;
Diagram3D.CURVED = _Diagram3D_CURVED;

Diagram3D.Point = _Diagram3D_Point;
Diagram3D.Node = _Diagram3D_Node;
Diagram3D.Line = _Diagram3D_Line;