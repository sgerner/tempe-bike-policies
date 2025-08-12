<script>
	import { onMount } from 'svelte';
	import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
	import { supabase } from '$lib/supabaseClient.js';
	import PolicyCard from '$lib/components/PolicyCard.svelte';
	import { fade } from 'svelte/transition';
	import { toaster } from '$lib/toaster-svelte';

	let { data } = $props();

	let allPolicies = $state(data.policies);
	let immediate = $state([]);
	let next = $state([]);

	let immediatePolicies = $derived(
		immediate.map((id) => allPolicies.find((p) => p.id === id)).filter(Boolean)
	);
	let nextPolicies = $derived(
		next.map((id) => allPolicies.find((p) => p.id === id)).filter(Boolean)
	);

	// --- Search ---
	let searchTerm = $state('');
	let selectedCategory = $state(null);

	const categories = $derived(
		Object.entries(
			allPolicies.reduce((acc, p) => {
				acc[p.category] = (acc[p.category] || 0) + 1;
				return acc;
			}, {})
		).map(([name, count]) => ({ name, count }))
	);

	let filteredPolicies = $derived.by(() => {
		const policies = allPolicies ?? [];

		const categoryFiltered = selectedCategory
			? policies.filter((p) => p.category === selectedCategory)
			: policies;

		const term = searchTerm?.trim().toLowerCase();
		if (!term) return categoryFiltered;

		const tokens = term.split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return categoryFiltered;

		return categoryFiltered.filter((p) => {
			const haystack =
				`${p.title ?? ''} ${p.short_description ?? ''} ${p.long_description ?? ''}`.toLowerCase();
			return tokens.every((t) => haystack.includes(t));
		});
	});

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

	// --- Add New Policy ---
	let newPolicy = $state({
		title: '',
		short_description: '',
		long_description: '',
		category: 'Policy'
	});
	let isAddingPolicy = $state(false);

	async function handleAddPolicy() {
		if (!newPolicy.title.trim() || !newPolicy.short_description.trim()) {
			toaster.warning({
				title: 'Missing Information',
				description: 'Title and short description are required.'
			});
			return;
		}
		isAddingPolicy = true;
		const { data: inserted, error } = await supabase
			.from('policies')
			.insert({
				title: newPolicy.title.trim(),
				short_description: newPolicy.short_description.trim(),
				long_description: newPolicy.long_description.trim(),
				category: newPolicy.category
			})
			.select()
			.single();

		if (error) {
			toaster.error({ title: 'Error Adding Policy', description: error.message });
			isAddingPolicy = false;
			return;
		}

		const newPolicyWithPopularity = {
			...inserted,
			popularity_score: 0,
			immediate_count: 0,
			next_count: 0
		};

		allPolicies.unshift(newPolicyWithPopularity);

		if (immediate.length < 2) {
			immediate.push(inserted.id);
		} else if (next.length < 3) {
			next.push(inserted.id);
		}

		toaster.success({
			title: 'Policy Added',
			description: 'Your new policy has been added to the list.'
		});
		newPolicy.title = '';
		newPolicy.short_description = '';
		newPolicy.long_description = '';
		isAddingPolicy = false;
	}

	// --- Submission ---
	let submission = $state({
		name: '',
		email: '',
		address: '',
		honeypot: '' // Anti-spam
	});
	let isSubmitting = $state(false);
	let submissionError = $state('');
	let submissionSuccess = $state(false);
	let addressInput = $state(null);

	const canSubmit = $derived(
		immediate.length === 2 &&
			submission.name.trim() &&
			submission.email.trim() &&
			submission.address.trim() &&
			!submission.honeypot
	);

	async function handleSubmit() {
		if (!canSubmit) return;
		isSubmitting = true;
		submissionError = '';

		const { error } = await supabase.rpc('submit_response', {
			p_name: submission.name,
			p_email: submission.email,
			p_address: submission.address,
			p_immediate: immediate,
			p_next: next
		});

		if (error) {
			submissionError = `Submission failed: ${error.message}. Please try again.`;
			toaster.error({ title: 'Submission Failed', description: submissionError });
		} else {
			submissionSuccess = true;
			toaster.success({
				title: 'Priorities Submitted',
				description: 'Thank you! Your response has been recorded.'
			});
		}
		isSubmitting = false;
	}

	function remove(id, bucket) {
		const targetBucket = bucket === 'immediate' ? immediate : next;
		const index = targetBucket.indexOf(id);
		if (index > -1) {
			targetBucket.splice(index, 1);
		}
	}

	// --- Google Maps Autocomplete ---
	function initAutocomplete() {
		if (!window.google || !window.google.maps || !window.google.maps.places) {
			setTimeout(initAutocomplete, 100);
			return;
		}
		const autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
			types: ['address'],
			componentRestrictions: { country: 'us' }
		});
		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place && place.formatted_address) {
				submission.address = place.formatted_address;
			}
		});
	}

	let showSubmit = $state(false);

	onMount(() => {
		const mediaQuery = window.matchMedia('(min-width: 768px)');
		showSubmit = mediaQuery.matches;

		const mediaQueryListener = (e) => (showSubmit = e.matches);
		mediaQuery.addEventListener('change', mediaQueryListener);

		if (PUBLIC_GOOGLE_MAPS_API_KEY) {
			window.initAutocomplete = initAutocomplete;

			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`;
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);
		}

		return () => {
			mediaQuery.removeEventListener('change', mediaQueryListener);
		};
	});
</script>

<svelte:head></svelte:head>

<div class="container mx-auto p-4 md:p-8">
	<header class="mb-8 text-center">
		<h1 class="h1 font-bold">Tempe Bicycle Safety Policies</h1>
		<p class="mx-auto mt-2 max-w-3xl text-lg">
			Help shape the future of safe cycling in Tempe. Please select exactly 2 Top Priorities that
			need to be done immediately and 3 Secondary Priorities that should be done soon from the
			proposals below. You can also add your own proposals. Email
			<a class="anchor" href="mailto:info@biketempe.org">info@biketempe.org</a> with any questions or
			suggestions.
		</p>
	</header>

	<div class="mb-8">
		<input
			bind:value={searchTerm}
			type="search"
			placeholder="Search policies..."
			class="input w-full rounded-2xl preset-filled-primary-50-950 text-xl"
		/>
	</div>

	<h6 class="mb-2">Filter by Category</h6>
	<div class="mb-8 flex flex-wrap gap-2">
		<button
			class="badge {selectedCategory === null
				? 'preset-filled-primary-500'
				: 'preset-soft-primary-500'}"
			onclick={() => (selectedCategory = null)}
		>
			All ({allPolicies.length})
		</button>
		{#each categories as category}
			<button
				class="badge {selectedCategory === category.name
					? categoryColors[category.name]
					: 'preset-soft-surface-500'}"
				onclick={() => (selectedCategory = category.name)}
			>
				{category.name} ({category.count})
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
		{#if filteredPolicies.length === 0}
			<p>No policies found.</p>
		{:else}
			{#each filteredPolicies as policy (policy.id)}
				<div transition:fade>
					<PolicyCard {policy} bind:immediate bind:next />
				</div>
			{/each}
		{/if}
	</div>

	<div class="my-8 card rounded-2xl preset-filled-primary-100-900 p-6 shadow-md">
		<h2 class="mb-4 h2">Propose a New Policy</h2>
		<input
			class="input preset-filled-primary-500"
			bind:value={newPolicy.title}
			placeholder="Policy Title"
			required
		/>
		<textarea
			bind:value={newPolicy.short_description}
			placeholder="Short Description (1-2 sentences)"
			class="mt-4 textarea preset-filled-primary-500"
			required
		></textarea>
		<textarea
			bind:value={newPolicy.long_description}
			placeholder="Long Description (optional, provide more detail)"
			class="mt-4 textarea preset-filled-primary-500"
			rows="4"
		></textarea>
		<select bind:value={newPolicy.category} class="select mt-4 preset-filled-primary-500" required>
			<option value="" disabled>Select a category</option>
			{#each Object.keys(categoryColors) as category}
				<option value={category}>{category}</option>
			{/each}
		</select>
		<button
			type="button"
			class="variant-filled-primary mt-4 btn w-full preset-filled-success-500"
			onclick={handleAddPolicy}
			disabled={isAddingPolicy}
		>
			{#if isAddingPolicy}
				<span>Adding...</span>
			{:else}
				<span>Add Policy</span>
			{/if}
		</button>
	</div>

	{#if !showSubmit}
		<div class="fixed right-4 bottom-4 z-10 md:hidden">
			<button
				class="btn border-1 border-surface-500/50 bg-tertiary-500/50 backdrop-blur-sm"
				onclick={() => (showSubmit = true)}
			>
				Submit Priorities
			</button>
		</div>
	{/if}

	{#if showSubmit}
		<div class="sticky bottom-0 backdrop-blur-sm">
			<div class="container mx-auto">
				{#if submissionSuccess}
					<div class="card rounded-2xl bg-success-500/20 p-2 pb-0 text-center">
						<h2 class="h2 text-success-500">Thank You!</h2>
						<p class="mt-2">Your priorities have been submitted. We appreciate your input.</p>
					</div>
				{:else}
					<div
						class="rounded-t-2xl border-1 border-surface-500/50 bg-tertiary-500/20 p-2 shadow-lg"
					>
						<div class="flex justify-between">
							<h3 class="mb-2 text-center h3">Submit Your Priorities</h3>
							<button class="btn-icon md:hidden" onclick={() => (showSubmit = false)}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
								>
							</button>
						</div>
						<div class="mb-2 grid grid-cols-1 gap-4 pl-8 md:grid-cols-2">
							<div>
								<h4 class="font-bold">
									Top Priorities ({immediate.length}
									/ 2)
								</h4>
								<ul class="space-y-1">
									{#each immediatePolicies as policy (policy.id)}
										<li>
											🚲 {policy.title}
											<button
												class="btn preset-filled-surface-500 btn-sm !px-2 !py-0"
												onclick={() => remove(policy.id, 'immediate')}>X</button
											>
										</li>
									{/each}
								</ul>
							</div>
							<div>
								<h4 class="font-bold">
									Secondary Priorities ({next.length}
									/ 3)
								</h4>
								<ul class="space-y-1">
									{#each nextPolicies as policy (policy.id)}
										<li>
											🚲 {policy.title}
											<button
												class="btn preset-filled-surface-500 btn-sm !px-2 !py-0"
												onclick={() => remove(policy.id, 'next')}>X</button
											>
										</li>
									{/each}
								</ul>
							</div>
						</div>
						<form onsubmit={handleSubmit} class="space-y-4">
							<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
								<input
									class="input preset-filled-primary-50-950"
									bind:value={submission.name}
									type="text"
									placeholder="Your Name"
									required
								/>
								<input
									class="input preset-filled-primary-50-950"
									bind:value={submission.email}
									type="email"
									placeholder="Your Email"
									required
								/>
								<input
									bind:this={addressInput}
									bind:value={submission.address}
									type="text"
									placeholder="Your Address"
									class="input preset-filled-primary-50-950"
									required
								/>
							</div>
							<input
								type="text"
								name="special-field"
								bind:value={submission.honeypot}
								class="absolute -z-10 opacity-0"
								tabindex="-1"
								autocomplete="off"
							/>

							<button
								type="submit"
								class="btn w-full rounded-2xl preset-filled-success-500"
								disabled={!canSubmit || isSubmitting}
							>
								{#if isSubmitting}
									<span>Submitting...</span>
								{:else}
									<span>Submit Priorities</span>
								{/if}
							</button>
							{#if submissionError}
								<p class="text-center text-error-500">{submissionError}</p>
							{/if}
							<p class="text-base-content/60 text-center text-xs">
								By submitting, you consent to us storing your name, email, address, and policy
								preferences for analysis and outreach.
							</p>
						</form>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
