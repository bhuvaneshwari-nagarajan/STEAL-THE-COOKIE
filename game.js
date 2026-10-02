/**
 * STEAL THE COOKIE 🍪
 * Complete Canvas Arcade Game Engine
 */

// --- Procedural Web Audio Engine ---
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playCrunch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.Q.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);

    // Sweet pitch chime
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5
    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playDash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.14);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playDecoyPoof() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
}

// --- Cookie Entity ---
class CookieEntity {
  constructor(opts) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.radius = opts.radius || 38;
    this.isReal = opts.isReal !== undefined ? opts.isReal : true;
    this.isSubtleClue = opts.isSubtleClue || false;
    this.speed = opts.speed || 0;
    this.fleeRadius = opts.fleeRadius || 0;
    this.canDash = opts.canDash || false;

    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = 0;
    this.scaleX = 1;
    this.scaleY = 1;

    this.dashCooldown = 0;
    this.isDashing = false;
    this.dashTrail = [];
    this.collected = false;

    // Fixed chocolate chips layout relative to center
    this.chips = [
      { x: -0.32, y: -0.30, r: 0.16 },
      { x: 0.35, y: -0.28, r: 0.15 },
      { x: -0.05, y: -0.05, r: 0.18 },
      { x: -0.38, y: 0.28, r: 0.14 },
      { x: 0.32, y: 0.32, r: 0.17 },
      { x: 0.05, y: 0.42, r: 0.13 },
      { x: -0.15, y: 0.22, r: 0.12 }
    ];

    // Perimeter jagged points for crunchy baked edge
    this.edgePoints = [];
    const numPoints = 28;
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const variation = 0.94 + Math.sin(i * 3) * 0.04 + Math.random() * 0.03;
      this.edgePoints.push({ a, variation });
    }
  }

  update(dt, pointer, bounds, sfx, fx, char) {
    if (this.collected) return;

    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // Pointer Proximity & Evasion AI
    if (pointer.active && this.fleeRadius > 0) {
      const dx = this.x - pointer.x;
      const dy = this.y - pointer.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.fleeRadius && dist > 1) {
        // High speed dash maneuver for Level 5 & 7
        if (this.canDash && this.dashCooldown <= 0 && dist < 100) {
          this.dashCooldown = 1.6;
          this.isDashing = true;
          sfx.playDash();
          char.triggerShock();
          fx.addDashTrail(this.x, this.y, this.radius);

          // Leap towards safe open area
          const targetX = dx > 0 ? bounds.w * 0.8 : bounds.w * 0.2;
          const targetY = Math.random() * (bounds.h * 0.6) + bounds.h * 0.15;
          const leapAngle = Math.atan2(targetY - this.y, targetX - this.x);
          const leapPower = 18;
          this.vx = Math.cos(leapAngle) * leapPower;
          this.vy = Math.sin(leapAngle) * leapPower;
        } else {
          // Smooth evasion force
          const force = ((this.fleeRadius - dist) / this.fleeRadius) * this.speed * 45;
          const normalX = dx / dist;
          const normalY = dy / dist;

          // Add slight perpendicular evasion so it doesn't just run in a straight line
          const perpX = -normalY * 0.35;
          const perpY = normalX * 0.35;

          this.vx += (normalX + perpX) * force * dt;
          this.vy += (normalY + perpY) * force * dt;
        }
      }
    }

    // Corner avoidance
    const margin = 80;
    if (this.x < margin) this.vx += (margin - this.x) * 1.5 * dt;
    if (this.x > bounds.w - margin) this.vx -= (this.x - (bounds.w - margin)) * 1.5 * dt;
    if (this.y < margin) this.vy += (margin - this.y) * 1.5 * dt;
    if (this.y > bounds.h - margin) this.vy -= (this.y - (bounds.h - margin)) * 1.5 * dt;

    // Movement & Damping
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.91;
    this.vy *= 0.91;

    // Bounce off physical screen boundaries
    const pad = this.radius + 10;
    if (this.x < pad) { this.x = pad; this.vx = Math.abs(this.vx) * 0.8; }
    if (this.x > bounds.w - pad) { this.x = bounds.w - pad; this.vx = -Math.abs(this.vx) * 0.8; }
    if (this.y < pad) { this.y = pad; this.vy = Math.abs(this.vy) * 0.8; }
    if (this.y > bounds.h - pad) { this.y = bounds.h - pad; this.vy = -Math.abs(this.vy) * 0.8; }

    // Dynamic rotation and squash/stretch physics
    const currentSpeed = Math.hypot(this.vx, this.vy);
    this.rotSpeed = this.vx * 0.04;
    this.angle += this.rotSpeed;

    // Squash stretch
    const stretch = Math.min(0.25, currentSpeed * 0.015);
    this.scaleX = 1 + stretch;
    this.scaleY = 1 - stretch * 0.7;

    if (currentSpeed > 6) {
      fx.addSpeedDust(this.x, this.y, this.radius);
    }
  }

  draw(ctx, time) {
    if (this.collected) return;

    const r = this.radius;

    // 1. Soft Floor Drop Shadow
    ctx.save();
    ctx.translate(this.x, this.y + r * 0.85);
    ctx.scale(this.scaleX, 0.3);
    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Main Cookie Body (With Squash/Stretch & Rotation)
    ctx.save();
    ctx.translate(this.x, this.y);
    const moveAngle = Math.atan2(this.vy, this.vx);
    if (Math.hypot(this.vx, this.vy) > 1) {
      ctx.rotate(moveAngle);
      ctx.scale(this.scaleX, this.scaleY);
      ctx.rotate(-moveAngle + this.angle);
    } else {
      ctx.rotate(this.angle);
    }

    // Outer baked biscuit path
    ctx.beginPath();
    for (let i = 0; i < this.edgePoints.length; i++) {
      const pt = this.edgePoints[i];
      const px = Math.cos(pt.a) * (r * pt.variation);
      const py = Math.sin(pt.a) * (r * pt.variation);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Baked Cookie Radial Gradient
    const cookieGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    cookieGrad.addColorStop(0, '#FED7AA'); // light warm top
    cookieGrad.addColorStop(0.35, '#F59E0B'); // golden amber
    cookieGrad.addColorStop(0.75, '#D97706'); // baked brown
    cookieGrad.addColorStop(1, '#92400E'); // crispy edge
    ctx.fillStyle = cookieGrad;
    ctx.fill();

    // Baked outer crust outline
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Baked texture fissures / cracks
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.1, -r * 0.25, r * 0.2, -r * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.3);
    ctx.quadraticCurveTo(r * 0.1, r * 0.4, r * 0.35, r * 0.25);
    ctx.stroke();

    // Chocolate Chips with 3D depth & glossy highlights
    for (const chip of this.chips) {
      const cx = chip.x * r;
      const cy = chip.y * r;
      const cr = chip.r * r;

      // Chip base shadow
      ctx.fillStyle = '#240D02';
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1.5, cr, 0, Math.PI * 2);
      ctx.fill();

      // Chip main body
      const chipGrad = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.1, cx, cy, cr);
      chipGrad.addColorStop(0, '#592205');
      chipGrad.addColorStop(0.7, '#381402');
      chipGrad.addColorStop(1, '#1E0B02');
      ctx.fillStyle = chipGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Chip glossy specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.35, cy - cr * 0.35, cr * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle Glint / Clue on authentic target in Stage 6 & 7
    if (this.isSubtleClue) {
      const starPulse = Math.sin(time * 4) * 0.35 + 0.65;
      ctx.save();
      ctx.translate(r * 0.25, -r * 0.35);
      ctx.scale(starPulse, starPulse);
      ctx.fillStyle = '#FFFBEB';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 12;

      // Draw 4-point star sparkle
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(0, 0, 7, 0);
      ctx.quadraticCurveTo(0, 0, 0, 7);
      ctx.quadraticCurveTo(0, 0, -7, 0);
      ctx.quadraticCurveTo(0, 0, 0, -7);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

// --- Character: Nibbles the Thief ---
class NibblesCharacter {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.width = 72;
    this.height = 68;

    this.state = 'idle'; // 'idle', 'surprised', 'celebrate', 'eating'
    this.stateTimer = 0;
    this.breathePhase = 0;
    this.pupilOffsetX = 0;
    this.pupilOffsetY = 0;
  }

  update(dt, pointer, cookies, bounds) {
    this.breathePhase += dt * 3;

    // Follow / stay near bottom right or target
    const targetAnchorX = bounds.w * 0.82;
    const targetAnchorY = bounds.h * 0.85;
    this.x += (targetAnchorX - this.x) * 4 * dt;
    this.y += (targetAnchorY - this.y) * 4 * dt;

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 && this.state !== 'eating') {
        this.state = 'idle';
      }
    }

    // Eye Tracking: Look towards closest real cookie or cursor
    let lookTarget = pointer.active ? pointer : null;
    const realCookie = cookies.find(c => c.isReal && !c.collected);
    if (realCookie) {
      lookTarget = realCookie;
    }

    if (lookTarget) {
      const dx = lookTarget.x - this.x;
      const dy = lookTarget.y - (this.y - 10);
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(3.5, Math.hypot(dx, dy) * 0.02);
      this.pupilOffsetX = Math.cos(angle) * dist;
      this.pupilOffsetY = Math.sin(angle) * dist;
    }
  }

  triggerShock() {
    this.state = 'surprised';
    this.stateTimer = 0.8;
  }

  triggerCelebrate() {
    this.state = 'celebrate';
    this.stateTimer = 1.4;
  }

  draw(ctx) {
    const cx = this.x;
    const cy = this.y;

    const breatheY = Math.sin(this.breathePhase) * 2;
    const isShocked = this.state === 'surprised';
    const isHappy = this.state === 'celebrate';

    ctx.save();
    ctx.translate(cx, cy + (isShocked ? -12 : isHappy ? -Math.abs(Math.sin(this.breathePhase * 3) * 14) : breatheY));

    // Base Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earTwitch = Math.sin(this.breathePhase * 1.5) * 0.08;
    // Left Ear
    ctx.save();
    ctx.translate(-18, -20);
    ctx.rotate(-0.35 + earTwitch);
    ctx.fillStyle = '#4F64D8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(0, 1, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(18, -20);
    ctx.rotate(0.35 - earTwitch);
    ctx.fillStyle = '#4F64D8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(0, 1, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main Body
    const bodyGrad = ctx.createRadialGradient(-6, -8, 5, 0, 0, 32);
    bodyGrad.addColorStop(0, '#7C92FF');
    bodyGrad.addColorStop(0.7, '#4F64D8');
    bodyGrad.addColorStop(1, '#36459B');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cream Belly
    ctx.fillStyle = '#EDF2F7';
    ctx.beginPath();
    ctx.ellipse(0, 6, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blushing Cheeks
    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-16, 2, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(16, 2, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    if (isShocked) {
      // Big round shocked eyes
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-10, -4, 7.5, 0, Math.PI * 2);
      ctx.arc(10, -4, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-10, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(10, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Sweat drop
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(22, -18);
      ctx.quadraticCurveTo(25, -24, 24, -28);
      ctx.quadraticCurveTo(27, -24, 26, -18);
      ctx.fill();

    } else if (isHappy) {
      // Squinting happy arc eyes
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-10, -3, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(10, -3, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

    } else {
      // Normal tracked eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-10, -4, 5.5, 0, Math.PI * 2);
      ctx.arc(10, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil highlights with directional offset
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-10 + this.pupilOffsetX, -4 + this.pupilOffsetY, 2.2, 0, Math.PI * 2);
      ctx.arc(10 + this.pupilOffsetX, -4 + this.pupilOffsetY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (isShocked) {
      ctx.arc(0, 8, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
    } else {
      ctx.moveTo(-5, 6);
      ctx.quadraticCurveTo(0, 10, 5, 6);
      ctx.stroke();
    }

    // Paws
    ctx.fillStyle = '#3B49A8';
    ctx.beginPath();
    ctx.ellipse(-14, 18, 5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(14, 18, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Particle & FX Engine ---
class FXEngine {
  constructor() {
    this.particles = [];
    this.floatingScores = [];
    this.ambientDust = [];
    this.cameraShake = 0;
    this.freezeFrames = 0;

    // Initialize ambient background luminous dust
    for (let i = 0; i < 42; i++) {
      this.ambientDust.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        r: Math.random() * 2 + 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.4 + 0.1,
        depth: Math.random() * 0.7 + 0.3
      });
    }
  }

  addCrumbBurst(x, y, count = 28, isChoc = true) {
    const colors = isChoc
      ? ['#F59E0B', '#D97706', '#92400E', '#78350F', '#FED7AA', '#FFFFFF']
      : ['#9CA3AF', '#6B7280', '#D1D5DB'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 16,
        type: 'crumb'
      });
    }
  }

  addDashTrail(x, y, radius) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * radius,
        y: y + (Math.random() - 0.5) * radius,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 12 + 6,
        color: 'rgba(245, 158, 11, 0.4)',
        life: 1.0,
        decay: 0.06,
        rot: 0,
        rotSpeed: 0,
        type: 'smoke'
      });
    }
  }

  addSpeedDust(x, y, radius) {
    if (Math.random() < 0.3) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * radius,
        y: y + radius * 0.6,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.5,
        size: Math.random() * 3 + 1,
        color: 'rgba(255, 255, 255, 0.25)',
        life: 1.0,
        decay: 0.05,
        type: 'dust'
      });
    }
  }

  addScorePopup(x, y, text) {
    this.floatingScores.push({
      x, y,
      text,
      vy: -1.8,
      life: 1.0,
      decay: 0.025
    });
  }

  triggerImpactShake(intensity = 6, freezeCount = 5) {
    this.cameraShake = intensity;
    this.freezeFrames = freezeCount;
  }

  update(dt, bounds, cameraOffset) {
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
      return;
    }

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake *= 0.88;
      if (this.cameraShake < 0.2) this.cameraShake = 0;
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'crumb') {
        p.vy += 0.22; // gravity
        p.vx *= 0.98;
      }
      p.life -= p.decay;
      p.rot += p.rotSpeed || 0;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating Score Popups
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const s = this.floatingScores[i];
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) {
        this.floatingScores.splice(i, 1);
      }
    }

    // Ambient Dust loop
    for (const d of this.ambientDust) {
      d.x += d.vx + cameraOffset.x * d.depth * 0.02;
      d.y += d.vy;
      if (d.y < 0) d.y = bounds.h;
      if (d.x < 0) d.x = bounds.w;
      if (d.x > bounds.w) d.x = 0;
    }
  }

  drawBackground(ctx, bounds, cameraOffset) {
    // 1. Charcoal Depth Background
    const bgGrad = ctx.createRadialGradient(
      bounds.w / 2 + cameraOffset.x * 0.3,
      bounds.h / 2 + cameraOffset.y * 0.3,
      bounds.h * 0.1,
      bounds.w / 2,
      bounds.h / 2,
      bounds.w * 0.75
    );
    bgGrad.addColorStop(0, '#121622');
    bgGrad.addColorStop(0.6, '#0B0D14');
    bgGrad.addColorStop(1, '#05070A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, bounds.w, bounds.h);

    // 2. Subtle 3D Depth Floor Grid / Vignette Shadow Plane
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 70;
    const offsetX = (cameraOffset.x * 0.2) % gridSize;
    const offsetY = (cameraOffset.y * 0.2) % gridSize;

    for (let x = offsetX; x < bounds.w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, bounds.h);
      ctx.stroke();
    }
    for (let y = offsetY; y < bounds.h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(bounds.w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Floating Ambient Luminous Dust
    for (const d of this.ambientDust) {
      ctx.fillStyle = `rgba(245, 158, 11, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawForeground(ctx) {
    // Render Crumb & Smoke Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      if (p.type === 'crumb') {
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (2 - p.life), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    // Render Floating Score Popups
    for (const s of this.floatingScores) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.font = "800 18px 'Outfit', sans-serif";
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    }
  }
}

// --- Master Game Engine ---
class StealTheCookieGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM UI
    this.hudStage = document.getElementById('hudStage');
    this.hudTime = document.getElementById('hudTime');
    this.hudScore = document.getElementById('hudScore');
    this.hudHint = document.getElementById('hudHint');
    this.btnSound = document.getElementById('btnSound');
    this.soundIcon = document.getElementById('soundIcon');
    this.btnRestart = document.getElementById('btnRestart');
    this.startOverlay = document.getElementById('startOverlay');
    this.btnStartGame = document.getElementById('btnStartGame');
    this.endOverlay = document.getElementById('endOverlay');
    this.endingPhase1 = document.getElementById('endingPhase1');
    this.endingPhase2 = document.getElementById('endingPhase2');
    this.btnPlayAgain = document.getElementById('btnPlayAgain');
    this.endScore = document.getElementById('endScore');
    this.endTime = document.getElementById('endTime');
    this.endClicks = document.getElementById('endClicks');
    this.suspectCanvas = document.getElementById('suspectCanvas');

    // Engines
    this.sfx = new AudioEngine();
    this.fx = new FXEngine();
    this.char = new NibblesCharacter();

    // Game State
    this.isPlaying = false;
    this.currentLevel = 1;
    this.maxLevels = 7;
    this.score = 0;
    this.totalClicks = 0;
    this.startTime = 0;
    this.cookies = [];
    this.bounds = { w: window.innerWidth, h: window.innerHeight };
    this.pointer = { x: -1000, y: -1000, active: false };
    this.cameraOffset = { x: 0, y: 0 };
    this.lastTime = performance.now();

    this.levelConfigs = [
      { num: 1, name: "THE STATIONARY TARGET", hint: "Catch the cookie!", speed: 0, fleeRadius: 0, fakes: 0 },
      { num: 2, name: "WOBBLY RUNNER", hint: "It slips away when close!", speed: 2.5, fleeRadius: 130, fakes: 0 },
      { num: 3, name: "SMART ESCAPE", hint: "Intelligent dodging! Corner it!", speed: 5.2, fleeRadius: 170, fakes: 0 },
      { num: 4, name: "DECEPTIVE DECOYS", hint: "Fake cookies crumble! Find the real one!", speed: 4.2, fleeRadius: 150, fakes: 4 },
      { num: 5, name: "SONIC DASH", hint: "Anticipate the instant jump!", speed: 7.0, fleeRadius: 150, fakes: 0, canDash: true },
      { num: 6, name: "COOKIE CLONES", hint: "Spot the subtle golden sparkle clue! ✨", speed: 4.0, fleeRadius: 140, fakes: 6, isSubtleClue: true },
      { num: 7, name: "COOKIE CHAOS! 🌪️", hint: "THE GRAND HEIST! Catch the Master Cookie!", speed: 6.5, fleeRadius: 160, fakes: 14, canDash: true, isSubtleClue: true }
    ];

    this.initEvents();
    this.resize();
    this.startLoop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.bounds.w = window.innerWidth;
    this.bounds.h = window.innerHeight;

    this.canvas.width = this.bounds.w * dpr;
    this.canvas.height = this.bounds.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    // Pointer Interaction
    const setPointer = (clientX, clientY, active = true) => {
      this.pointer.x = clientX;
      this.pointer.y = clientY;
      this.pointer.active = active;

      // Parallax camera response
      this.cameraOffset.x = (clientX - this.bounds.w / 2) * 0.05;
      this.cameraOffset.y = (clientY - this.bounds.h / 2) * 0.05;
    };

    window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY));
    
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    const handlePointerAction = (clientX, clientY) => {
      if (!this.isPlaying) return;
      this.sfx.init();
      this.totalClicks++;
      setPointer(clientX, clientY, true);

      // Check click hits on cookies
      for (let i = this.cookies.length - 1; i >= 0; i--) {
        const cookie = this.cookies[i];
        if (cookie.collected) continue;

        const dist = Math.hypot(clientX - cookie.x, clientY - cookie.y);
        if (dist <= cookie.radius + 8) {
          this.handleCookieCaught(cookie);
          break;
        }
      }
    };

    window.addEventListener('pointerdown', (e) => {
      handlePointerAction(e.clientX, e.clientY);
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!this.isPlaying) {
          e.preventDefault();
          this.startGame();
        } else if (this.endOverlay.classList.contains('active')) {
          e.preventDefault();
          this.restartGame();
        }
      }
    });

    // Buttons
    this.btnStartGame.addEventListener('click', () => this.startGame());
    this.btnPlayAgain.addEventListener('click', () => this.restartGame());
    this.btnRestart.addEventListener('click', () => this.restartGame());

    this.btnSound.addEventListener('click', () => {
      const isMuted = this.sfx.toggleMute();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  startGame() {
    this.sfx.init();
    this.isPlaying = true;
    this.score = 0;
    this.totalClicks = 0;
    this.startTime = performance.now();
    this.startOverlay.classList.remove('active');
    this.endOverlay.classList.remove('active');
    this.loadLevel(1);
  }

  restartGame() {
    this.startGame();
  }

  loadLevel(lvl) {
    this.currentLevel = lvl;
    const cfg = this.levelConfigs[lvl - 1];

    this.hudStage.innerHTML = `${String(lvl).padStart(2, '0')}<span class="hud-sub">/07</span>`;
    this.hudHint.textContent = cfg.hint;

    // Pulse HUD hint
    this.hudHint.style.transform = 'translateX(-50%) scale(1.1)';
    setTimeout(() => { this.hudHint.style.transform = 'translateX(-50%) scale(1)'; }, 250);

    this.cookies = [];

    // Real Target Cookie
    this.cookies.push(new CookieEntity({
      x: this.bounds.w / 2,
      y: this.bounds.h / 2 - 30,
      radius: 38,
      isReal: true,
      isSubtleClue: cfg.isSubtleClue || false,
      speed: cfg.speed,
      fleeRadius: cfg.fleeRadius,
      canDash: cfg.canDash || false
    }));

    // Spawn Decoy Cookies
    if (cfg.fakes > 0) {
      for (let i = 0; i < cfg.fakes; i++) {
        const angle = (i / cfg.fakes) * Math.PI * 2;
        const dist = Math.min(this.bounds.w, this.bounds.h) * 0.32;
        this.cookies.push(new CookieEntity({
          x: this.bounds.w / 2 + Math.cos(angle) * dist,
          y: this.bounds.h / 2 + Math.sin(angle) * dist,
          radius: 38,
          isReal: false,
          speed: cfg.speed * 0.85,
          fleeRadius: cfg.fleeRadius * 0.85
        }));
      }
    }
  }

  handleCookieCaught(cookie) {
    if (cookie.isReal) {
      // SUCCESS! Real Cookie Stolen
      cookie.collected = true;
      this.sfx.playCrunch();
      this.fx.addCrumbBurst(cookie.x, cookie.y, 36, true);
      this.fx.triggerImpactShake(8, 4);
      this.fx.addScorePopup(cookie.x, cookie.y - 20, '+500 PTS');

      this.score += 500;
      this.hudScore.textContent = String(this.score).padStart(4, '0');
      this.char.triggerCelebrate();

      // Progress to next stage or finish
      setTimeout(() => {
        if (this.currentLevel < this.maxLevels) {
          this.loadLevel(this.currentLevel + 1);
        } else {
          this.triggerEndingCutscene();
        }
      }, 650);

    } else {
      // Decoy Pop
      cookie.collected = true;
      this.sfx.playDecoyPoof();
      this.fx.addCrumbBurst(cookie.x, cookie.y, 16, false);
      this.fx.triggerImpactShake(3, 2);
      this.fx.addScorePopup(cookie.x, cookie.y - 20, 'DECOY!');
      this.char.triggerShock();
    }
  }

  triggerEndingCutscene() {
    this.sfx.playVictory();
    this.isPlaying = false;

    // Compute stats
    const totalSec = Math.floor((performance.now() - this.startTime) / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    this.endTime.textContent = `${mins}:${secs}`;
    this.endScore.textContent = String(this.score).padStart(4, '0');
    this.endClicks.textContent = this.totalClicks;

    // Phase 1: COOKIE STOLEN!
    this.endingPhase1.classList.remove('hidden');
    this.endingPhase2.classList.add('hidden');
    this.endOverlay.classList.add('active');

    // Phase 2: WAIT... WHO STOLE IT?! (After 1.6s)
    setTimeout(() => {
      this.sfx.playDash();
      this.endingPhase1.classList.add('hidden');
      this.endingPhase2.classList.remove('hidden');
      this.drawSuspectAnimation();
    }, 1600);
  }

  drawSuspectAnimation() {
    if (!this.suspectCanvas) return;
    const ctx = this.suspectCanvas.getContext('2d');
    let phase = 0;

    const anim = () => {
      if (!this.endOverlay.classList.contains('active')) return;
      phase += 0.1;
      ctx.clearRect(0, 0, 180, 150);

      ctx.save();
      ctx.translate(90, 75);

      // Cute guilty Nibbles with bulging cheeks
      const chewScale = 1 + Math.sin(phase * 4) * 0.08;
      ctx.scale(chewScale, 1 / chewScale);

      // Body
      ctx.fillStyle = '#4F64D8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheeks
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(-22, 4, 7, 0, Math.PI * 2);
      ctx.arc(22, 4, 7, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (guilty squint)
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-14, -6, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(14, -6, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Half-eaten cookie in paws
      ctx.save();
      ctx.translate(0, 16);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#381402';
      ctx.beginPath();
      ctx.arc(-4, 6, 2.5, 0, Math.PI * 2);
      ctx.arc(5, 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cookie crumbs around mouth
      ctx.fillStyle = '#92400E';
      ctx.fillRect(-6, 2, 2.5, 2.5);
      ctx.fillRect(5, 3, 2.5, 2.5);
      ctx.fillRect(0, 7, 2, 2);

      ctx.restore();
      requestAnimationFrame(anim);
    };
    anim();
  }

  startLoop() {
    const loop = (now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      // Update timer HUD
      if (this.isPlaying) {
        const elapsedSec = Math.floor((now - this.startTime) / 1000);
        const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const s = String(elapsedSec % 60).padStart(2, '0');
        this.hudTime.textContent = `${m}:${s}`;
      }

      // Update Physics
      this.fx.update(dt, this.bounds, this.cameraOffset);
      this.char.update(dt, this.pointer, this.cookies, this.bounds);

      for (const cookie of this.cookies) {
        cookie.update(dt, this.pointer, this.bounds, this.sfx, this.fx, this.char);
      }

      // Render Scene
      this.ctx.save();

      // Camera Shake
      if (this.fx.cameraShake > 0) {
        const shakeX = (Math.random() - 0.5) * this.fx.cameraShake * 2;
        const shakeY = (Math.random() - 0.5) * this.fx.cameraShake * 2;
        this.ctx.translate(shakeX, shakeY);
      }

      // Background & Dust
      this.fx.drawBackground(this.ctx, this.bounds, this.cameraOffset);

      // Character & Cookies
      this.char.draw(this.ctx);
      for (const cookie of this.cookies) {
        cookie.draw(this.ctx, now * 0.001);
      }

      // Foreground Particles & Score Floating
      this.fx.drawForeground(this.ctx);

      this.ctx.restore();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Boot Engine
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new StealTheCookieGame();
});
