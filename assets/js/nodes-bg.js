(() => {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (prefersReducedMotion) {
		return;
	}

	if (!window.d3 || !window.d3.Delaunay) {
		return;
	}

	const MAX_POINTS_DESKTOP = 40;
	const MAX_POINTS_MOBILE = 5;
	const SPEED = 0.38;
	const CURSOR_RADIUS = 220;
	const CURSOR_STRENGTH = 0.05;
	const CURSOR_MAX_SHIFT = 64;

	const colorSet = {
		light: {
			fill: 'rgba(48, 63, 159, 0.10)',
			edge: 'rgba(30, 41, 59, 0.18)',
			point: 'rgba(15, 23, 42, 0.55)'
		},
		dark: {
			fill: 'rgba(56, 189, 248, 0.09)',
			edge: 'rgb(90, 133, 190)',
			point: 'rgb(81, 129, 190)'
		}
	};

	const canvas = document.createElement('canvas');
	canvas.id = 'nodes-bg-canvas';
	document.body.prepend(canvas);

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}

	let width = 0;
	let height = 0;
	let points = [];
	let mode = 'light';
	let cursor = null;

	const isDarkMode = () => {
		const rootMode = document.documentElement.getAttribute('data-mode');

		if (rootMode === 'dark' || rootMode === 'light') {
			return rootMode === 'dark';
		}

		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	};

	const chooseMode = () => {
		mode = isDarkMode() ? 'dark' : 'light';
	};

	const pointCount = () => (window.innerWidth < 768 ? MAX_POINTS_MOBILE : MAX_POINTS_DESKTOP);

	const randomPoint = () => ({
		x: Math.random() * width,
		y: Math.random() * height,
		vx: (Math.random() * 2 - 1) * SPEED,
		vy: (Math.random() * 2 - 1) * SPEED,
		r: Math.random() * 1.6 + 1.2
	});

	const initPoints = () => {
		points = Array.from({ length: pointCount() }, randomPoint);
	};

	const resize = () => {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;
		initPoints();
	};

	const movePoints = () => {
		for (const point of points) {
			point.x += point.vx;
			point.y += point.vy;

			if (point.x <= 0 || point.x >= width) point.vx *= -1; point.x = Math.max(0, Math.min(point.x, width));
			if (point.y <= 0 || point.y >= height) point.vy *= -1; point.y = Math.max(0, Math.min(point.y, height));

			if (cursor) {
				const dx = point.x - cursor.x;
				const dy = point.y - cursor.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > 0 && distance < CURSOR_RADIUS) {
					const influence = (1 - distance / CURSOR_RADIUS) * CURSOR_STRENGTH;
					const pushX = (dx / distance) * influence * CURSOR_MAX_SHIFT;
					const pushY = (dy / distance) * influence * CURSOR_MAX_SHIFT;
					point.x += pushX;
					point.y += pushY;
				}
			}
		}
	};

	const polygonPath = (polygon) => {
		if (!polygon || polygon.length === 0) {
			return null;
		}

		return polygon;
	};

	const drawPolygon = (polygon, fillStyle, strokeStyle) => {
		const path = polygonPath(polygon);

		if (!path) {
			return;
		}

		ctx.beginPath();
		ctx.moveTo(path[0][0], path[0][1]);
		for (let i = 1; i < path.length; i += 1) {
			ctx.lineTo(path[i][0], path[i][1]);
		}
		ctx.closePath();
		ctx.fillStyle = fillStyle;
		ctx.fill();
		ctx.strokeStyle = strokeStyle;
		ctx.stroke();
	};

	const draw = () => {
		const palette = colorSet[mode];
		ctx.clearRect(0, 0, width, height);
		ctx.lineWidth = 1;

		const delaunay = window.d3.Delaunay.from(points, (point) => point.x, (point) => point.y);
		const voronoi = delaunay.voronoi([0, 0, width, height]);

		for (let i = 0; i < points.length; i += 1) {
			const polygon = voronoi.cellPolygon(i);
			if (!polygon) {
				continue;
			}

			const weight = points[i].r / 2.8;
			drawPolygon(polygon, palette.fill, palette.edge);
		}

		ctx.fillStyle = palette.point;
		for (const point of points) {
			ctx.beginPath();
			ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	const tick = () => {
		movePoints();
		draw();
		requestAnimationFrame(tick);
	};

	chooseMode();
	resize();
	requestAnimationFrame(tick);

	window.addEventListener('resize', resize);
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', chooseMode);
	window.addEventListener('pointermove', (event) => {
		cursor = { x: event.clientX, y: event.clientY };
	});
	window.addEventListener('pointerleave', () => {
		cursor = null;
	});

	// Chirpy mode toggle updates data-mode on html; observe and sync colors.
	const observer = new MutationObserver(chooseMode);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-mode']
	});
})();
