// API utility for backend integration
const API_BASE = 'https://back-end-vision.onrender.com/api';

// Stocks
async function fetchStocks() {
    const res = await fetch(`${API_BASE}/stocks`);
    return await res.json();
}
async function setStocksAPI(stocks) {
    const res = await fetch(`${API_BASE}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stocks)
    });
    return await res.json();
}

// Orders
async function fetchOrders() {
    const res = await fetch(`${API_BASE}/orders`);
    return await res.json();
}
async function addOrderAPI(order) {
    const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    });
    return await res.json();
}
async function deleteOrderAPI(index) {
    const res = await fetch(`${API_BASE}/orders/${index}`, { method: 'DELETE' });
    return await res.json();
}

// Products
async function fetchProducts() {
    const res = await fetch(`${API_BASE}/products`);
    return await res.json();
}
async function saveProductAPI(product) {
    // Save product first
    const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    });
    const result = await res.json();
    
    if (!result.success) {
        return result;
    }

    // If product has stock data, update inventory
    if (product.stock) {
        const inventory = await getInventory();
        
        if (product.type === 'tshirt') {
            if (!inventory.categories) inventory.categories = {};
            if (!inventory.categories.tshirt) {
                inventory.categories.tshirt = { styles: {}, sizes: ["S", "M", "L", "XL"] };
            }
            
            // Handle each style's stock
            if (product.styles && Array.isArray(product.styles)) {
                product.styles.forEach(style => {
                    if (!inventory.categories.tshirt.styles[style.value]) {
                        inventory.categories.tshirt.styles[style.value] = {
                            'S': 0, 'M': 0, 'L': 0, 'XL': 0
                        };
                    }
                    // If stock data exists for this style, update it
                    if (product.stock[style.value]) {
                        inventory.categories.tshirt.styles[style.value] = {
                            ...inventory.categories.tshirt.styles[style.value],
                            ...product.stock[style.value]
                        };
                    }
                });
            }
        }
        else if (product.type === 'jort') {
            if (!inventory.categories) inventory.categories = {};
            if (!inventory.categories.jort) {
                inventory.categories.jort = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0 };
            }
            inventory.categories.jort = { ...inventory.categories.jort, ...product.stock };
        }
        else {
            if (!inventory.products) inventory.products = {};
            inventory.products[result.id] = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, ...product.stock };
        }

        await bulkUpdateInventory(inventory);
    }

    return result;
}
async function deleteProductAPI(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    return await res.json();
}

// New inventory management functions
async function getInventory() {
    const res = await fetch(`${API_BASE}/inventory`);
    return await res.json();
}

async function updateProductStock(productId, stock) {
    const res = await fetch(`${API_BASE}/inventory/product/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock)
    });
    return await res.json();
}

async function checkStock(productId, style = null, size = null) {
    const params = new URLSearchParams({ productId, style, size });
    const res = await fetch(`${API_BASE}/inventory/check?${params}`);
    return await res.json();
}

async function bulkUpdateInventory(inventory) {
    const res = await fetch(`${API_BASE}/inventory/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory)
    });
    return await res.json();
}

// Expose API functions to window for global access
window.fetchStocks = fetchStocks;
window.setStocksAPI = setStocksAPI;
window.fetchOrders = fetchOrders;
window.addOrderAPI = addOrderAPI;
window.deleteOrderAPI = deleteOrderAPI;
window.fetchProducts = fetchProducts;
window.saveProductAPI = saveProductAPI;
window.deleteProductAPI = deleteProductAPI;
window.getInventory = getInventory;
window.updateProductStock = updateProductStock;
window.checkStock = checkStock;
window.bulkUpdateInventory = bulkUpdateInventory;
