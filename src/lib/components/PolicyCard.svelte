<script>
	import { slide } from 'svelte/transition';

	let { policy, immediate = $bindable(), next = $bindable() } = $props();

	let isExpanded = $state(false);

	const isImmediate = $derived(immediate.includes(policy.id));
	const isNext = $derived(next.includes(policy.id));

	const immediateFull = $derived(immediate.length >= 2);
	const nextFull = $derived(next.length >= 3);

	const categoryColors = {
		Climate: 'preset-filled-primary-900-100',
		Data: 'preset-filled-secondary-900-100',
		Design: 'preset-filled-tertiary-900-100',
		Education: 'preset-filled-success-100-900',
		Enforcement: 'preset-filled-warning-500',
		Incentive: 'preset-filled-error-500',
		Maintenance: 'preset-filled-surface-500',
		Planning: 'preset-filled-primary-100-900',
		Program: 'preset-filled-secondary-200-800',
		Transportation: 'preset-filled-tertiary-100-900'
	};

	function add(id, bucket) {
		const otherBucket = bucket === 'immediate' ? next : immediate;
		const bucketLimit = bucket === 'immediate' ? 2 : 3;
		const targetBucket = bucket === 'immediate' ? immediate : next;

		const otherBucketIndex = otherBucket.indexOf(id);
		if (otherBucketIndex > -1) {
			otherBucket.splice(otherBucketIndex, 1);
		}

		if (targetBucket.length < bucketLimit && !targetBucket.includes(id)) {
			targetBucket.push(id);
		}
	}

	function remove(id, bucket) {
		const targetBucket = bucket === 'immediate' ? immediate : next;
		const index = targetBucket.indexOf(id);
		if (index > -1) {
			targetBucket.splice(index, 1);
		}
	}
</script>

<div
	class="relative flex h-full flex-col card rounded-2xl preset-tonal-secondary p-0 shadow-md transition-shadow hover:shadow-lg"
>
	<header class="mb-4">
		<div class="  flex items-start justify-between gap-2 text-sm">
			<div class="badge {categoryColors[policy.category]} ">{policy.category}</div>
			{#if policy.popularity_score}
				<div class="min-w-content mt-1 mr-2 font-bold whitespace-nowrap">
					👍 {policy.popularity_score}
				</div>
			{/if}
		</div>
		<div class="mx-4 flex items-start justify-between gap-2 text-primary-600">
			<h4 class="h4">{policy.title}</h4>
		</div>
	</header>

	<div class="mx-4 flex-grow">
		<p class="text-base-content/80 mb-4">{policy.short_description}</p>

		<div class="size-fit bg-primary-50">
			<button
				class="btn max-w-sm preset-tonal-primary btn-sm text-sm"
				onclick={() => (isExpanded = !isExpanded)}
				aria-expanded={isExpanded}
				aria-controls="long-desc-{policy.id}"
			>
				More Details >
			</button>
			{#if isExpanded}
				<div transition:slide class="p-2">
					<p>{policy.long_description}</p>
				</div>
			{/if}
		</div>
	</div>

	<footer class="mt-auto flex flex-col gap-4 p-4 sm:flex-row">
		<div class="flex-1 transition-all">
			{#if isImmediate}
				<button
					type="button"
					class="btn w-full rounded-2xl preset-filled-surface-500"
					onclick={() => remove(policy.id, 'immediate')}
				>
					Remove from 'Top Priority'
				</button>
			{:else}
				<button
					type="button"
					class="btn w-full rounded-2xl preset-filled-success-500"
					onclick={() => add(policy.id, 'immediate')}
					disabled={immediateFull && !isImmediate}
				>
					Top Priority
				</button>
			{/if}
		</div>
		<div class="flex-1">
			{#if isNext}
				<button
					type="button"
					class="btn w-full rounded-2xl preset-tonal-surface"
					onclick={() => remove(policy.id, 'next')}
				>
					Remove from 'Secondary Priority'
				</button>
			{:else}
				<button
					type="button"
					class="btn w-full rounded-2xl preset-tonal-success"
					onclick={() => add(policy.id, 'next')}
					disabled={nextFull && !isNext}
				>
					Secondary Priority
				</button>
			{/if}
		</div>
	</footer>
</div>
