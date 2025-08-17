// Import backend API helpers
// <script src="js/api.js"></script> should be included in HTML before this file

// Example for T-shirt
async function addToCart() {
    // Fetch latest products and stocks
    const products = await fetchProducts();
    const stocks = await getStocks();

    if (document.querySelector('h1')?.textContent.includes('T-shirt')) {
        const color = document.getElementById('color').value;
        const style = document.getElementById('style').value;
        const size = document.getElementById('size').value;
        let img = 'img/front black.jpg';
        if (color === 'red') img = 'img/front red.jpg';

        // Find latest product price for T-shirt
        const tshirtProduct = products.find(p => p.type === 'tshirt');
        const price = tshirtProduct?.price ?? 120;

        // Stock check (support both backend and product stock structure)
        let stock = 0;
        if (stocks.tshirt?.[style]?.[size] !== undefined) {
            stock = stocks.tshirt[style][size];
        } else if (tshirtProduct?.stock?.[size] !== undefined) {
            stock = tshirtProduct.stock[size];
        }
        if (stock <= 0) {
            alert('Out of stock!');
            return;
        }

        const item = {
            name: `T-shirt (${color}, ${style}, Size: ${size})`,
            price: price,
            img: img,
            type: 'tshirt',
            style,
            size
        };
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.push(item);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.location.href = 'cart.html';
    } else if (document.querySelector('h1')?.textContent.includes('Jort')) {
        const size = document.getElementById('size').value;

        // Find latest product price for Jort
        const jortProduct = products.find(p => p.type === 'jort');
        const price = jortProduct?.price ?? 70;

        // Stock check
        let stock = 0;
        if (stocks.jort?.[size] !== undefined) {
            stock = stocks.jort[size];
        } else if (jortProduct?.stock?.[size] !== undefined) {
            stock = jortProduct.stock[size];
        }
        if (stock <= 0) {
            alert('Out of stock!');
            return;
        }

        const item = {
            name: `Jort (Size: ${size})`,
            price: price,
            img: 'img/jort back.jpg',
            type: 'jort',
            size
        };
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.push(item);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.location.href = 'cart.html';
    }
}

function showCheckoutForm() {
    document.getElementById('checkout-form').style.display = 'block';
}

async function getStocks() {
    return await fetchStocks();
}

async function setStocks(stocks) {
    await setStocksAPI(stocks);
}

// Update stocks after checkout
async function updateStocksAfterOrder(cart) {
    // No longer needed, stocks are updated in backend when order is placed
}

window.submitCheckout = submitCheckout;
async function submitCheckout(event) {
    event.preventDefault();
    const name = document.getElementById('buyer-name').value.trim();
    const number = document.getElementById('buyer-number').value.trim();
    const email = document.getElementById('buyer-email').value.trim();
    const address = document.getElementById('buyer-address').value.trim();
    const errorDiv = document.getElementById('checkout-error');
    errorDiv.textContent = '';

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        errorDiv.textContent = 'Your cart is empty. Please add items before checking out.';
        return;
    }

    // --- IMPROVED STOCK VALIDATION FOR ALL PRODUCT TYPES ---
    const stocks = await fetchStocks();
    let products = [];
    try { products = await fetchProducts(); } catch (e) {}

    // Count quantities in cart for all types
    const cartCount = { tshirt: {}, jort: {}, other: {} };
    cart.forEach(item => {
        if (item.type === 'tshirt') {
            if (!cartCount.tshirt[item.style]) cartCount.tshirt[item.style] = {};
            if (!cartCount.tshirt[item.style][item.size]) cartCount.tshirt[item.style][item.size] = 0;
            cartCount.tshirt[item.style][item.size]++;
        } else if (item.type === 'jort') {
            if (!cartCount.jort[item.size]) cartCount.jort[item.size] = 0;
            cartCount.jort[item.size]++;
        } else {
            // For other products, use product id and size
            const prod = products.find(p => p.name === item.name.split(' (')[0]);
            const prodId = prod?.id || item.id || item.productId;
            if (!prodId) return;
            if (!cartCount.other[prodId]) cartCount.other[prodId] = {};
            if (!cartCount.other[prodId][item.size]) cartCount.other[prodId][item.size] = 0;
            cartCount.other[prodId][item.size]++;
        }
    });

    // Validate stock for all types
    let stockError = false;
    // T-shirt
    for (const style in cartCount.tshirt) {
        for (const size in cartCount.tshirt[style]) {
            const inCart = cartCount.tshirt[style][size];
            const inStock = stocks.tshirt?.[style]?.[size] ?? 0;
            if (inCart > inStock) stockError = true;
        }
    }
    // Jort
    for (const size in cartCount.jort) {
        const inCart = cartCount.jort[size];
        const inStock = stocks.jort?.[size] ?? 0;
        if (inCart > inStock) stockError = true;
    }
    // Other products
    for (const prodId in cartCount.other) {
        for (const size in cartCount.other[prodId]) {
            const inCart = cartCount.other[prodId][size];
            const inStock = stocks[prodId]?.[size] ?? 0;
            if (inCart > inStock) stockError = true;
        }
    }
    if (stockError) {
        errorDiv.textContent = 'One or more items in your cart exceed available stock. Please update your cart.';
        return;
    }
    // --- END STOCK VALIDATION ---

    // Validate name
    if (name.length < 2) {
        errorDiv.textContent = 'Please enter your full name.';
        return;
    }

    // Validate phone number (8 digits)
    if (!/^\d{8}$/.test(number)) {
        errorDiv.textContent = 'Phone number must be exactly 8 digits.';
        return;
    }

    // Validate email
    if (!email.includes('@')) {
        errorDiv.textContent = 'Please enter a valid email address.';
        return;
    }

    // Validate address
    if (address.length < 3) {
        errorDiv.textContent = 'Please enter a valid address.';
        return;
    }

    const order = {
        cart,
        name,
        number,
        email,
        address,
        date: new Date().toISOString()
    };

    // --- DECREMENT STOCKS FOR ALL PRODUCT TYPES ---
    // Update stocks locally before sending to backend
    // T-shirt
    for (const style in cartCount.tshirt) {
        for (const size in cartCount.tshirt[style]) {
            stocks.tshirt[style][size] -= cartCount.tshirt[style][size];
            if (stocks.tshirt[style][size] < 0) stocks.tshirt[style][size] = 0;
        }
    }
    // Jort
    for (const size in cartCount.jort) {
        stocks.jort[size] -= cartCount.jort[size];
        if (stocks.jort[size] < 0) stocks.jort[size] = 0;
    }
    // Other products
    for (const prodId in cartCount.other) {
        for (const size in cartCount.other[prodId]) {
            if (!stocks[prodId]) stocks[prodId] = {};
            stocks[prodId][size] = (stocks[prodId][size] ?? 0) - cartCount.other[prodId][size];
            if (stocks[prodId][size] < 0) stocks[prodId][size] = 0;
        }
    }
    await setStocksAPI(stocks);

    // Save order info
    try {
        await addOrderAPI(order);
    } catch (err) {
        errorDiv.textContent = 'Failed to place order. Please try again.';
        return;
    }

    localStorage.removeItem('cart');
    errorDiv.style.color = "#2d89ef";
    errorDiv.textContent = "Order placed successfully!";
    document.getElementById('checkout-form').reset();

    setTimeout(() => {
        document.getElementById('checkout-form').style.display = 'none';
        if (typeof renderCart === 'function') renderCart();
        if (typeof renderOrders === 'function') renderOrders();
    }, 1500);
}

window.renderOrders = renderOrders;
async function renderOrders() {
    const orders = await fetchOrders();
    let totalArticles = 0;
    orders.forEach(order => {
        if (Array.isArray(order.cart)) {
            totalArticles += order.cart.length;
        }
    });
    const ordersList = document.getElementById('orders-list');
    let html = `<div class="orders-total" style="font-weight:700;font-size:1.3em;margin-bottom:18px;color:#e8491d;">Total articles: ${totalArticles}</div>`;
    if (orders.length === 0) {
        html += '<p>No orders yet.</p>';
    } else {
        orders.forEach((order, idx) => {
            html += `<div class="order-card" style="background:#181818;padding:18px 16px;margin-bottom:12px;border-radius:9px;">
                <strong>Order #${idx + 1}</strong> <span style="color:#888;font-size:0.9em;">(${new Date(order.date).toLocaleString()})</span><br>
                <span style="font-weight:500;">${order.name}</span> - ${order.number} - ${order.email}<br>
                <span style="font-size:0.97em;">${order.address}</span><br>
                <strong>Articles:</strong>
                <ul style="margin:6px 0 0 0;padding-left:18px;">
                    ${order.cart.map(item => `<li>${item.name} (${item.price} TND)</li>`).join('')}
                </ul>
                <button onclick="deleteOrder(${idx})" class="button" style="margin-top:8px;">Delete</button>
            </div>`;
        });
    }
    ordersList.innerHTML = html;
}

// Cinematic zoom on product card click (shop page)
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.product-card-clean a, .lookbook-scroll a').forEach(link => {
        link.addEventListener('click', function(e) {
            const card = this.closest('.product-card-clean') || this.closest('.lookbook-scroll > *');
            if (card) {
                card.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1), box-shadow 0.5s';
                card.style.transform = 'scale(1.12) translateY(-12px)';
                card.style.boxShadow = '0 16px 48px #0008';
                setTimeout(() => {
                    window.location.href = this.getAttribute('href');
                }, 320);
                e.preventDefault();
            }
        });
    });
});

// Section title fade-in on scroll
document.addEventListener('DOMContentLoaded', function() {
    const titles = document.querySelectorAll('.section-title-fade');
    function onScroll() {
        titles.forEach(title => {
            const rect = title.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) {
                title.classList.add('visible');
            }
        });
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
});

// Page transition effect
(function() {
    if (!document.getElementById('transition-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'transition-overlay';
        document.body.appendChild(overlay);
    }
    function fadeTo(url) {
        const overlay = document.getElementById('transition-overlay');
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = url; }, 400);
    }
    // Attach to all .header-back-btn and .hero-cart-link a
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.header-back-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const url = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (url) {
                    e.preventDefault();
                    fadeTo(url);
                }
            });
        });
        document.querySelectorAll('.hero-cart-link a').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                fadeTo(this.getAttribute('href'));
            });
        });
        // Also for .cta-btn links
        document.querySelectorAll('a.cta-btn').forEach(a => {
            a.addEventListener('click', function(e) {
                if (this.getAttribute('href')) {
                    e.preventDefault();
                    fadeTo(this.getAttribute('href'));
                }
            });
        });
    });
})();

// Parallax effect for hero background
document.addEventListener('DOMContentLoaded', function() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    hero.classList.add('parallax-bg');
    function parallax(e) {
        const x = (e.clientX || window.innerWidth/2) / window.innerWidth - 0.5;
        const y = (e.clientY || window.innerHeight/2) / window.innerHeight - 0.5;
        const mosaic = hero.querySelector('.header-mosaic-bg');
        const video = hero.querySelector('#hero-video-bg');
        const overlay = hero.querySelector('#hero-bg');
        if (mosaic) mosaic.style.transform = `translate(${x*20}px,${y*10}px)`;
        if (video) video.style.transform = `translate(${x*10}px,${y*5}px) scale(1.02)`;
        if (overlay) overlay.style.transform = `translate(${x*8}px,${y*4}px)`;
    }
    hero.addEventListener('mousemove', parallax);
    hero.addEventListener('touchmove', e => {
        if (e.touches && e.touches[0]) parallax(e.touches[0]);
    });
    // Reset on mouse leave
    hero.addEventListener('mouseleave', () => {
        ['.header-mosaic-bg', '#hero-video-bg', '#hero-bg'].forEach(sel => {
            const el = hero.querySelector(sel);
            if (el) el.style.transform = '';
        });
    });
});

// Cinematic text reveal: add .visible to each span as it animates in
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.cinematic-reveal').forEach(el => {
        const spans = el.querySelectorAll('span');
        spans.forEach((span, i) => {
            setTimeout(() => {
                span.classList.add('visible');
            }, 180 + i * 180);
        });
    });
});

// Animate product cards on scroll (for shop/lookbook)
document.addEventListener('DOMContentLoaded', function() {
    function animateCards() {
        document.querySelectorAll('.product-card, .product-card-clean, .lookbook-scroll > *').forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) {
                card.style.animationPlayState = 'running';
            }
        });
    }
    window.addEventListener('scroll', animateCards);
    animateCards();
});

// Fade-in effect for sections on scroll
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('section');
    sections.forEach(sec => sec.classList.add('section-fade'));
    function onScroll() {
        sections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) {
                sec.classList.add('visible');
            }
        });
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
});