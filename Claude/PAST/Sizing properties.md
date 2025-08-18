Sizing Properties Cheat Sheet
Here's a condensed list of sizing and layout properties for auto-layout frames, component instances, native text, and native shapes.

Sizing (Read & Write)
layoutSizingHorizontal?: Sets the horizontal resizing behavior:

FIXED: Fixed width.

HUG: Adjusts width to fit content.

FILL: Stretches to fill parent's space.

layoutSizingVertical?: Sets the vertical resizing behavior:

FIXED: Fixed height.

HUG: Adjusts height to fit content.

FILL: Stretches to fill parent's space.

minWidth?, maxWidth?: Minimum and maximum width.

minHeight?, maxHeight?: Minimum and maximum height.

preserveRatio?: A boolean to maintain aspect ratio.

Layout & Alignment (Read & Write)
layoutMode: Enables auto-layout (HORIZONTAL, VERTICAL, NONE).

primaryAxisSizingMode, counterAxisSizingMode: Sizing modes for auto-layout axes (FIXED, AUTO).

primaryAxisAlignItems, counterAxisAlignItems: Alignment of children.

itemSpacing: Space between children.

layoutWrap: Enables wrapping (NO_WRAP, WRAP).

counterAxisSpacing: Space between wrapped tracks.

counterAxisAlignContent: Alignment of wrapped tracks.

layoutAlign?, layoutGrow?: How a layer aligns and stretches within its auto-layout parent.

itemReverseZIndex: Determines stacking order of layers in auto-layout.

Positioning
constraints?: Horizontal and vertical layout constraints (Read & Write).

absoluteBoundingBox: Node's bounding box in absolute space (Read-only).

Padding & Overflow (Read & Write)
paddingLeft, paddingRight, paddingTop, paddingBottom: Padding values for frames.

overflowDirection: Scrolling behavior if content overflows.

clipsContent: A boolean that clips content to the frame's bounds.

strokesIncludedInLayout: A boolean that considers strokes in layout calculations.
