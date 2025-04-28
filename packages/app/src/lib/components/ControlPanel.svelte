<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type Props = {
		children: Snippet;
	} & SvelteHTMLElements['aside'];
	let { children }: Props = $props();
</script>

<aside>
	<h1>Control Panel</h1>

	{@render children()}
</aside>

<style>
	aside {
		--apply: absolute top-0 right-0 flex flex-col gap-4 p-2 border-black border-b border-l bg-white;
	}
</style>
