<script lang="ts">
	import 'virtual:uno.css';
	import '@unocss/reset/tailwind.css';
	import '../app.css';

	const { children } = $props();
</script>

<main class="h-screen w-screen">
	{@render children()}
</main>
