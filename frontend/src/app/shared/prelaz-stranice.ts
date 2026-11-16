import { inject } from '@angular/core';
import { isActive, Router, ViewTransitionInfo } from '@angular/router';

export function preskociNepotrebanPrelaz({ transition }: ViewTransitionInfo): void {
  const router = inject(Router);
  const navigacija = router.currentNavigation();
  const istaStranica =
    !!navigacija?.finalUrl &&
    isActive(navigacija.finalUrl, router, {
      paths: 'exact',
      matrixParams: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
    })();

  if (
    istaStranica ||
    navigacija?.trigger === 'popstate' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    transition.skipTransition();
  }
}
