(() => {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (prefersReducedMotion) {
		return;
	}

	// ---- Tunables -----------------------------------------------------------
	const SHIPS_DESKTOP = 6;
	const SHIPS_MOBILE = 3;
	const STARS_DESKTOP = 160;
	const STARS_MOBILE = 70;
	const SHIP_SPEED = 1.0;
	const LASER_SPEED = 6.0;
	const FIRE_COOLDOWN = 90; // frames between shots per ship
	const FIRE_RANGE = 520; // px an enemy must be within to get shot at
	const HIT_RADIUS = 16; // laser/ship proximity that counts as a hit
	const MAX_LASERS = 60;
	const MAX_PARTICLES = 260;
	const CURSOR_PARALLAX = 0.012; // how much stars drift toward the cursor
	const CURVATURE = 0.16; // CRT barrel-distortion strength

	// Two warring factions, each gets a neon hue.
	const palette = {
		bgTop: '#0a0e1a',
		bgBottom: '#05070f',
		glowA: 'rgba(92, 200, 240, 0.10)',
		glowB: 'rgba(255, 95, 162, 0.08)',
		star: 'rgba(226, 232, 255, ',
		factions: [
			{ ship: 'rgba(56, 189, 248, 0.95)', laser: 'rgba(125, 211, 252, 0.95)', glow: 'rgba(56, 189, 248, 0.5)' },
			{ ship: 'rgba(255, 0, 132, 0.95)', laser: 'rgba(251, 146, 178, 0.95)', glow: 'rgba(244, 114, 182, 0.5)' }
		]
	};

	// Visible canvas (WebGL CRT output, or flat 2D fallback).
	const canvas = document.createElement('canvas');
	canvas.id = 'space-bg-canvas';
	document.body.prepend(canvas);

	// Offscreen canvas the 2D scene is drawn into.
	const scene = document.createElement('canvas');
	const ctx = scene.getContext('2d');
	if (!ctx) {
		return;
	}

	// Try to set up the WebGL CRT pass. If it fails, fall back to drawing the
	// flat 2D scene straight onto the visible canvas.
	const crt = setupCRT(canvas);
	const useCRT = !!crt;
	const drawTarget = useCRT ? scene : canvas;
	const dctx = useCRT ? ctx : canvas.getContext('2d');

	let width = 0;
	let height = 0;
	let bgGradient = null;
	let stars = [];
	let ships = [];
	let lasers = [];
	let particles = [];
	let cursor = { x: 0, y: 0, active: false };
	let frame = 0;

	const isMobile = () => window.innerWidth < 768;
	const rand = (min, max) => Math.random() * (max - min) + min;

	const makeStar = () => ({
		x: Math.random() * width,
		y: Math.random() * height,
		depth: Math.random(),
		twinkle: Math.random() * Math.PI * 2
	});

	const makeShip = (faction) => ({
		x: Math.random() * width,
		y: Math.random() * height,
		angle: Math.random() * Math.PI * 2,
		faction,
		cooldown: Math.floor(Math.random() * FIRE_COOLDOWN),
		turn: rand(-0.01, 0.01),
		size: rand(9, 14)
	});

	const initStars = () => {
		stars = Array.from({ length: isMobile() ? STARS_MOBILE : STARS_DESKTOP }, makeStar);
	};

	const initShips = () => {
		ships = Array.from({ length: isMobile() ? SHIPS_MOBILE : SHIPS_DESKTOP }, (_, i) => makeShip(i % 2));
	};

	const resize = () => {
		width = window.innerWidth;
		height = window.innerHeight;
		drawTarget.width = width;
		drawTarget.height = height;
		if (useCRT) {
			canvas.width = width;
			canvas.height = height;
			crt.resize(width, height);
		}
		bgGradient = ctx.createLinearGradient(0, 0, 0, height);
		bgGradient.addColorStop(0, palette.bgTop);
		bgGradient.addColorStop(1, palette.bgBottom);
		initStars();
		initShips();
		lasers = [];
		particles = [];
	};

	const wrap = (value, max) => {
		if (value < -20) return max + 20;
		if (value > max + 20) return -20;
		return value;
	};

	const spawnExplosion = (x, y, color) => {
		for (let i = 0; i < 14 && particles.length < MAX_PARTICLES; i += 1) {
			const a = Math.random() * Math.PI * 2;
			const speed = rand(0.6, 3.2);
			particles.push({
				x, y,
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				life: 1,
				decay: rand(0.012, 0.03),
				color
			});
		}
	};

	const nearestEnemy = (ship) => {
		let best = null;
		let bestDist = Infinity;
		for (const other of ships) {
			if (other.faction === ship.faction) continue;
			const dx = other.x - ship.x;
			const dy = other.y - ship.y;
			const dist = dx * dx + dy * dy;
			if (dist < bestDist) {
				bestDist = dist;
				best = other;
			}
		}
		return { enemy: best, dist: Math.sqrt(bestDist) };
	};

	const updateShips = () => {
		for (const ship of ships) {
			ship.angle += ship.turn;
			ship.x = wrap(ship.x + Math.cos(ship.angle) * SHIP_SPEED, width);
			ship.y = wrap(ship.y + Math.sin(ship.angle) * SHIP_SPEED, height);

			if (Math.random() < 0.01) {
				ship.turn = rand(-0.012, 0.012);
			}

			if (ship.cooldown > 0) {
				ship.cooldown -= 1;
				continue;
			}

			const { enemy, dist } = nearestEnemy(ship);
			if (!enemy || dist > FIRE_RANGE) {
				continue;
			}

			const aim = Math.atan2(enemy.y - ship.y, enemy.x - ship.x);
			ship.angle = aim;
			if (lasers.length < MAX_LASERS) {
				const nose = ship.size + 4;
				lasers.push({
					x: ship.x + Math.cos(aim) * nose,
					y: ship.y + Math.sin(aim) * nose,
					vx: Math.cos(aim) * LASER_SPEED,
					vy: Math.sin(aim) * LASER_SPEED,
					faction: ship.faction,
					color: palette.factions[ship.faction].laser,
					life: 90
				});
			}
			ship.cooldown = FIRE_COOLDOWN + Math.floor(rand(-20, 40));
		}
	};

	const updateLasers = () => {
		for (let i = lasers.length - 1; i >= 0; i -= 1) {
			const laser = lasers[i];
			laser.x += laser.vx;
			laser.y += laser.vy;
			laser.life -= 1;

			let hit = false;
			for (const ship of ships) {
				if (ship.faction === laser.faction) continue;
				const dx = ship.x - laser.x;
				const dy = ship.y - laser.y;
				if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
					spawnExplosion(ship.x, ship.y, palette.factions[ship.faction].glow);
					ship.x = Math.random() * width;
					ship.y = Math.random() * height;
					ship.angle = Math.random() * Math.PI * 2;
					hit = true;
					break;
				}
			}

			if (hit || laser.life <= 0 || laser.x < -30 || laser.x > width + 30 || laser.y < -30 || laser.y > height + 30) {
				lasers.splice(i, 1);
			}
		}
	};

	const updateParticles = () => {
		for (let i = particles.length - 1; i >= 0; i -= 1) {
			const p = particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.vx *= 0.96;
			p.vy *= 0.96;
			p.life -= p.decay;
			if (p.life <= 0) {
				particles.splice(i, 1);
			}
		}
	};

	const drawStars = () => {
		const px = cursor.active ? (cursor.x - width / 2) * CURSOR_PARALLAX : 0;
		const py = cursor.active ? (cursor.y - height / 2) * CURSOR_PARALLAX : 0;

		for (const star of stars) {
			star.twinkle += 0.03;
			const size = 0.4 + star.depth * 1.6;
			const shift = 0.3 + star.depth;
			const alpha = (0.35 + star.depth * 0.55) * (0.7 + 0.3 * Math.sin(star.twinkle));
			dctx.fillStyle = palette.star + alpha.toFixed(3) + ')';
			dctx.beginPath();
			dctx.arc(star.x - px * shift, star.y - py * shift, size, 0, Math.PI * 2);
			dctx.fill();
		}
	};

	const drawShip = (ship, faction) => {
		const { x, y, angle, size } = ship;
		dctx.save();
		dctx.translate(x, y);
		dctx.rotate(angle);

		dctx.fillStyle = faction.glow;
		dctx.beginPath();
		dctx.moveTo(-size, 2);
		dctx.lineTo(-size - rand(10, 15), 0);
		dctx.lineTo(-size, -2);
		dctx.closePath();
		dctx.fill();

		dctx.strokeStyle = faction.ship;
		dctx.lineWidth = 1.5;
		dctx.shadowColor = faction.glow;
		dctx.shadowBlur = 8;
		dctx.beginPath();
		dctx.moveTo(size, 0);
		dctx.lineTo(-size * 0.7, size * 0.7);
		dctx.lineTo(-size * 0.4, 0);
		dctx.lineTo(-size * 0.7, -size * 0.7);
		dctx.closePath();
		dctx.stroke();
		dctx.restore();
	};

	const drawLasers = () => {
		dctx.lineWidth = 2;
		dctx.shadowBlur = 0;
		for (const laser of lasers) {
			dctx.strokeStyle = laser.color;
			dctx.beginPath();
			dctx.moveTo(laser.x, laser.y);
			dctx.lineTo(laser.x - laser.vx * 1.6, laser.y - laser.vy * 1.6);
			dctx.stroke();
		}
	};

	const drawParticles = () => {
		for (const p of particles) {
			dctx.globalAlpha = Math.max(0, p.life);
			dctx.fillStyle = p.color;
			dctx.beginPath();
			dctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
			dctx.fill();
		}
		dctx.globalAlpha = 1;
	};

	const draw = () => {
		// Opaque deep-space background so the CRT texture has body to curve.
		dctx.globalAlpha = 1;
		dctx.shadowBlur = 0;
		dctx.fillStyle = bgGradient;
		dctx.fillRect(0, 0, width, height);

		// Two faint nebula glows.
		const glowA = dctx.createRadialGradient(width * 0.8, height * 0.1, 0, width * 0.8, height * 0.1, width * 0.6);
		glowA.addColorStop(0, palette.glowA);
		glowA.addColorStop(1, 'transparent');
		dctx.fillStyle = glowA;
		dctx.fillRect(0, 0, width, height);

		const glowB = dctx.createRadialGradient(width * 0.1, height * 0.6, 0, width * 0.1, height * 0.6, width * 0.55);
		glowB.addColorStop(0, palette.glowB);
		glowB.addColorStop(1, 'transparent');
		dctx.fillStyle = glowB;
		dctx.fillRect(0, 0, width, height);

		drawStars();
		drawParticles();
		drawLasers();
		for (const ship of ships) {
			drawShip(ship, palette.factions[ship.faction]);
		}
	};

	const tick = () => {
		frame += 1;
		updateShips();
		updateLasers();
		updateParticles();
		draw();
		if (useCRT) {
			crt.render(scene, frame);
		}
		requestAnimationFrame(tick);
	};

	resize();
	requestAnimationFrame(tick);

	window.addEventListener('resize', resize);
	window.addEventListener('pointermove', (event) => {
		cursor = { x: event.clientX, y: event.clientY, active: true };
	});
	window.addEventListener('pointerleave', () => {
		cursor.active = false;
	});

	// ---- WebGL CRT post-processing -----------------------------------------
	function setupCRT(target) {
		const gl = target.getContext('webgl', { antialias: false, alpha: false, depth: false })
			|| target.getContext('experimental-webgl', { antialias: false, alpha: false, depth: false });
		if (!gl) {
			return null;
		}

		const vert = `
			attribute vec2 a_pos;
			varying vec2 v_uv;
			void main() {
				v_uv = a_pos * 0.5 + 0.5;
				gl_Position = vec4(a_pos, 0.0, 1.0);
			}
		`;

		const frag = `
			precision mediump float;
			varying vec2 v_uv;
			uniform sampler2D u_tex;
			uniform vec2 u_res;
			uniform float u_time;
			uniform float u_curve;

			// Push samples outward from centre => bulging glass.
			vec2 barrel(vec2 uv, float amt) {
				vec2 cc = uv - 0.5;
				float d = dot(cc, cc);
				return uv + cc * d * amt;
			}

			void main() {
				vec2 uv = barrel(v_uv, u_curve);

				// Bezel: anything bent past the screen edge is dark glass.
				if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
					gl_FragColor = vec4(0.012, 0.016, 0.028, 1.0);
					return;
				}

				// Chromatic aberration along the curvature.
				float ca = 0.0016;
				vec3 col;
				col.r = texture2D(u_tex, barrel(v_uv, u_curve + ca)).r;
				col.g = texture2D(u_tex, uv).g;
				col.b = texture2D(u_tex, barrel(v_uv, u_curve - ca)).b;

				// Scanlines that follow the curved surface.
				float scan = 0.92 + 0.08 * sin(uv.y * u_res.y * 1.4);
				col *= scan;

				// Aperture-grille shimmer + a faint mains flicker.
				//col *= 0.97 + 0.1 * sin(uv.x * u_res.x * 3.14159);
				//col *= 0.985 + 0.015 * sin(u_time * 0.3);

				// Vignette darkening toward the corners.
				vec2 vg = uv * (1.0 - uv.yx);
				float vig = pow(vg.x * vg.y * 24.0, 0.22);
				col *= clamp(vig, 0.0, 1.0);

				gl_FragColor = vec4(col, 1.0);
			}
		`;

		const compile = (type, src) => {
			const sh = gl.createShader(type);
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
				return null;
			}
			return sh;
		};

		const vs = compile(gl.VERTEX_SHADER, vert);
		const fs = compile(gl.FRAGMENT_SHADER, frag);
		if (!vs || !fs) {
			return null;
		}

		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			return null;
		}
		gl.useProgram(prog);

		// Fullscreen quad.
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(prog, 'a_pos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uTex = gl.getUniformLocation(prog, 'u_tex');
		const uRes = gl.getUniformLocation(prog, 'u_res');
		const uTime = gl.getUniformLocation(prog, 'u_time');
		const uCurve = gl.getUniformLocation(prog, 'u_curve');
		gl.uniform1i(uTex, 0);
		gl.uniform1f(uCurve, CURVATURE);

		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		return {
			resize(w, h) {
				gl.viewport(0, 0, w, h);
				gl.uniform2f(uRes, w, h);
			},
			render(source, frameNo) {
				gl.uniform1f(uTime, frameNo);
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}
		};
	}
})();
