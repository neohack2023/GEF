export const visualModules = {
  voidCore(ctx, w, h, time, audio) {
    ctx.fillStyle = 'rgba(5,5,8,0.18)';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const rings = 9;

    for (let i = rings; i >= 0; i--) {
      const t = i / Math.max(rings, 1);
      const radius = 50 + t * Math.min(w, h) * 0.42 + audio.bass * 160 + Math.sin(time * (1 + t)) * 18;
      const wobbleX = Math.sin(time * 2.0 + i) * audio.glitch * 28;
      const wobbleY = Math.cos(time * 1.3 + i) * audio.mid * 22;

      ctx.beginPath();
      ctx.arc(cx + wobbleX, cy + wobbleY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${40 + audio.centroid * 255}, ${150 + t * 80}, 255, ${0.05 + t * 0.08})`;
      ctx.lineWidth = 1 + t * 4;
      ctx.stroke();
    }

    if (audio.beat > 0.5) {
      ctx.fillStyle = `rgba(0,255,136,${0.08 + audio.beat * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }
  },

  chromaSlice(ctx, w, h, time, audio, sourceCanvas) {
    if (!sourceCanvas || audio.glitch < 0.35) return;

    const slices = 4 + Math.floor(audio.glitch * 8);
    for (let i = 0; i < slices; i++) {
      const y = Math.random() * h;
      const sliceHeight = 4 + Math.random() * 18;
      const dx = (Math.random() - 0.5) * audio.glitch * 55;
      ctx.drawImage(sourceCanvas, 0, y, w, sliceHeight, dx, y, w, sliceHeight);
    }
  },

  spectralGrid(ctx, w, h, time, audio) {
    const spacing = 48 - Math.min(audio.mid * 20, 28);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${80 + audio.centroid * 120}, 255, 210, ${0.06 + audio.treble * 0.16})`;

    for (let x = -spacing; x < w + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(time + x * 0.01) * audio.glitch * 18, 0);
      ctx.lineTo(x + Math.cos(time + x * 0.01) * audio.glitch * 18, h);
      ctx.stroke();
    }

    for (let y = -spacing; y < h + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.cos(time + y * 0.01) * audio.glitch * 18);
      ctx.lineTo(w, y + Math.sin(time + y * 0.01) * audio.glitch * 18);
      ctx.stroke();
    }

    ctx.restore();
  },

  beatBloom(ctx, w, h, time, audio) {
    if (audio.beat < 0.2) return;
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.55);
    gradient.addColorStop(0, `rgba(0,255,136,${0.18 * audio.beat})`);
    gradient.addColorStop(0.45, `rgba(0,184,255,${0.08 * audio.beat})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
};
