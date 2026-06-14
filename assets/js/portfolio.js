// Scroll-reveal: fade sections in as they enter the viewport.
(() => {
	const items = document.querySelectorAll('.reveal');
	if (!items.length) return;

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduce || !('IntersectionObserver' in window)) {
		items.forEach((el) => el.classList.add('is-visible'));
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
	);

	items.forEach((el) => observer.observe(el));
})();
