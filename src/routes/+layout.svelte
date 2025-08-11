<script>
	import '../app.css';
	import favicon from '/src/favicon.svg';
	import { Toaster } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';

	let { children } = $props();
</script>

<Toaster {toaster}></Toaster>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
