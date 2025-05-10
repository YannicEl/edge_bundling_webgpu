<script lang="ts">
	import 'virtual:uno.css';
	import '../app.css';
	import type { LayoutProps } from './$types';

	const { children }: LayoutProps = $props();
</script>

{@render children()}
