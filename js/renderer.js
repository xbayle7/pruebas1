/**
 * Renderer helpers – draws HUD overlays and screen-flash effects on top of the canvas.
 */
export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.flashAlpha = 0;
    this.flashColor = '#ffffff';
  }

  flash(color = '#ffffff', alpha = 0.5) {
    this.flashAlpha = alpha;
    this.flashColor = color;
  }

  drawFlash() {
    if (this.flashAlpha <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = this.flashAlpha;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    this.flashAlpha = Math.max(0, this.flashAlpha - 0.04);
  }

  /**
   * Speed indicator bar at the top edge.
   */
  drawSpeedBar(ctx, speed, speedMax) {
    const w = ctx.canvas.width;
    const pct = Math.min(1, (speed - 3.5) / (speedMax - 3.5));
    const barW = w * 0.25;
    const barH = 4;
    const bx = (w - barW) / 2;
    const by = 8;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx, by, barW, barH);

    const color = `hsl(${120 - pct * 120}, 100%, 55%)`;
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, barW * pct, barH);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SPD', bx + barW / 2, by + 6);
  }
}
