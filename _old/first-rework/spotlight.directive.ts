import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Soft light that follows the pointer across a card (pattern from 21st.dev "Spotlight Card").
 * Sets --mx / --my on the host; the glow itself is drawn in CSS (.spotlight::before).
 * Mouse only — touch and pen are ignored, and the glow is hidden for reduced motion.
 */
@Directive({
  selector: '[appSpotlight]',
  host: { '(pointermove)': 'onMove($event)' },
})
export class SpotlightDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  onMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const rect = this.el.getBoundingClientRect();
    this.el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    this.el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }
}
