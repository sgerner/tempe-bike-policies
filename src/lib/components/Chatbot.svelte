<script>
	import { onMount } from 'svelte';
	import { GoogleGenerativeAI } from '@google/generative-ai';
	import { PUBLIC_GEMINI_API_KEY } from '$env/static/public';
	import { Avatar, Progress } from '@skeletonlabs/skeleton-svelte';
	import { marked } from 'marked';

	let { immediate, next, policies } = $props();

	const genAI = new GoogleGenerativeAI(PUBLIC_GEMINI_API_KEY);

	let conversation = $state([]);
	let userInput = $state('');
	let isLoading = $state(false);

	async function sendMessage() {
		if (!userInput.trim()) return;

		conversation = [
			...conversation,
			{
				role: 'user',
				content: userInput,
				name: 'You',
				avatar: 'https://i.pravatar.cc/?img=48',
				timestamp: new Date().toLocaleString()
			}
		];
		isLoading = true;

		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const chat = model.startChat({
			history: conversation.map((m) => ({
				role: m.role === 'user' ? 'user' : 'model',
				parts: [{ text: m.content }]
			}))
		});

		const prompt = `Based on the user's concern: "${userInput}", and the following policies: ${JSON.stringify(
			policies,
			null,
			2
		)}, please select the top 2 policies that should be implemented immediately and the next 3 policies that should be implemented soon. Please return the response as a JSON object with three keys: "immediate" (an array of policy IDs), "next" (an array of policy IDs), and "justification" (a string in markdown format explaining why these policies were chosen). The justification should be written at a 6th-grade reading level, briefly, in short bullet points.`;

		try {
			const result = await chat.sendMessage(prompt);
			const response = await result.response;
			const text = response.text();

			const jsonRegex = /```json\n([\s\S]*?)\n```/;
			const match = text.match(jsonRegex);
			const jsonString = match ? match[1] : text;
			const { immediate: newImmediate, next: newNext, justification } = JSON.parse(jsonString);

			if (Array.isArray(newImmediate) && Array.isArray(newNext) && justification) {
				immediate.splice(0, immediate.length, ...newImmediate);
				next.splice(0, next.length, ...newNext);
				const parsedJustification = marked(justification);
				conversation = [
					...conversation,
					{
						role: 'assistant',
						content: `I've selected some priorities for you. If you like these choices, click submit, otherwise select your own policies. <br /><br /> ${justification}`,
						htmlContent: `I've selected some priorities for you. If you like these choices, click submit, otherwise select your own policies. <br /><br /> ${parsedJustification}`,
						name: 'AI Assistant',
						avatar: 'https://i.pravatar.cc/?img=14',
						timestamp: new Date().toLocaleString()
					}
				];
			} else {
				throw new Error('Invalid response format from Gemini API.');
			}
		} catch (error) {
			console.error('Error processing response from Gemini API:', error);
			conversation = [
				...conversation,
				{
					role: 'assistant',
					content: 'Sorry, I had trouble understanding that. Please try again.',
					name: 'AI Assistant',
					avatar: 'https://i.pravatar.cc/?img=14',
					timestamp: new Date().toLocaleString()
				}
			];
		} finally {
			isLoading = false;
			userInput = '';
		}
	}
</script>

<div class="card rounded-2xl preset-filled-primary-100-900 p-6 shadow-md">
	<h2 class="mb-4 h2">AI Assistant</h2>
	<div class="max-h-[400px] w-full space-y-4 overflow-y-auto">
		{#each conversation as bubble (bubble.timestamp)}
			{#if bubble.role === 'user'}
				<!-- Host Bubble -->
				<div class="grid grid-cols-[auto_1fr] gap-2">
					<Avatar src={bubble.avatar} name={bubble.name} size="size-12" />
					<div class="space-y-2 card rounded-tl-none preset-tonal p-4">
						<header class="flex items-center justify-between">
							<p class="font-bold">{bubble.name}</p>
							<small class="opacity-50">{bubble.timestamp}</small>
						</header>
						<p>{bubble.content}</p>
					</div>
				</div>
			{:else}
				<!-- Guest Bubble -->
				<div class="grid grid-cols-[1fr_auto] gap-2">
					<div class="space-y-2 card rounded-tr-none preset-tonal-primary p-4">
						<header class="flex items-center justify-between">
							<p class="font-bold">{bubble.name}</p>
							<small class="opacity-50">{bubble.timestamp}</small>
						</header>
						<p>{@html bubble.htmlContent || bubble.content}</p>
					</div>
					<Avatar src={bubble.avatar} name={bubble.name} size="size-12" />
				</div>
			{/if}
		{/each}
	</div>
	{#if isLoading}
		<div class="my-4">
			<Progress value={null} />
		</div>
	{/if}
	<div class="mt-4 flex gap-2">
		<textarea
			bind:value={userInput}
			type="text"
			placeholder="Tell me about your concerns biking in Tempe..."
			class="textarea w-full rounded-2xl preset-filled-primary-50-950"
			onkeydown={(e) => e.key === 'Enter' && sendMessage()}
			disabled={isLoading}
		></textarea>
		<button
			class="btn rounded-2xl preset-filled-success-500"
			onclick={sendMessage}
			disabled={isLoading}
		>
			{#if isLoading}
				<span>...</span>
			{:else}
				<span>Send</span>
			{/if}
		</button>
	</div>
</div>
