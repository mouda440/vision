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
    const res = await fetch(`${API_BASE}/orders/${index}`, {
        method: 'DELETE'
    });
    return await res.json();
}
