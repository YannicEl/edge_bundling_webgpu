<script lang="ts">
	import 'virtual:uno.css';
	import '@unocss/reset/tailwind.css';
	import '../app.css';

	const { children } = $props();
</script>

<main class="flex h-screen w-screen flex-col">
	{@render children()}
</main>
