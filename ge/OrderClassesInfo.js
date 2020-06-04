// @flow

/*::
import Library from './js/Library.js';
import Log from './js/Log.md';
import MathML from './js/MathML.md';
import setUpGAPCells from './js/ShowGAPCode.js';
import Template from './js/Template.md';
import XMLGroup from './js/XMLGroup.js';
 */

var group /*: XMLGroup */;

$(window).on('load', load);	// like onload handler in body

function load() {
   Library.loadFromURL()
          .then( (_group) => {
              group = _group;
              formatGroup();
          } )
          .catch( Log.err );
}

function formatGroup() {
   let $rslt = $(document.createDocumentFragment())
      .append(eval(Template.HTML('header')));
   const numOrderClasses = group.orderClasses.reduce( (num, bitset) => bitset.popcount() != 0 ? num+1 : num, 0);
   if (numOrderClasses == 1) {
      $rslt.append(eval(Template.HTML('single')));
   } else {
      $rslt.append(eval(Template.HTML('multiple')));
      group.orderClasses.forEach( (members, order) => {
         if (members.popcount() != 0) {
            $rslt.find('#order_class_list')
               .append($('<li>').html(
                    `Elements of order ${order}:&nbsp;` +
                     MathML.csList(members.toArray().map( (el) => group.representation[el] ))
               ))
         }
      } )
   }

   $('body').prepend($rslt);
   MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'conjugacy_list']);

   setUpGAPCells();
}
