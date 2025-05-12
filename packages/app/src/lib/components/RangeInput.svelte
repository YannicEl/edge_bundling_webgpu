<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Slider } from 'bits-ui';
	import type { WithoutChildren } from 'bits-ui';

	type Props = Omit<WithoutChildren<ComponentProps<typeof Slider.Root>>, 'type'>;

	let { value = $bindable(), ...restProps }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<Slider.Root
		bind:value
		type="single"
		{...restProps as any}
		class="relative flex w-full flex-1 touch-none select-none items-center"
	>
		{#snippet children({ thumbs })}
			<span class="bg-gray-2 relative h-2 w-full grow cursor-pointer overflow-hidden">
				<Slider.Range class="absolute h-full bg-black" />
			</span>
			{#each thumbs as index}
				<Slider.Thumb {index} />
			{/each}
		{/snippet}
	</Slider.Root>

	<input type="number" bind:value class="w-16" />
</div>
