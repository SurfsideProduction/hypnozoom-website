function initNeuroPage(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let nodes = [], W, H;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function initNodes() {
    nodes = [];
    const count = Math.floor((W * H) / 14000);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.01
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const maxDist = 160;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.28;
          const flash = (Math.sin(nodes[i].pulse) + 1) / 2;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(200, 122, 40, ${alpha * (0.5 + flash * 0.5)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
    nodes.forEach(n => {
      n.pulse += n.pulseSpeed;
      const glow = (Math.sin(n.pulse) + 1) / 2;
      const radius = n.r + glow * 2.5;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 3);
      grad.addColorStop(0, `rgba(240, 160, 60, ${0.65 + glow * 0.35})`);
      grad.addColorStop(1, 'rgba(200, 100, 20, 0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 230, 180, ${0.75 + glow * 0.25})`;
      ctx.fill();
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initNodes(); });
  resize(); initNodes(); draw();
}
