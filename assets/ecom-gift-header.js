(() => {
  const initHeader = (header) => {
    if (!header || header.dataset.egHeaderInitialized === 'true') return;

    header.dataset.egHeaderInitialized = 'true';

    const openButton = header.querySelector('[data-eg-header-open]');
    const closeButton = header.querySelector('[data-eg-header-close]');
    const panel = header.querySelector('[data-eg-header-panel]');

    if (!openButton || !closeButton || !panel) return;

    const openMenu = () => {
      header.classList.add('is-menu-open');
      openButton.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
    };

    const closeMenu = () => {
      header.classList.remove('is-menu-open');
      openButton.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    };

    openButton.addEventListener('click', openMenu);
    closeButton.addEventListener('click', closeMenu);

    panel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  };

  document.querySelectorAll('[data-eg-header]').forEach(initHeader);

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-eg-header]').forEach(initHeader);
  });
})();