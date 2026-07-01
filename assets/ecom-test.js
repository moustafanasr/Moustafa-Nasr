(() => {
  const BONUS_PRODUCT_HANDLE = "dark-winter-jacket";

  const ADD_ARROW_SVG = `
    <svg width="27" height="12" viewBox="0 0 27 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M0.75 4.77H25.75M20.44 0.22L26.28 5.52L20.44 10.82" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `;

  const SIZE_ARROW_SVG = `
    <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M1.06 1.06L7.06 7.06L13.06 1.06" stroke="black" stroke-width="1.5"/>
    </svg>
  `;

  const addButtonHTML = (label) => {
    return `${label} <span class="eg-button-arrow">${ADD_ARROW_SVG}</span>`;
  };

  const initGrid = (grid) => {
    if (!grid || grid.dataset.egInitialized === "true") return;
    grid.dataset.egInitialized = "true";

    const popup = grid.querySelector("[data-eg-popup]");
    const titleEl = grid.querySelector("[data-eg-popup-title]");
    const priceEl = grid.querySelector("[data-eg-popup-price]");
    const descEl = grid.querySelector("[data-eg-popup-description]");
    const imageEl = grid.querySelector("[data-eg-popup-image]");
    const optionsEl = grid.querySelector("[data-eg-popup-options]");
    const addButton = grid.querySelector("[data-eg-add-cart]");
    const messageEl = grid.querySelector("[data-eg-message]");

    const toast = grid.querySelector("[data-eg-cart-toast]");
    const toastClose = grid.querySelector("[data-eg-cart-toast-close]");
    const toastImage = grid.querySelector("[data-eg-toast-image]");
    const toastTitle = grid.querySelector("[data-eg-toast-title]");
    const toastQty = grid.querySelector("[data-eg-toast-qty]");
    const toastPrice = grid.querySelector("[data-eg-toast-price]");

    if (!popup || !optionsEl || !addButton) return;

    const currency = grid.dataset.currency || "USD";

    let activeProduct = null;
    let selectedOptions = [];
    let selectedVariant = null;
    let toastTimer = null;
    let bonusProductCache = null;

    const cleanText = (value) => String(value || "").trim().toLowerCase();

    const isSizeOption = (name) => cleanText(name).includes("size");

    const isColorOption = (name) => {
      const clean = cleanText(name);
      return clean.includes("color") || clean.includes("colour");
    };

    const formatMoney = (cents) => {
      const amount = Number(cents || 0) / 100;

      try {
        return new Intl.NumberFormat(document.documentElement.lang || "en", {
          style: "currency",
          currency
        }).format(amount);
      } catch {
        return `${amount.toFixed(2)} ${currency}`;
      }
    };

    const setPopupSizeState = (dropdown, isOpen) => {
      const body = dropdown.closest(".eg-popup__body");
      if (body) body.classList.toggle("is-size-open", isOpen);
    };

    const closeAllSizeDropdowns = () => {
      grid.querySelectorAll(".eg-size-dropdown.is-open").forEach((dropdown) => {
        dropdown.classList.remove("is-open");
        setPopupSizeState(dropdown, false);
      });
    };

    const resetSizeOptions = () => {
      if (!activeProduct) return;

      activeProduct.options.forEach((name, index) => {
        if (isSizeOption(name)) selectedOptions[index] = "";
      });
    };

    const getOptionValues = (product, optionIndex) => {
      const values = new Set();

      product.variants.forEach((variant) => {
        if (variant.options && variant.options[optionIndex]) {
          values.add(variant.options[optionIndex]);
        }
      });

      return Array.from(values);
    };

    const getOrderedOptions = () => {
      return activeProduct.options
        .map((name, index) => ({ name, index }))
        .sort((a, b) => {
          if (isColorOption(a.name) && !isColorOption(b.name)) return -1;
          if (!isColorOption(a.name) && isColorOption(b.name)) return 1;
          if (isSizeOption(a.name) && !isSizeOption(b.name)) return 1;
          if (!isSizeOption(a.name) && isSizeOption(b.name)) return -1;
          return a.index - b.index;
        });
    };

    const isVariantAvailableForValue = (optionIndex, value) => {
      const testOptions = [...selectedOptions];
      testOptions[optionIndex] = value;

      return activeProduct.variants.some((variant) => {
        if (!variant.available) return false;

        return variant.options.every((optionValue, index) => {
          const optionName = activeProduct.options[index];

          if (index === optionIndex) return optionValue === value;
          if (isSizeOption(optionName) && !testOptions[index]) return true;
          if (!testOptions[index]) return true;

          return optionValue === testOptions[index];
        });
      });
    };

    const hasMissingRequiredOption = () => {
      if (!activeProduct) return false;

      return activeProduct.options.some((name, index) => {
        return isSizeOption(name) && !selectedOptions[index];
      });
    };

    const findSelectedVariant = () => {
      return activeProduct.variants.find((variant) => {
        return variant.options.every((value, index) => value === selectedOptions[index]);
      });
    };

    const updateVariant = () => {
      if (hasMissingRequiredOption()) {
        selectedVariant = null;

        const partialVariant =
          activeProduct.variants.find((variant) => {
            if (!variant.available) return false;

            return variant.options.every((value, index) => {
              const name = activeProduct.options[index];

              if (isSizeOption(name)) return true;
              if (!selectedOptions[index]) return true;

              return value === selectedOptions[index];
            });
          }) || activeProduct.variants[0];

        if (partialVariant) priceEl.textContent = formatMoney(partialVariant.price);

        addButton.disabled = false;
        addButton.innerHTML = addButtonHTML("ADD TO CART");
        return;
      }

      selectedVariant = findSelectedVariant();

      if (!selectedVariant || !selectedVariant.available) {
        addButton.disabled = true;
        addButton.innerHTML = addButtonHTML("UNAVAILABLE");
        return;
      }

      priceEl.textContent = formatMoney(selectedVariant.price);
      addButton.disabled = false;
      addButton.innerHTML = addButtonHTML("ADD TO CART");
    };

    const getBonusProduct = async () => {
      if (bonusProductCache) return bonusProductCache;

      try {
        const response = await fetch(`/products/${BONUS_PRODUCT_HANDLE}.js`, {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) return null;

        bonusProductCache = await response.json();
        return bonusProductCache;
      } catch {
        return null;
      }
    };

    const getBonusVariant = async () => {
      const product = await getBonusProduct();

      if (!product || !product.variants) return null;

      const variant =
        product.variants.find((item) => {
          const values = item.options.map(cleanText);

          return (
            item.available &&
            values.includes("black") &&
            (values.includes("medium") || values.includes("m"))
          );
        }) ||
        product.variants.find((item) => item.available) ||
        product.variants[0];

      if (!variant) return null;

      return {
        product,
        variant
      };
    };

    const shouldAddBonusProduct = () => {
      if (!selectedVariant || !selectedVariant.options) return false;

      const selectedValues = selectedVariant.options.map(cleanText);

      const hasBlack = selectedValues.includes("black");
      const hasMedium = selectedValues.includes("medium") || selectedValues.includes("m");

      return hasBlack && hasMedium;
    };

    const showCartToast = ({ title, image, quantity, price, bonus }) => {
  if (!toast) return;

  const bonusImage =
    bonus?.product?.featured_image ||
    bonus?.product?.images?.[0] ||
    "";

  toast.innerHTML = `
    <button type="button" class="eg-cart-toast__close" data-eg-cart-toast-close aria-label="Close cart notification">×</button>

    <div class="eg-cart-toast__products">
      <div class="eg-cart-toast__product">
        <img class="eg-cart-toast__image" src="${image || ""}" alt="${title || ""}">
        <div>
          <p class="eg-cart-toast__label">Added to cart</p>
          <h3>${title}</h3>
          <div class="eg-cart-toast__meta">
            <span>Qty: ${quantity || 1}</span>
            <span>${formatMoney(price || 0)}</span>
          </div>
        </div>
      </div>

      ${
        bonus
          ? `
          <div class="eg-cart-toast__product">
            <img class="eg-cart-toast__image" src="${bonusImage}" alt="${bonus.product.title}">
            <div>
              <p class="eg-cart-toast__label">Auto added</p>
              <h3>${bonus.product.title}</h3>
              <div class="eg-cart-toast__meta">
                <span>Qty: 1</span>
                <span>${formatMoney(bonus.variant.price || 0)}</span>
              </div>
            </div>
          </div>
        `
          : ""
      }
    </div>
  `;

  toast.classList.add("is-visible");
  toast.setAttribute("aria-hidden", "false");

  const closeBtn = toast.querySelector("[data-eg-cart-toast-close]");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("is-visible");
      toast.setAttribute("aria-hidden", "true");
    });
  }

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.setAttribute("aria-hidden", "true");
  }, 6000);
};

    const renderOptions = () => {
      optionsEl.innerHTML = "";

      getOrderedOptions().forEach(({ name, index: optionIndex }) => {
        const wrapper = document.createElement("div");
        wrapper.className = "eg-option";

        const label = document.createElement("div");
        label.className = "eg-option__label";
        label.textContent = name;
        wrapper.appendChild(label);

        if (isSizeOption(name)) {
          const dropdown = document.createElement("div");
          dropdown.className = "eg-size-dropdown";

          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "eg-size-dropdown__toggle";

          const text = document.createElement("span");
          text.className = "eg-size-dropdown__text";
          text.textContent = selectedOptions[optionIndex] || "Choose your size";

          const icon = document.createElement("span");
          icon.className = "eg-size-dropdown__icon";
          icon.innerHTML = SIZE_ARROW_SVG;

          toggle.appendChild(text);
          toggle.appendChild(icon);

          const menu = document.createElement("div");
          menu.className = "eg-size-dropdown__menu";

          getOptionValues(activeProduct, optionIndex).forEach((value) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "eg-size-dropdown__item";
            item.textContent = value;

            if (selectedOptions[optionIndex] === value) item.classList.add("is-selected");
            if (!isVariantAvailableForValue(optionIndex, value)) item.disabled = true;

            item.addEventListener("click", () => {
              selectedOptions[optionIndex] = value;

              dropdown.classList.remove("is-open");
              setPopupSizeState(dropdown, false);

              messageEl.textContent = "";
              messageEl.classList.remove("is-error");

              renderOptions();
              updateVariant();
            });

            menu.appendChild(item);
          });

          toggle.addEventListener("click", (event) => {
            event.stopPropagation();

            const willOpen = !dropdown.classList.contains("is-open");

            closeAllSizeDropdowns();

            if (willOpen) {
              dropdown.classList.add("is-open");
              setPopupSizeState(dropdown, true);
            }
          });

          dropdown.appendChild(toggle);
          dropdown.appendChild(menu);
          wrapper.appendChild(dropdown);
        } else {
          const values = getOptionValues(activeProduct, optionIndex);
          const selectedIndex = values.findIndex((value) => value === selectedOptions[optionIndex]);

          const valuesWrapper = document.createElement("div");
          valuesWrapper.className = "eg-option__values";
          valuesWrapper.style.setProperty("--eg-option-count", values.length);
          valuesWrapper.style.setProperty("--eg-selected-index", selectedIndex > -1 ? selectedIndex : 0);

          values.forEach((value) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "eg-option__button";
            button.textContent = value;

            if (selectedOptions[optionIndex] === value) button.classList.add("is-selected");

            button.addEventListener("click", () => {
              const buttons = Array.from(valuesWrapper.querySelectorAll(".eg-option__button"));
              const index = buttons.indexOf(button);

              buttons.forEach((btn) => btn.classList.remove("is-selected"));
              button.classList.add("is-selected");

              valuesWrapper.style.setProperty("--eg-selected-index", index);

              selectedOptions[optionIndex] = value;

              if (isColorOption(name)) {
                resetSizeOptions();
                closeAllSizeDropdowns();
              }

              messageEl.textContent = "";
              messageEl.classList.remove("is-error");

              setTimeout(() => {
                renderOptions();
                updateVariant();
              }, 400);
            });

            valuesWrapper.appendChild(button);
          });

          wrapper.appendChild(valuesWrapper);
        }

        optionsEl.appendChild(wrapper);
      });
    };

    const getProductImage = (product, card) => {
      const cardImage = card.querySelector(".eg-card__image");

      if (cardImage && cardImage.src) return cardImage.src;
      if (product.featured_image) return product.featured_image;
      if (product.images && product.images.length) return product.images[0];

      return "";
    };

    const openPopup = (card) => {
      const productJson = card.querySelector(".eg-product-json");
      if (!productJson) return;

      activeProduct = JSON.parse(productJson.textContent);

      const firstVariant =
        activeProduct.variants.find((variant) => variant.available) ||
        activeProduct.variants[0];

      selectedOptions = firstVariant.options ? [...firstVariant.options] : [];

      resetSizeOptions();

      titleEl.textContent = activeProduct.title;
      priceEl.textContent = formatMoney(firstVariant.price);
      descEl.innerHTML = activeProduct.description || "";
      imageEl.src = getProductImage(activeProduct, card);
      imageEl.alt = activeProduct.title;

      messageEl.textContent = "";
      messageEl.classList.remove("is-error");

      renderOptions();
      updateVariant();

      popup.classList.add("is-open");
      popup.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    };

    const closePopup = () => {
      closeAllSizeDropdowns();
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    };

    const showSizeError = () => {
      messageEl.textContent = "Please choose your size.";
      messageEl.classList.add("is-error");

      const dropdown = grid.querySelector(".eg-size-dropdown");

      if (dropdown) {
        closeAllSizeDropdowns();
        dropdown.classList.add("is-open");
        setPopupSizeState(dropdown, true);
      }
    };

    const refreshCartUI = async () => {
      try {
        const cartResponse = await fetch("/cart.js", {
          method: "GET",
          headers: { Accept: "application/json" }
        });

        if (!cartResponse.ok) return;

        const cart = await cartResponse.json();

        document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true, detail: { cart } }));
        document.dispatchEvent(new CustomEvent("cart:updated", { bubbles: true, detail: { cart } }));
        window.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
      } catch {}
    };

    const addToCart = async () => {
      if (hasMissingRequiredOption()) {
        showSizeError();
        return;
      }

      if (!selectedVariant || !selectedVariant.available) return;

      addButton.disabled = true;
      addButton.innerHTML = addButtonHTML("ADDING...");
      messageEl.textContent = "";
      messageEl.classList.remove("is-error");

      let bonus = null;

      if (shouldAddBonusProduct()) {
        bonus = await getBonusVariant();
      }

      const items = [
        {
          id: Number(selectedVariant.id),
          quantity: 1
        }
      ];

      if (
        bonus &&
        bonus.variant &&
        Number(bonus.variant.id) !== Number(selectedVariant.id)
      ) {
        items.push({
          id: Number(bonus.variant.id),
          quantity: 1
        });
      }

      try {
        const response = await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ items })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.description || "Unable to add item to cart.");
        }

        await refreshCartUI();

        showCartToast({
          title: activeProduct.title,
          image: imageEl.src,
          quantity: 1,
          price: selectedVariant.price,
          bonus
        });

        addButton.innerHTML = addButtonHTML("ADDED");

        messageEl.innerHTML = bonus
          ? `<strong>${activeProduct.title}</strong> added to cart + <strong>${bonus.product.title}</strong> added automatically.`
          : `<strong>${activeProduct.title}</strong> added to cart.`;

        setTimeout(() => {
          updateVariant();
        }, 1200);
      } catch (error) {
        messageEl.textContent = error.message;
        messageEl.classList.add("is-error");
        updateVariant();
      }
    };

    grid.querySelectorAll("[data-eg-open-popup]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".eg-card");
        openPopup(card);
      });
    });

    grid.querySelectorAll("[data-eg-close-popup]").forEach((button) => {
      button.addEventListener("click", closePopup);
    });

    if (toastClose) {
      toastClose.addEventListener("click", () => {
        toast.classList.remove("is-visible");
        toast.setAttribute("aria-hidden", "true");
      });
    }

    addButton.addEventListener("click", addToCart);

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".eg-size-dropdown")) {
        closeAllSizeDropdowns();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllSizeDropdowns();

        if (popup.classList.contains("is-open")) {
          closePopup();
        }
      }
    });
  };

  document.querySelectorAll("[data-eg-grid]").forEach(initGrid);

  document.addEventListener("shopify:section:load", (event) => {
    event.target.querySelectorAll("[data-eg-grid]").forEach(initGrid);
  });
})();