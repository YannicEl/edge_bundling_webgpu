<script lang="ts">
	import { setWebGPUState } from '$lib/state/webGPU';
	import type { LayoutProps } from './$types';

	const { children, data }: LayoutProps = $props();
	setWebGPUState(data.webGPU);
</script>

{@render children()}
