<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import MdiChevronDoubleRight from '~icons/mdi/chevron-double-right';
	import MdiChevronDoubleLeft from '~icons/mdi/chevron-double-left';

	let showControls = $state(true);

	type Props = {
		children: Snippet;
	} & SvelteHTMLElements['aside'];
	let { children, ...props }: Props = $props();

	function toggleControls() {
		showControls = !showControls;
	}
</script>

<aside {...props} class={['absolute right-0 top-0 ', props.class]}>
	{#if !showControls}
		<button class="cursor-pointer justify-self-end p-2" onclick={toggleControls}>
			<div class="flex h-8 items-center">
				<MdiChevronDoubleLeft />
			</div>
		</button>
	{:else}
		<div class="flex w-[300px] flex-col border-b border-l border-gray-300 bg-white">
			<div class="flex items-center justify-between gap-2 border-b border-gray-300 p-2">
				<h1>Controls</h1>

				<button class="cursor-pointer" onclick={toggleControls}>
					<MdiChevronDoubleRight />
				</button>
			</div>

			<div class="flex flex-col gap-4 p-2">
				{@render children()}
			</div>
		</div>
	{/if}
</aside>
