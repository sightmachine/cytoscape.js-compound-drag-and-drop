const {
  isParent, isChild, isOnlyChild,
  getBounds, getBoundsTuple, boundsOverlap, expandBounds, getBoundsCopy,
  setParent, removeParent
} = require('./util');

const addListener = function (event, selector, callback) {
  this.listeners.push({ event, selector, callback });

  if (selector == null) {
    this.cy.on(event, callback);
  } else {
    this.cy.on(event, selector, callback);
  }
};

const addListeners = function () {
  const { options, cy } = this;
  const canBeGrabbed = (n) => options.grabbedNode(n);
  const canBeDropTarget = (n) => !isChild(n) && !n.same(this.grabbedNode) && options.dropTarget(n, this.grabbedNode);
  const canBeDropSibling = (n) => isChild(n) && !n.same(this.grabbedNode) && options.dropSibling(n, this.grabbedNode);
  const canPullFromParent = (n) => isChild(n);
  const getBoundTuplesNode = (n) => getBoundsTuple(n, options.boundingBoxOptions);

  const canBeInBoundsTuple = (n) => (canBeDropTarget(n) || canBeDropSibling(n)) && !n.same(this.dropTarget);
  const updateBoundsTuples = () => {
    this.boundsTuples = cy.nodes(canBeInBoundsTuple).map(getBoundTuplesNode);
  };

  const reset = () => {
    this.grabbedNode.removeClass('cdnd-grabbed-node');
    this.dropTarget.removeClass('cdnd-drop-target');
    this.dropSibling.removeClass('cdnd-drop-sibling');

    this.grabbedNode = cy.collection();
    this.dropTarget = cy.collection();
    this.dropSibling = cy.collection();
    this.dropTargetBounds = null;
    this.boundsTuples = [];
    this.inGesture = false;
    this.addingParent = false;
  };

  this.addListener('grab', 'node', (e) => {
    const node = options.allowMultipleNodeSelection ? cy.$('node:grabbed') : e.target;

    if (!this.enabled || !canBeGrabbed(node)) { return; }

    this.inGesture = true;
    this.grabbedNode = node;
    this.dropTarget = cy.collection();
    this.dropSibling = cy.collection();

    if (canPullFromParent(node)) {
      this.dropTarget = node.parent();
      this.dropTargetBounds = getBoundsCopy(this.dropTarget, options.boundingBoxOptions);
    }

    updateBoundsTuples();

    this.grabbedNode.addClass('cdnd-grabbed-node');
    this.dropTarget.addClass('cdnd-drop-target');

    node.emit('cdndgrab');
  });

  this.addListener('add', 'node', (e) => {
    if (!this.inGesture || !this.enabled) { return; }

    const newNode = e.target;

    if (canBeInBoundsTuple(newNode)) {
      this.boundsTuples.push(getBoundsTuple(newNode, options.boundingBoxOptions));
    }
  });

  this.addListener('remove', 'node', (e) => {
    if (!this.inGesture || !this.enabled) { return; }

    const rmedNode = e.target;
    const rmedIsTarget = rmedNode.same(this.dropTarget);
    const rmedIsSibling = rmedNode.same(this.dropSibling);
    const rmedIsGrabbed = rmedNode.same(this.grabbedNode);

    // try to clean things up if one of the drop nodes is removed
    if (rmedIsTarget || rmedIsSibling || rmedIsGrabbed) {
      if (rmedIsGrabbed) {
        reset();
      } else {
        this.dropTarget = cy.collection();
        this.dropSibling = cy.collection();

        updateBoundsTuples();
      }
    }
  });

  const dragNode = () => {
    if (!this.inGesture || !this.enabled || this.addingParent) { return; }

    if (this.dropTarget.nonempty()) { // already in a parent
      let rmFromParent = false;
      if(options.allowMultipleNodeSelection && this.grabbedNode.length > 1) {
        // If any of them would be removed then trigger it, we need to check it like this because of how the outThreshold works
        rmFromParent = this.grabbedNode.some((n) => {
          const bb = expandBounds(getBounds(n, options.boundingBoxOptions), options.outThreshold);
          return !boundsOverlap(this.dropTargetBounds, bb);
        });
      } else {
        const bb = expandBounds(getBounds(this.grabbedNode, options.boundingBoxOptions), options.outThreshold);
        rmFromParent = !boundsOverlap(this.dropTargetBounds, bb);
      }
      const parent = this.dropTarget;
      const sibling = this.dropSibling;
      const grabbedIsOnlyChild = isOnlyChild(this.grabbedNode);

      if (rmFromParent) {
        removeParent(this.grabbedNode);
        removeParent(this.dropSibling);

        this.dropTarget.removeClass('cdnd-drop-target');
        this.dropSibling.removeClass('cdnd-drop-sibling');

        let isFakeParent = this.dropTarget && this.dropTarget.hasClass('cdnd-new-parent');
        if (
          (this.dropSibling.nonempty() // remove extension-created parents on out
            || grabbedIsOnlyChild) && isFakeParent// remove empty parents
        ) {
          this.dropTarget.remove();
        }

        this.dropTarget = cy.collection();
        this.dropSibling = cy.collection();
        this.dropTargetBounds = null;

        if (isFakeParent) {
          updateBoundsTuples();
        }

        this.grabbedNode.emit('cdndout', [parent, sibling]);
      }
    } else { // not in a parent
      const overlappingNodes = cy.collection();

      this.grabbedNode.clone().forEach((n) => {
        const bb = expandBounds(getBounds(n, options.boundingBoxOptions), options.overThreshold);
        const tupleOverlaps = (t) => !t.node.removed() && boundsOverlap(bb, t.bb);
        this.boundsTuples.forEach((t) => {
          if(tupleOverlaps(t)) {
            // Double check to remove issues where the node just moved out of the parent and is still being dragged
            if (tupleOverlaps(getBoundTuplesNode(t.node, options.boundingBoxOptions))) {
              overlappingNodes.merge(t.node);
            }
          }
        });
      });

      if (overlappingNodes.length > 0) { // potential parent
        this.addingParent = true;

        const overlappingParents = overlappingNodes.filter(isParent);
        let parent;
        let sibling;

        if (overlappingParents.length > 0) {
          sibling = cy.collection();
          parent = overlappingParents.first(); // TODO maybe use a metric here to select which one
        } else {
          sibling = overlappingNodes; // TODO maybe use a metric here to select which one
          parent = cy.add(options.newParentNode(this.grabbedNode, sibling));
        }

        parent.addClass('cdnd-drop-target');

        if (parent !== sibling) {
          parent.addClass('cdnd-new-parent');
        }

        sibling.addClass('cdnd-drop-sibling');

        setParent(sibling, parent);

        this.dropTargetBounds = getBoundsCopy(parent, options.boundingBoxOptions);

        setParent(this.grabbedNode, parent);

        this.dropTarget = parent;
        this.dropSibling = sibling;

        setTimeout(() => {
          this.addingParent = false;
        }, 100);

        this.grabbedNode.emit('cdndover', [parent, sibling]);
      }
    }
  };

  this.addListener('drag', 'node', dragNode.bind(this));

  this.addListener('free', 'node', () => {
    if (!this.inGesture || !this.enabled) { return; }

    const { grabbedNode, dropTarget, dropSibling } = this;

    reset();

    grabbedNode.emit('cdnddrop', [dropTarget, dropSibling]);
  });
};

const removeListeners = function () {
  const { cy } = this;

  this.listeners.forEach((lis) => {
    const { event, selector, callback } = lis;

    if (selector == null) {
      cy.removeListener(event, callback);
    } else {
      cy.removeListener(event, selector, callback);
    }
  });

  this.listeners = [];
};

module.exports = { addListener, addListeners, removeListeners };
