export class Display {
  constructor(arena, slots, { maxScale = 1.5 } = {}) {
    this.arena = arena;
    this.slots = slots;
    this.maxScale = maxScale;
    this.header = document.querySelector('body > header');
    this.footer = document.querySelector('body > footer');

    this.observer = new ResizeObserver(() => this.update());
    this.observer.observe(document.body);
    window.addEventListener('resize', () => this.update());
    this.update();
  }

  update() {
    const baseWidth = this.slots.offsetWidth;
    const baseHeight = this.slots.offsetHeight;
    if (!baseWidth || !baseHeight) return;

    const headerH = this.header?.offsetHeight ?? 0;
    const footerH = this.footer?.offsetHeight ?? 0;
    const arenaStyles = getComputedStyle(this.arena);
    const padX = parseFloat(arenaStyles.paddingLeft) + parseFloat(arenaStyles.paddingRight);
    const availW = this.arena.clientWidth - padX;
    const availH = window.innerHeight - headerH - footerH;

    const heightScale = availH / baseHeight;
    const widthScale = availW / baseWidth;
    const scale = Math.min(
      this.maxScale,
      heightScale,
      Math.max(1, widthScale) // never shrink for width; fold handles narrow layouts
    );

    this.slots.style.setProperty('--slots-scale', String(scale));
    // Match arena box to the visual (scaled) slots size — transform does not affect layout.
    this.arena.style.height = `${baseHeight * scale}px`;
  }
}
