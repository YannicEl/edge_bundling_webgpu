export type ResponsiveCanvasOptions = {
	maxWidth?: number;
	minWidth?: number;
	maxHeight?: number;
	minHeight?: number;
	onResize?: (canvas: HTMLCanvasElement) => void;
};

export class ResponsiveCanvas {
	element: HTMLCanvasElement;
	#observer: ResizeObserver;
	onResize?: (canvas: HTMLCanvasElement) => void;

	constructor(
		canvas: HTMLCanvasElement,
		{ maxWidth, minWidth = 1, maxHeight, minHeight = 1, onResize }: ResponsiveCanvasOptions = {}
	) {
		this.element = canvas;
		this.onResize = onResize;

		this.#observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target instanceof HTMLCanvasElement) {
					const contentBoxSize = entry.contentBoxSize[0];
					if (!contentBoxSize) continue;

					this.element.width = Math.max(
						minWidth,
						Math.min(maxWidth ?? Infinity, contentBoxSize.inlineSize)
					);
					this.element.height = Math.max(
						minHeight,
						Math.min(maxHeight ?? Infinity, contentBoxSize.blockSize)
					);
				}

				this.onResize?.(this.element);
			}
		});

		this.#observer.observe(this.element);
	}

	disconnect() {
		this.#observer.disconnect();
	}
}
