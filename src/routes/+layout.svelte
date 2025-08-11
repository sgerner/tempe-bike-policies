<script>
	import '../app.css';
	import { Toaster } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';

	let { children } = $props();
</script>

<Toaster {toaster}></Toaster>

<svelte:head>
	<link rel="icon" href="/favicon.svg?url=" />
</svelte:head>

{@render children?.()}
