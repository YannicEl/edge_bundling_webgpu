export type ResponsiveCanvasOptions = {
	maxWidth?: number;
	minWidth?: number;
	maxHeight?: number;
	minHeight?: number;
};

export class ResponsiveCanvas {
	element: HTMLCanvasElement;
	#observer: ResizeObserver;

	constructor(
		canvas: HTMLCanvasElement,
		{ maxWidth, minWidth = 1, maxHeight, minHeight = 1 }: ResponsiveCanvasOptions = {}
	) {
		this.element = canvas;

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
			}
		});

		this.#observer.observe(this.element);
	}

	disconnect() {
		this.#observer.disconnect();
	}
}
