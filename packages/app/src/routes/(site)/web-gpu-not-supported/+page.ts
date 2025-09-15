import { redirect } from '@sveltejs/kit';

export const load = () => {
	if (navigator.gpu) {
		redirect(302, '/app');
	}
};
