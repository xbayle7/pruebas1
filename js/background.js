/**
 * Parallax starfield background with 3 layers.
 */
export class Background {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.layers = this._buildLayers();
  }

  _buildLayers() {
    const counts = [80, 40, 20];
    const speeds = [0.3, 0.7, 1.4];
    const sizes  = [1, 1.5, 2.5];
    return counts.map((count, i) => ({
      stars: Array.from({ length: count }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        brightness: 0.3 + Math.random() * 0.7,
      })),
      speed: speeds[i],
      size: sizes[i],
    }));
  }

  update(gameSpeed) {
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.x -= layer.speed * (gameSpeed / 3.5);
        if (star.x < 0) star.x = this.w;
      }
    }
  }

  draw(ctx, time) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, '#030316');
    grad.addColorStop(0.6, '#050520');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);

    // Stars per layer
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        const twinkle = 0.6 + 0.4 * Math.sin(time * 0.003 + star.x + star.y);
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, layer.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
