<script lang="ts">
	import type { LayoutProps } from './$types';

	const { children }: LayoutProps = $props();
</script>

<main class="pt-1/10 flex h-dvh w-dvw items-start justify-center px-4">
	<div class="border-black/12 w-full max-w-screen-md border bg-white p-6">
		{@render children()}
	</div>
</main>

<style>
	main {
		--grid-size: 300px;

		background-image: url('$lib/assets/pattern.svg');

		background-size: var(--grid-size) var(--grid-size);
		background-position: center;
		background-repeat: repeat;
	}
</style>
