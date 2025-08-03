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

    // --- EMPTY CART CHECK ---
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        errorDiv.textContent = 'Your cart is empty. Please add items before checking out.';
        return;
    }
    // --- END EMPTY CART CHECK ---

    // --- IMPROVED STOCK VALIDATION ---
    const stocks = await getStocks();

    // Count quantities in cart
    const cartCount = { tshirt: {}, jort: {} };
    cart.forEach(item => {
        if (item.type === 'tshirt') {
            if (!cartCount.tshirt[item.style]) cartCount.tshirt[item.style] = {};
            if (!cartCount.tshirt[item.style][item.size]) cartCount.tshirt[item.style][item.size] = 0;
            cartCount.tshirt[item.style][item.size]++;
        }
        if (item.type === 'jort') {
            if (!cartCount.jort[item.size]) cartCount.jort[item.size] = 0;
            cartCount.jort[item.size]++;
        }
    });

    // Check if cart quantities exceed stock
    let stockError = false;
    for (const style in cartCount.tshirt) {
        for (const size in cartCount.tshirt[style]) {
            const inCart = cartCount.tshirt[style][size];
            const inStock = stocks.tshirt?.[style]?.[size] ?? 0;
            if (inCart > inStock) stockError = true;
        }
    }
    for (const size in cartCount.jort) {
        const inCart = cartCount.jort[size];
        const inStock = stocks.jort?.[size] ?? 0;
        if (inCart > inStock) stockError = true;
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

    // Save order info
    const order = {
        cart,
        name,
        number,
        email,
        address,
        date: new Date().toISOString()
    };

    // Save to backend
    try {
        await addOrderAPI(order);
    } catch (err) {
        errorDiv.textContent = 'Failed to place order. Please try again.';
        return;
    }

    // Optionally clear cart
    localStorage.removeItem('cart');

    // Show confirmation
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