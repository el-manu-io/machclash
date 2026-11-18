export class Display {
  constructor(arena, slots, { maxScale = 2.0, minPeek = 25 } = {}) {
    this.arena = arena;
    this.slots = slots;
    this.maxScale = maxScale;
    this.minPeek = minPeek;

    this.observer = new ResizeObserver(() => this.update());
    this.observer.observe(this.arena);
    window.addEventListener('resize', () => this.update());
    this.update();
  }

  update() {
    const baseWidth = this.slots.offsetWidth;
    const baseHeight = this.slots.offsetHeight;
    if (!baseWidth || !baseHeight) return;

    const arenaStyles = getComputedStyle(this.arena);
    const padX = parseFloat(arenaStyles.paddingLeft) + parseFloat(arenaStyles.paddingRight);
    const padY = parseFloat(arenaStyles.paddingTop) + parseFloat(arenaStyles.paddingBottom);
    const availW = Math.max(0, this.arena.clientWidth - padX);
    const availH = Math.max(0, this.arena.clientHeight - padY);
    if (!availW || !availH) return;

    const cardWidth = parseFloat(getComputedStyle(this.slots).getPropertyValue('--card-width')) || (baseWidth / 2);
    const maxFold = Math.max(0, (cardWidth - this.minPeek) / 2);
    const minSpan = cardWidth + this.minPeek;

    // Prefer height fit; only scale down for width once fold is capped (minSpan).
    const scale = Math.min(
      this.maxScale,
      availH / baseHeight,
      availW / minSpan
    );
    if (!(scale > 0)) return;

    const fold = Math.min(
      maxFold,
      Math.max(0, (baseWidth - availW / scale) / 2)
    );

    this.slots.style.setProperty('--slots-scale', String(scale));
    this.slots.style.setProperty('--fold', `${fold}px`);
  }
}
