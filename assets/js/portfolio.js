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

// Email links: the address is assembled at runtime and never appears as a
// literal string in the page source or this file, so naive scrapers (which
// don't run JS) can't harvest it. Any link with class "js-email" gets a
// working mailto: href on load. Keep a non-address visible label in the HTML.
(() => {
	const links = document.querySelectorAll('.js-email');
	if (!links.length) return;

	// Split into parts so the full address is never a single literal anywhere.
	const user = ['mihnea', 'bernevig'].join('');
	const domain = ['gmail', 'com'].join('.');
	const addr = user + String.fromCharCode(64) + domain; // 64 = '@'

	links.forEach((el) => {
		el.setAttribute('href', 'mailto:' + addr);
	});
})();
