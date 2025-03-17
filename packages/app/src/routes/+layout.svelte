<script lang="ts">
	import 'virtual:uno.css';
	import '@unocss/reset/tailwind.css';
	import '../app.css';
	const { children } = $props();
</script>

<div class="flex h-screen">
	<main class="flex flex-1 flex-col overflow-y-auto">
		{@render children()}
	</main>
</div>
