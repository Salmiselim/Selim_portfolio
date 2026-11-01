import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a skip link, the header, the main landmark and the footer', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skip-link')).toBeTruthy();
    expect(el.querySelector('app-site-header')).toBeTruthy();
    expect(el.querySelector('main#main')).toBeTruthy();
    expect(el.querySelector('app-site-footer')).toBeTruthy();
  });
});
