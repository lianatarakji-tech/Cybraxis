# Cybraxis Visualization Decision

## Final Implementation Decision

React Flow is retained as the final active visualization implementation for the Cybraxis prototype.

Cytoscape.js was originally selected as the target visualization technology because Cybraxis requires a network-oriented graph view, node and edge styling, stable topology, and compatibility with graph-based reasoning. However, multiple Cytoscape implementation attempts were tested and rejected during prototype development.

## Reason for Rejecting Cytoscape in the Prototype

The Cytoscape drafts failed to match the usability and visual quality of the existing React Flow implementation. The rejected versions showed several issues:

- the map felt like a generic graph-library demo rather than a SOC investigation interface
- nodes did not feel like readable cyber asset cards
- node selection feedback was weak
- zoom and page scaling behavior felt unstable
- node clicking felt less responsive
- edge styling looked visually unsuitable for the intended cyber/SOC style
- runtime node-state changes were not clear enough
- the investigation drawer made the graph feel cramped
- overall gameplay usability was worse than the React Flow version

Because the simulator depends on timed investigation, readable assets, strong selected-node feedback, and clear visual response to learner actions, Cytoscape was not activated.

## Reason for Retaining React Flow

React Flow better supports the current Cybraxis prototype because it provides:

- custom React-based node cards
- stable interaction behavior
- readable node labels
- clear selected-node styling
- smoother integration with the investigation drawer
- better compatibility with the existing stage overlay
- easier control over gameplay-focused UI behavior
- stronger visual fit for the SOC training interface

React Flow also allowed additional final-polish improvements, including:

- non-draggable investigation nodes
- selected-node centering when the investigation drawer opens
- minimap hiding when the drawer is active
- stronger selected-node glow
- clearer suspicious and compromised node states
- improved attack-path direction indicators
- responsive stage-result overlay behavior

## Final Decision

For the implemented prototype, React Flow is the final visualization layer.

Cytoscape.js may remain a possible future research or redevelopment option, but it is not used in the active prototype because it did not satisfy the visual and interaction requirements during testing.