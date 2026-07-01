(() => {
  const initBanner = (banner) => {
    if (!banner || banner.dataset.egBannerInitialized === 'true') return;

    banner.dataset.egBannerInitialized = 'true';

    const button = banner.querySelector('.eg-banner__button');

    if (!button) return;

    button.addEventListener('mouseenter', () => {
      button.classList.add('is-hovered');
    });

    button.addEventListener('mouseleave', () => {
      button.classList.remove('is-hovered');
    });

    button.addEventListener('focus', () => {
      button.classList.add('is-hovered');
    });

    button.addEventListener('blur', () => {
      button.classList.remove('is-hovered');
    });

    button.addEventListener('touchstart', () => {
      button.classList.add('is-hovered');

      setTimeout(() => {
        button.classList.remove('is-hovered');
      }, 650);
    });
  };

  document.querySelectorAll('[data-eg-banner]').forEach(initBanner);

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-eg-banner]').forEach(initBanner);
  });
})();