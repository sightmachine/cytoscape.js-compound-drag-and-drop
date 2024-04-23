const isParent = (n) => n.isParent();
const isChild = (n) => n.isChild();
const isOnlyChild = (n) => isChild(n) && n.parent().children().length === n.length; // n may be an element or collection

const getBounds = (n, boundingBoxOptions) => n.boundingBox(boundingBoxOptions);
const copyBounds = (bb) => ({ x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2, w: bb.w, h: bb.h });

const getBoundsTuple = (n, boundingBoxOptions) => ({ node: n, bb: copyBounds(getBounds(n, boundingBoxOptions)) });
const getBoundsCopy = (n, boundingBoxOptions) => copyBounds(getBounds(n, boundingBoxOptions));

const removeParent = (nodes) => {
  const cy = nodes.cy();
  cy.startBatch();
  nodes.forEach((node) => node.move({ parent: null }));
  cy.endBatch();
};

const setParent = (nodes, parent) => {
  const cy = nodes.cy();
  cy.startBatch();
  nodes.forEach((node) => node.move({ parent: parent.id() }));
  cy.endBatch();
};

const boundsOverlap = (bb1, bb2) => {
  // case: one bb to right of other
  if( bb1.x1 > bb2.x2 ) { return false; }
  if( bb2.x1 > bb1.x2 ) { return false; }

  // case: one bb to left of other
  if( bb1.x2 < bb2.x1 ) { return false; }
  if( bb2.x2 < bb1.x1 ) { return false; }

  // case: one bb above other
  if( bb1.y2 < bb2.y1 ) { return false; }
  if( bb2.y2 < bb1.y1 ) { return false; }

  // case: one bb below other
  if( bb1.y1 > bb2.y2 ) { return false; }
  if( bb2.y1 > bb1.y2 ) { return false; }

  // otherwise, must have some overlap
  return true;
};

const expandBounds = (bb, padding) => {
  return {
    x1: bb.x1 - padding,
    x2: bb.x2 + padding,
    w: bb.w + 2 * padding,
    y1: bb.y1 - padding,
    y2: bb.y2 + padding,
    h: bb.h + 2 * padding
  };
};

module.exports = {
  isParent, isChild, isOnlyChild,
  getBoundsTuple, boundsOverlap, getBounds, expandBounds, copyBounds, getBoundsCopy,
  removeParent, setParent
};
