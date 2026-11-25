export type ZoomableImageHandle = {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly reset: () => void;
};
