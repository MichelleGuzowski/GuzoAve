// main.js — slideshow + product fetch + modal + hover swap + cart + forms
(function(){
  const $ = (sel, el=document)=> el.querySelector(sel);
  const $$ = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  // set year
  document.querySelectorAll('[id^="year"]').forEach(n=> n.textContent = new Date().getFullYear());

  // CART - localStorage
  const CART_KEY = 'guzo_cart';
  function loadCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); }
  function addToCart(item){
    const cart = loadCart();
    const existing = cart.find(i => i.id === item.id && i.size === item.size && i.color === item.color);
    if(existing) existing.qty += item.qty;
    else cart.push(item);
    saveCart(cart);
  }
  function updateCartCount(){
    const total = loadCart().reduce((s,i)=> s + i.qty, 0);
    $$('#cartCount, #cartCountShop').forEach(n=>{ if(n) n.textContent = total; });
  }
  updateCartCount();

  // SLIDESHOW (homepage)
  const slides = ()=> Array.from(document.querySelectorAll('.hero-slide'));
  const dotsContainer = document.querySelector('.hero-dots');
  let slideIndex = 0;
  let slideTimer = null;

  function showSlide(i){
    const s = slides();
    if(!s.length) return;
    s.forEach(sl => sl.classList.remove('active'));
    s[i].classList.add('active');
    if(dotsContainer){
      Array.from(dotsContainer.children).forEach((b,idx)=> b.classList.toggle('active', idx===i));
    }
  }
  function nextSlide(){ slideIndex = (slideIndex + 1) % slides().length; showSlide(slideIndex); }
  function startSlideshow(){ 
    if(slideTimer) clearInterval(slideTimer); 
    slideTimer = setInterval(nextSlide, 1000); // FAST
  }
  function createDots(){
    if(!dotsContainer) return;
    slides().forEach((_,i)=>{
      const b = document.createElement('button');
      b.addEventListener('click', ()=> { slideIndex = i; showSlide(i); });
      if(i===0) b.classList.add('active');
      dotsContainer.appendChild(b);
    });
  }

  // FETCH PRODUCTS
  const DATA_URL = 'assets/data/products.json';
  async function fetchProducts(){
    try {
      const res = await fetch(DATA_URL);
      const json = await res.json();
      return json.products || [];
    } catch(e){
      console.error('Could not fetch products', e);
      return [];
    }
  }

  // RENDER FEATURED
  async function renderFeatured(){
    const container = document.getElementById('featuredGrid');
    if(!container) return;
    const products = await fetchProducts();
    const featured = products.slice(0,4);
    container.innerHTML = featured.map(p => productCardHTML(p)).join('');
    attachProductEvents(container);
  }

  function productCardHTML(p){
    const main = p.images[0] || '';
    const alt = p.images[1] || main;
    return `
      <article class="card product" data-id="${p.id}">
        <div style="position:relative">
          <img class="product-image" src="${main}" data-alt="${alt}" alt="${p.title}">
        </div>
        <div class="card-inner">
          <div class="card-title">${p.title}</div>
          <div class="card-meta">${p.category} — $${p.price.toFixed(2)}</div>
          <div style="margin-top:.6rem"><button class="open-product" data-id="${p.id}">View</button></div>
        </div>
      </article>
    `;
  }

  async function renderShopGrid(){
    const grid = document.getElementById('shopGrid');
    if(!grid) return;
    const products = await fetchProducts();
    grid.innerHTML = products.map(p=> productCardHTML(p)).join('');
    attachProductEvents(grid);
    const cats = Array.from(new Set(products.map(p=>p.category)));
    const catSel = document.getElementById('categoryFilter');
    if(catSel){
      cats.forEach(c=>{
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c;
        catSel.appendChild(opt);
      });
    }
  }

  function attachProductEvents(container){
    $$('.product', container).forEach(card=>{
      const img = card.querySelector('.product-image');
      if(img){
        const orig = img.src;
        const alt = img.dataset.alt || orig;
        card.addEventListener('mouseenter', ()=> img.src = alt);
        card.addEventListener('mouseleave', ()=> img.src = orig);
      }
      const btn = card.querySelector('.open-product');
      if(btn) btn.addEventListener('click', ()=> openProductModal(btn.dataset.id));
    });
  }

  // PRODUCT MODAL
  let PRODUCTS_CACHE = null;
  async function openProductModal(id){
    if(!PRODUCTS_CACHE) PRODUCTS_CACHE = await fetchProducts();
    const p = PRODUCTS_CACHE.find(x=> x.id === id);
    if(!p) return;
    const modal = document.getElementById('productModal');
    const body = document.getElementById('modalBody');
    body.innerHTML = `
      <div class="modal-left"><img src="${p.images[0]}" alt="${p.title}" /></div>
      <div class="modal-right">
        <h2>${p.title}</h2>
        <p style="color:var(--muted)">$${p.price.toFixed(2)}</p>
        <p>${p.description}</p>
        <label>Color:
          <select id="selectColor">${p.colors.map(c=>`<option>${c}</option>`).join('')}</select>
        </label>
        <label>Size:
          <select id="selectSize">${p.sizes.map(s=>`<option value="${s}">${s} ${p.stock && p.stock[s] ? `(${p.stock[s]} available)` : '(out)'}</option>`).join('')}</select>
        </label>
        <label>Qty:
          <input id="selectQty" type="number" min="1" value="1" style="width:80px" />
        </label>
        <div style="margin-top:1rem">
          <button id="addToCartBtn">Add to cart</button>
          <button id="buyNowBtn">Buy now</button>
        </div>
      </div>
    `;
    modal.setAttribute('aria-hidden','false'); modal.style.display='flex';
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (ev)=> { if(ev.target === modal) closeModal(); });

    document.getElementById('addToCartBtn').addEventListener('click', ()=>{
      const size = document.getElementById('selectSize').value;
      const color = document.getElementById('selectColor').value;
      const qty = Math.max(1, parseInt(document.getElementById('selectQty').value,10) || 1);
      addToCart({ id:p.id, title:p.title, price:p.price, qty, size, color, img: p.images[0] });
      closeModal();
      alert('Added to cart (demo)');
    });

    document.getElementById('buyNowBtn').addEventListener('click', ()=>{
      const size = document.getElementById('selectSize').value;
      const color = document.getElementById('selectColor').value;
      const qty = Math.max(1, parseInt(document.getElementById('selectQty').value,10) || 1);
      addToCart({ id:p.id, title:p.title, price:p.price, qty, size, color, img: p.images[0] });
      window.location.href = 'checkout.html';
    });
  }

  function closeModal(){ const m = document.getElementById('productModal'); if(m){ m.setAttribute('aria-hidden','true'); m.style.display='none'; } }

  // RENDER CART (checkout page)
  function renderCartPage(){
    const cartElem = document.getElementById('cartList');
    if(!cartElem) return;
    const cart = loadCart();
    if(cart.length === 0){ cartElem.innerHTML = '<p>Your cart is empty.</p>'; document.getElementById('cartSummary').innerHTML=''; return; }
    cartElem.innerHTML = cart.map((it,idx)=>`
      <div class="cart-item" data-idx="${idx}">
        <img src="${it.img}" alt="${it.title}" />
        <div>
          <h4>${it.title}</h4>
          <p>Size: ${it.size} • Color: ${it.color}</p>
          <p>Qty: <input class="cart-qty" data-idx="${idx}" type="number" value="${it.qty}" min="1" style="width:60px" /></p>
          <p>$${(it.price * it.qty).toFixed(2)}</p>
        </div>
        <div class="cart-controls"><button class="remove" data-idx="${idx}">Remove</button></div>
      </div>
    `).join('');
    const total = cart.reduce((s,i)=> s + i.qty * i.price, 0);
    document.getElementById('cartSummary').innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;

    $$('.cart-qty', cartElem).forEach(inp=>{
      inp.addEventListener('change', e=>{
        const idx = parseInt(e.target.dataset.idx,10);
        const c = loadCart();
        c[idx].qty = Math.max(1, parseInt(e.target.value,10) || 1);
        saveCart(c);
        renderCartPage();
      });
    });
    $$('.remove', cartElem).forEach(btn=>{
      btn.addEventListener('click', e=>{
        const idx = parseInt(e.target.dataset.idx,10);
        const c = loadCart();
        c.splice(idx,1);
        saveCart(c);
        renderCartPage();
      });
    });
  }

  // CONTACT / CHECKOUT forms
  function bindForms(){
    const contact = document.getElementById('contactForm');
    if(contact){
      contact.addEventListener('submit', e=>{
        e.preventDefault();
        const name = contact.name.value.trim();
        const email = contact.email.value.trim();
        const message = contact.message.value.trim();
        const fb = document.getElementById('formFeedback');
        const errs = [];
        if(name.length < 2) errs.push('Name must be at least 2 chars.');
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.push('Valid email required.');
        if(message.length < 10) errs.push('Message must be at least 10 chars.');
        if(errs.length){ fb.textContent = errs.join(' '); fb.style.color='crimson'; }
        else { fb.textContent = 'Thanks — message saved locally (demo).'; fb.style.color='green'; contact.reset(); }
      });
    }

    const checkout = document.getElementById('checkoutForm');
    if(checkout){
      checkout.addEventListener('submit', e=>{
        e.preventDefault();
        const name = checkout.name.value.trim();
        const email = checkout.email.value.trim();
        const address = checkout.address.value.trim();
        const fb = document.getElementById('checkoutFeedback');
        const errs = [];
        if(name.length < 2) errs.push('Name required.');
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.push('Valid email required.');
        if(address.length < 5) errs.push('Enter shipping address.');
        if(errs.length){ fb.textContent = errs.join(' '); fb.style.color='crimson'; }
        else { fb.textContent = 'Order placed (demo). Clearing cart...'; fb.style.color='green'; localStorage.removeItem(CART_KEY); updateCartCount(); setTimeout(()=> window.location.href='index.html',700); }
      });
    }
  }

  // LOOKBOOK
  async function renderLookbook(){
    const container = document.getElementById('lookbookGrid');
    if(!container) return;
    const products = await fetchProducts();
    container.innerHTML = products.flatMap(p => p.images.map(img => `<div class="look-card"><img src="${img}" alt="${p.title}"></div>`)).join('');
  }

  // INIT
  document.addEventListener('DOMContentLoaded', async ()=>{
    createDots();
    startSlideshow();

    // pause on hover
    document.querySelectorAll('.hero-slide').forEach(s=> s.addEventListener('mouseenter', ()=> clearInterval(slideTimer)));
    document.querySelectorAll('.hero-slide').forEach(s=> s.addEventListener('mouseleave', ()=> startSlideshow()));

    await renderFeatured();
    await renderShopGrid();
    await renderLookbook();
    renderCartPage();
    bindForms();
    updateCartCount();
  });

})();
