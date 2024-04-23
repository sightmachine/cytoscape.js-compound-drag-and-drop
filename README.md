cytoscape-compound-drag-and-drop
================================================================================

[![DOI](https://zenodo.org/badge/165720339.svg)](https://zenodo.org/badge/latestdoi/165720339)

## Description

Compound node drag-and-drop UI for adding and removing children ([demo](http://cytoscape.github.io/cytoscape.js-compound-drag-and-drop))


## Dependencies

 * Cytoscape.js ^3.4.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-compound-drag-and-drop`,
 * via bower: `bower install cytoscape-compound-drag-and-drop`, or
 * via direct download in the repository (probably from a tag).

Import the library as appropriate for your project:

ES import:

```js
import cytoscape from 'cytoscape';
import compoundDragAndDrop from 'cytoscape-compound-drag-and-drop';

cytoscape.use( compoundDragAndDrop );
```

CommonJS require:

```js
let cytoscape = require('cytoscape');
let compoundDragAndDrop = require('cytoscape-compound-drag-and-drop');

cytoscape.use( compoundDragAndDrop ); // register extension
```

AMD:

```js
require(['cytoscape', 'cytoscape-compound-drag-and-drop'], function( cytoscape, compoundDragAndDrop ){
  compoundDragAndDrop( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## Definitions

- **Grabbed node** : The grabbed node is the node that is grabbed by the user (by touch or cursor), which starts the drag-and-drop gesture.  There are some requirements on grabbed nodes:
  - A grabbed node may not be a compound parent node.
  - A grabbed node may not be selected if multiple nodes are selected.
    - You can enable `options.allowMultipleNodeSelection` to allow dragging multiple nodes into a drop target. Note: when enabled creating new parent nodes when dragging into a drop sibling will not work as expected
  - A grabbed node must result in a `true` return value for `options.grabbedNode(node)`.
- **Drop target** : The drop target node is the parent node currently under consideration by the drag-and-drop gesture.
  - A drop target is a compound parent node.
  - A drop target must result in a `true` return value for `options.dropTarget(node)`.
  - If the grabbed node is a child, the drop target is the grabbed node's parent.  The grabbed node is under consideration for removal from the drop target.
  - If the grabbed node is an orphan, the drop target is the parent node onto which the grabbed node is dragged.
    - If the grabbed node is dragged onto an existing parent node, then the drop target is that parent node.
    - **Drop sibling** : If the grabbed node is dragged onto another orphan node, a drop sibling, then the drop target is a new parent node generated by `options.newParentNode(grabbedNode, dropSibling)`.  The grabbed node and drop sibling are made to be children of the newly created drop target.
      - A drop sibling must result in a `true` return value for `options.dropSibling(node)`.
  - The drop target is removed from the graph for these cases:
    - A gesture is cancelled on a drop sibling.
    - The grabbed node is the only child of the drop target, and the grabbed node is dragged out of the drop target.

## API

Create an instance of the drag-and-drop UI:

```js
const cdnd = cy.compoundDragAndDrop(options);
```

The `options` object is outlined below with the default values:

```js
const options = {
  grabbedNode: node => true, // filter function to specify which nodes are valid to grab and drop into other nodes
  dropTarget: (dropTarget, grabbedNode) => true, // filter function to specify which parent nodes are valid drop targets
  dropSibling: (dropSibling, grabbedNode) => true, // filter function to specify which orphan nodes are valid drop siblings
  newParentNode: (grabbedNode, dropSibling) => ({}), // specifies element json for parent nodes added by dropping an orphan node on another orphan (a drop sibling). You can chose to return the dropSibling in which case it becomes the parent node and will be preserved after all its children are removed.
  boundingBoxOptions: { // same as https://js.cytoscape.org/#eles.boundingBox, used when calculating if one node is dragged over another
    includeOverlays: false,
    includeLabels: true
  },
  overThreshold: 10, // make dragging over a drop target easier by expanding the hit area by this amount on all sides
  outThreshold: 10 // make dragging out of a drop target a bit harder by expanding the hit area by this amount on all sides
};
```

There are a number of functions available on the `cdnd` object:

```js
cdnd.disable(); // disables the UI

cdnd.enable(); // re-enables the UI

cdnd.destroy(); // removes the UI
```

## Events

These events are emitted by the extension during its gesture cycle.

- `cdndgrab` : Emitted on a grabbed node that is compatible with the drag-and-drop gesture.
  - `grabbedNode.on('cdndgrab', (event) => {})`
- `cdndover` : Emitted on a grabbed node when it is dragged over another node.
  - `grabbedNode.on('cdndover', (event, dropTarget, dropSibling) => {})`
- `cdndout` : Emmitted on a grabbed node when it is dragged out of its parent.
  - `grabbedNode.on('cdndout', (event, dropTarget, dropSibling) => {})`
- `cdnddrop` : Emitted on a grabbed node when it is dropped (freed).
  - `droppedNode.on('cdnddrop', (event, dropTarget, dropSibling) => {})`

For these events:

- `dropTarget` is always the parent node under consideration.
- `dropSibling` is nonempty only if the grabbed node was originally dragged over the drop sibling.

## Classes

These classes are applied to nodes during the gesture cycle.  You can use them in your stylesheet to customise the look of the nodes during different phases of the gesture.

- `cdnd-grabbed-node` : Applied to the grabbed node, until it is dropped.
- `cdnd-drop-target` : Applied to a drop target node, while the grabbed node is over it.
- `cdnd-drop-sibling` : Applied to drop sibling node, while the grabbed node is over its drop target (parent).
- `cdnd-new-parent` : Applied to a parent node that has been created after dragging a node over. This class will not be present if the parent node is the dropSibling - see the `newParentNode` callback function.

## Caveats

- Compound nodes are supported by this extension only to depth 1.
- The grabbed node may not be a parent.
- Two compound nodes may not be joined together.
- Only one node may be dragged into a compound node at a time.
- Performance may not be very good for large graphs.

## Build targets

* `npm run build` : Build `./src/**` into `cytoscape-compound-drag-and-drop.js`
* `npm run watch` : Automatically build on changes with live reloading (N.b. you must already have an HTTP server running)
* `npm run lint` : Run eslint on the source

N.b. all builds use babel, so modern ES features can be used in the `src`.


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Build the extension : `npm run build:release`
1. Commit the build : `git commit -am "Build for release"`
1. Bump the version number and tag: `npm version major|minor|patch`
1. Push to origin: `git push && git push --tags`
1. Publish to npm: `npm publish .`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-compound-drag-and-drop https://github.com/cytoscape/cytoscape.js-compound-drag-and-drop.git`
1. [Make a new release](https://github.com/cytoscape/cytoscape.js-compound-drag-and-drop/releases/new) for Zenodo.
