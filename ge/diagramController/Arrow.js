// @flow
/* This class brings together the functions used in managing the "Show these arrows:" arrow-list display and its side effects

   The central actions here are to add and remove arrows from the arrow-list display and the Cayley diagram

   Adding an arrow is done by left-clicking the 'Add' button, which display a menu of addable arrows (those not already in the diagram)
   and then left-clicking an arrow to add from the menu. Left-clicking anywhere else in the window will remove the menu.

   Removing an arrow is done by left-clicking one of the lines in the arrow-list display to highlight it,
   and then left-clicking the 'Remove' button to remove it.

   All of these events are fielded and dispatched through the Menu.actionClickHandler()
 */
/*::
import CayleyDiagram from '../js/CayleyDiagram.js';
import DisplayDiagram from '../js/DisplayDiagram.js';
import GEUtils from '../js/GEUtils.js';
import MathML from '../js/MathML.md';
import Menu from '../js/Menu.md';
import Template from '../js/Template.md';
import XMLGroup from '../js/XMLGroup.js';

import DC from './diagram.js';

// globals implemented in CayleyDiagram.js
var group: XMLGroup;
var Cayley_diagram: CayleyDiagram;
var Graphic_context: DisplayDiagram;
var emitStateChange: () => void;

export default
 */
DC.Arrow = class {
   // actions:  show menu; select from menu; select from list; remove
   // utility function add_arrow_list_item(element) to add arrow to list (called from initialization, select from menu)
   // utility function clearArrowList() to remove all arrows from list (called during reset)

   // Row selected in arrow-list:
   //   clear all highlights
   //   highlight row (find arrow-list item w/ arrow = ${element})
   //   enable remove button
   static selectArrow(element /*: number */) {
      GEUtils.cleanWindow();
      $('#arrow-list li').removeClass('highlighted');
      $(`#arrow-list li[arrow=${element}]`).addClass('highlighted');
      $('#remove-arrow-button').attr('action', `DC.Arrow.removeArrow(${element})`);
      $('#remove-arrow-button').prop('disabled', false);
   }

   // returns all arrows displayed in arrow-list as an array
   static getAllArrows() /*: Array<number> */ {
      return $('#arrow-list li').toArray().map( (list_item /*: HTMLLIElement */) => parseInt(list_item.getAttribute('arrow')) );
   }

   // Add button clicked:
   //   Clear (hidden) menu
   //   Populate menu (for each element not in arrow-list)
   //   Position, expose menu
   static showArrowMenu(event /*: JQueryMouseEventObject */) {
      // returns an HTML string with a list element for each arrow that can be added to the arrow-list
      const makeArrowList = () /*: html */ => {
         const template = Template.HTML('arrow-menu-item-template');
         const result = group.elements
               .reduce( (list, element) => {
                  // not the identity and not already displayed
                  if (element != 0 && $(`#arrow-list li[arrow=${element}]`).length == 0) {
                     list.push(eval(template));
                  }
                  return list;
               }, [] )
               .join('');
         return result;
      }

      GEUtils.cleanWindow();
      const $menus = $(eval(Template.HTML('arrow-menu-template')))
            .appendTo('#add-arrow-button');
      Menu.addMenus($menus, event);
   }

   // Add button menu element clicked:
   //   Hide menu
   //   Add lines to Cayley_diagram
   //   Update lines, arrowheads in graphic, arrow-list
   static addArrow(element /*: number */) {
      GEUtils.cleanWindow();
      Cayley_diagram.addLines(element);
      DC.Arrow.updateArrows();
   }

   // Remove button clicked
   //   Remove highlighted row from arrow-list
   //   Disable remove button
   //   Remove line from Cayley_diagram
   //   Update lines in graphic, arrow-list
   static removeArrow(element /*: number */) {
      $('#remove-arrow-button').prop('disabled', true);
      Cayley_diagram.removeLines(element);
      DC.Arrow.updateArrows()
   }

   // clear arrows
   // set line colors in Cayley_diagram
   // update lines, arrowheads in CD
   // add rows to arrow list from line colors
   static updateArrows() {
      $('#arrow-list').children().remove();
      Cayley_diagram.setLineColors();
      Graphic_context.updateLines(Cayley_diagram);
      Graphic_context.updateArrowheads(Cayley_diagram);
      // ES6 introduces a Set, but does not provide any way to change the notion of equality among set members
      // Here we work around that by joining a generator value from the line.arrow attribute ("27") and a color ("#99FFC1")
      //   into a unique string ("27#99FFC1") in the Set, then partitioning the string back into an element and a color part
      const arrow_hashes = new Set(Cayley_diagram.lines.map(
         (line) => '' + ((line.arrow /*: any */) /*: groupElement */) + ( ((line.color /*: any */) /*: color */) ).toString()
      ));
      arrow_hashes.forEach( (hash) => {
         const element = hash.slice(0,-7);
         const color = hash.slice(-7);
         $('#arrow-list').append(eval(Template.HTML('arrow-list-item-template')));  // make entry in arrow-list
      } );
      if (arrow_hashes.size == group.order - 1) {  // can't make an arrow out of the identity
         DC.Arrow.disable()
      } else {
         DC.Arrow.enable()
      }
      emitStateChange();
   }

   // disable Add button
   static enable() {
      $('#add-arrow-button').prop('disabled', false);
   }

   // enable Add button
   static disable() {
      $('#add-arrow-button').prop('disabled', true);
   }
}
