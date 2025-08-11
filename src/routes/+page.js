import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const { data, error } = await supabase
		.from('policy_with_popularity')
		.select('*')
		.order('popularity_score', { ascending: false, nullsFirst: false })
		.order('immediate_count', { ascending: false })
		.order('next_count', { ascending: false })
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching policies:', error);
		// Return an empty array on error to prevent breaking the page.
		return { policies: [] };
	}

	return { policies: data };
}
