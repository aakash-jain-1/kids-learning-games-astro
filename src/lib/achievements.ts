// Toast notifications, confetti, and a generic achievement unlocking rule-set.
// Extracted so each game only needs to declare its Achievement[] table.

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** Threshold on "learnedSize" that unlocks this achievement. Omit for quiz-based. */
  learnedThreshold?: number;
  /** Threshold on "quizzes completed" that unlocks this achievement. Omit for learn-based. */
  quizThreshold?: number;
}

export interface AchievementState {
  [id: string]: boolean;
}

export interface StatsState {
  quizzes: number;
  correct: number;
  learned: string[];
}

export function showAchToast(ach: Achievement): void {
  const t = document.createElement('div');
  t.className = 'ach-toast';
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.innerHTML = '';
  const icon = document.createElement('span');
  icon.textContent = ach.icon;
  const name = document.createElement('b');
  name.textContent = ach.name;
  t.append(icon, ' ', name, ' unlocked!');
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.4s';
    setTimeout(() => t.remove(), 500);
  }, 2800);
}

export function checkAchievements(
  defs: Achievement[],
  state: AchievementState,
  stats: StatsState,
  learnedSize: number,
): AchievementState {
  let changed = false;
  const next = { ...state };
  for (const a of defs) {
    if (next[a.id]) continue;
    const learnUnlock = a.learnedThreshold != null && learnedSize >= a.learnedThreshold;
    const quizUnlock = a.quizThreshold != null && stats.quizzes >= a.quizThreshold;
    if (learnUnlock || quizUnlock) {
      next[a.id] = true;
      changed = true;
      showAchToast(a);
    }
  }
  return changed ? next : state;
}

export function launchConfetti(colors: string[]): void {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const cvs = document.createElement('canvas');
  cvs.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  document.body.appendChild(cvs);

  const ctx = cvs.getContext('2d');
  if (!ctx) {
    cvs.remove();
    return;
  }

  interface Particle {
    x: number;
    y: number;
    s: number;
    c: string;
    vy: number;
    vx: number;
    round: boolean;
  }
  const ps: Particle[] = [];
  for (let i = 0; i < 80; i++) {
    ps.push({
      x: Math.random() * cvs.width,
      y: Math.random() * -cvs.height * 0.5,
      s: 4 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)]!,
      vy: 1.5 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      round: Math.random() > 0.5,
    });
  }

  let af = 0;
  let t = 0;
  const draw = (): void => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    let alive = false;
    for (const p of ps) {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.03;
      if (p.y < cvs.height + 20) {
        alive = true;
        ctx.fillStyle = p.c;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s / 2, 0, 6.28);
          ctx.fill();
        } else {
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
      }
    }
    t++;
    if (alive && t < 300) {
      af = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(af);
      cvs.remove();
    }
  };
  draw();
}
