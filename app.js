/* ============================================================
   FastBite — app.js
   All application logic: DB, Auth, Admin, Customer, Utilities
   ============================================================ */

const DEFAULT_CURRENCY = 'PKR|₨|Pakistani Rupee';
const MAX_ITEM_QUANTITY = 2000;
const BRAND_LOGO_PATH = 'logo.jpeg';

function emptyOrderHistoryReport() {
  return {
    generatedAt: null,
    timezone: '',
    businessDayCutoffHour: 4,
    currentBusinessDay: null,
    daily: [],
    weekly: [],
    monthly: []
  };
}

const state = {
  session: null,
  items: [],
  orders: [],
  feedback: [],
  coupons: [],
  admins: [],
  cashiers: [],
  customers: [],
  customerSummaries: [],
  orderHistory: emptyOrderHistoryReport(),
  cart: { items: [], subtotal: 0, discount: 0, delivery: 0, tax: 0, total: 0, couponCode: null },
  currency: DEFAULT_CURRENCY,
  taxRate: 0.00
};

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? `http://${window.location.hostname}:8080` : (window.location.protocol === 'file:' ? 'http://localhost:8080' : '');
const APP_ASSET_BASE = API_BASE || (window.location.origin && window.location.origin !== 'null' ? window.location.origin : '');

const API = {
  async request(url, options = {}) {
    const fullUrl = url.startsWith('/') ? API_BASE + url : url;
    const config = { method: 'GET', credentials: 'include', ...options };
    const headers = { ...(options.headers || {}) };
    if (!(config.body instanceof FormData) && config.body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (Object.keys(headers).length) config.headers = headers;

    const resp = await fetch(fullUrl, config);
    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text();
    if (!resp.ok) {
      throw new Error(data?.message || `Request failed (${resp.status})`);
    }
    return data;
  },
  get(url) { return this.request(url); },
  post(url, body, extra = {}) {
    return this.request(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...extra });
  },
  put(url, body, extra = {}) {
    return this.request(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...extra });
  },
  patch(url, body, extra = {}) {
    return this.request(url, { method: 'PATCH', body: JSON.stringify(body), ...extra });
  },
  delete(url, extra = {}) {
    return this.request(url, { method: 'DELETE', ...extra });
  }
};

function emptyCart() {
  return { items: [], subtotal: 0, discount: 0, delivery: 0, tax: 0, total: 0, couponCode: null };
}

function normalizeItem(item) {
  return { ...item, image: item.imageUrl || null };
}

function normalizeOrderHistory(report) {
  return {
    generatedAt: report?.generatedAt || null,
    timezone: report?.timezone || '',
    businessDayCutoffHour: report?.businessDayCutoffHour ?? 4,
    currentBusinessDay: report?.currentBusinessDay || null,
    daily: report?.daily || [],
    weekly: report?.weekly || [],
    monthly: report?.monthly || []
  };
}

function applyCouponSelections() {
  custCoupon = state.coupons.find(c => c.code === state.cart.couponCode) || null;
}

function syncCustomerCart(cart) {
  state.cart = cart || emptyCart();
  applyCouponSelections();
}

function refreshCustomerCartViews() {
  updateCartBadge();
  if (document.getElementById('csec-cart')?.classList.contains('active')) renderCart();
  if (document.getElementById('csec-checkout')?.classList.contains('active')) renderCheckout();
}

function resolveAppAssetUrl(path) {
  const cleanPath = (path || '').replace(/^\/+/, '');
  if (!cleanPath) return '';
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  return APP_ASSET_BASE ? `${APP_ASSET_BASE}/${cleanPath}` : cleanPath;
}

const DB = {
  getUsers: () => [...state.admins, ...state.cashiers, ...state.customers],
  saveUsers: (d) => {
    state.customers = d.filter(u => u.role === 'customer');
    state.admins = d.filter(u => u.role === 'admin');
    state.cashiers = d.filter(u => u.role === 'cashier');
  },
  getItems: () => state.items,
  saveItems: (d) => { state.items = d; },
  getOrders: () => state.orders,
  saveOrders: (d) => { state.orders = d; },
  getOrderHistory: () => state.orderHistory,
  saveOrderHistory: (d) => { state.orderHistory = normalizeOrderHistory(d); },
  getFeedback: () => state.feedback,
  saveFeedback: (d) => { state.feedback = d; },
  getCoupons: () => state.coupons,
  saveCoupons: (d) => { state.coupons = d; },
  getCart: () => state.cart.items || [],
  saveCart: (d) => { state.cart = { ...state.cart, items: d }; },
  clearCart: () => { state.cart = emptyCart(); custCoupon = null; },
  getSession: () => state.session,
  setSession: (u) => { state.session = u; },
  clearSession: () => { state.session = null; },
  getCurrency: () => state.currency || DEFAULT_CURRENCY,
  saveCurrency: (v) => { state.currency = v; },
  getTaxRate: () => state.taxRate,
  saveTaxRate: (v) => { state.taxRate = parseFloat(v) || 0; },

  reset() {
    state.session = null;
    state.items = [];
    state.orders = [];
    state.feedback = [];
    state.coupons = [];
    state.admins = [];
    state.cashiers = [];
    state.customers = [];
    state.customerSummaries = [];
    state.orderHistory = emptyOrderHistoryReport();
    state.cart = emptyCart();
    state.currency = DEFAULT_CURRENCY;
    state.taxRate = 0;
    custCoupon = null;
  },

  async init() {
    try {
      state.session = await API.get('/api/auth/me');
      await this.refreshForSession();
    } catch {
      this.reset();
    }
  },

  async refreshForSession() {
    if (!state.session) return;
    if (state.session.role === 'admin') await this.refreshAdmin();
    else if (state.session.role === 'cashier') await this.refreshCashier();
    else await this.refreshCustomer();
  },

  async refreshAdmin() {
    const data = await API.get('/api/admin/bootstrap');
    state.session = data.session;
    state.items = (data.items || []).map(normalizeItem);
    state.orders = data.orders || [];
    state.feedback = data.feedback || [];
    state.customerSummaries = data.customers || [];
    state.customers = state.customerSummaries.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: 'customer',
      createdAt: c.createdAt,
      restaurantDiscountType: c.restaurantDiscountType,
      restaurantDiscountValue: c.restaurantDiscountValue
    }));
    state.admins = data.admins || [];
    state.cashiers = data.cashiers || [];
    state.coupons = data.coupons || [];
    state.currency = data.currency || DEFAULT_CURRENCY;
    state.taxRate = data.taxRate || 0;
    state.orderHistory = normalizeOrderHistory(data.orderHistory);
  },

  async refreshCustomer() {
    const data = await API.get('/api/customer/bootstrap');
    state.session = data.session;
    state.items = (data.items || []).map(normalizeItem);
    state.orders = data.orders || [];
    state.feedback = data.feedback || [];
    state.coupons = data.coupons || [];
    state.cart = data.cart || emptyCart();
    state.orderHistory = emptyOrderHistoryReport();
    state.currency = data.currency || DEFAULT_CURRENCY;
    state.taxRate = data.taxRate || 0;
    applyCouponSelections();
  },

  async refreshCashier() {
    const data = await API.get('/api/cashier/bootstrap');
    state.session = data.session;
    state.items = (data.items || []).map(normalizeItem);
    state.orders = data.orders || [];
    state.customers = data.customers || [];
    state.coupons = data.coupons || [];
    state.orderHistory = emptyOrderHistoryReport();
    state.currency = data.currency || DEFAULT_CURRENCY;
    state.taxRate = data.taxRate || 0;
  }
};

// ===== UTILITIES =====
function uid() { return '_' + Math.random().toString(36).substr(2, 9); }
function now() { return new Date().toISOString(); }
function fmtDate(iso) { return new Date(iso).toLocaleString(); }
function fmtPrice(n) {
  const sym = DB.getCurrency().split('|')[1] || '$';
  return sym + parseFloat(n).toFixed(2);
}
function isSuperAdmin() { const s = DB.getSession(); return !!(s && s.isSuperAdmin); }
function effectiveMenuPrice(item) {
  return Math.max(0, parseFloat(item?.price || 0) - parseFloat(item?.discount || 0));
}
function formatTaxLabel(rate = state.taxRate || 0) {
  return `Tax (${(parseFloat(rate || 0) * 100).toFixed(2)}%)`;
}
function formatHistoryWindow(start, end) {
  if (!start || !end) return '';
  return `${fmtDate(start)} - ${fmtDate(end)}`;
}
function formatCustomerDiscount(type, value) {
  const amount = parseFloat(value || 0);
  if (!type || amount <= 0) return '';
  return type === 'percentage' ? `${amount}% customer discount` : `${fmtPrice(amount)} customer discount`;
}
function discountLineLabel(code) {
  return code ? `Discount (${code})` : 'Restaurant Discount';
}
function findCustomerByName(name) {
  const normalized = (name || '').trim().toLowerCase();
  if (!normalized) return null;
  return DB.getUsers().find(u => u.role === 'customer' && (u.name || '').trim().toLowerCase() === normalized) || null;
}
function calculateDirectDiscount(type, value, subtotal) {
  const amount = parseFloat(value || 0);
  if (!type || amount <= 0 || subtotal <= 0) return 0;
  if (type === 'percentage') return subtotal * (amount / 100);
  return Math.min(subtotal, amount);
}

function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-times-circle', info: 'fas fa-bolt' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="${icons[type]}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('fadeOut'); setTimeout(() => t.remove(), 300); }, 3000);
}

function showModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  adminOrderEditState = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
  else { inp.type = 'password'; btn.innerHTML = '<i class="fas fa-eye"></i>'; }
}

function showPage(id) {
  ['page-auth', 'page-admin', 'page-customer', 'page-cashier'].forEach(p => {
    const el = document.getElementById(p);
    el.classList.toggle('hidden', p !== id);
    el.classList.toggle('active', p === id);
  });
}

// ===== AUTH =====
let currentRating = 0;

function showLogin() {
  document.getElementById('form-login').classList.remove('hidden');
  document.getElementById('form-signup').classList.add('hidden');
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
}

function showSignup() {
  document.getElementById('form-signup').classList.remove('hidden');
  document.getElementById('form-login').classList.add('hidden');
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
}

async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  try {
    const user = await API.post('/api/auth/login', { email, password: pass });
    DB.setSession(user);
    await DB.refreshForSession();
    toast(`Welcome back, ${user.name}!`, 'success');
    if (user.role === 'admin') await loadAdmin(false);
    else if (user.role === 'cashier') await loadCashier(false);
    else await loadCustomer(false);
  } catch (err) {
    toast(err.message || 'Invalid email or password', 'error');
  }
}

async function doSignup(e) {
  e.preventDefault();
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-pass').value;
  const confirm = document.getElementById('su-confirm').value;
  if (pass !== confirm) { toast('Passwords do not match', 'error'); return; }
  try {
    const user = await API.post('/api/auth/signup', { name, email, password: pass, confirmPassword: confirm });
    DB.setSession(user);
    await DB.refreshCustomer();
    toast(`Account created! Welcome, ${name}!`, 'success');
    await loadCustomer(false);
  } catch (err) {
    toast(err.message || 'Unable to create account', 'error');
  }
}

async function doLogout() {
  try { await API.post('/api/auth/logout', {}); } catch { }
  DB.reset();
  showPage('page-auth');
  showLogin();
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  toast('Logged out successfully', 'info');
}

// ===== ADMIN =====
async function loadAdmin(refresh = true) {
  if (refresh) await DB.refreshAdmin();
  const user = DB.getSession();
  document.getElementById('admin-name').textContent = user.name;
  document.getElementById('admin-avatar').textContent = user.name[0].toUpperCase();

  if (isSuperAdmin()) {
    document.getElementById('nav-coupons').style.display = 'block';
  } else {
    document.getElementById('nav-coupons').style.display = 'none';
  }

  showPage('page-admin');
  adminNav('dashboard');
}

function adminNav(sec) {
  ['dashboard', 'menu', 'orders', 'customers', 'feedback', 'coupons', 'settings'].forEach(s => {
    document.getElementById('sec-' + s).classList.toggle('active', s === sec);
    document.getElementById('sec-' + s).classList.toggle('hidden', s !== sec);
    document.getElementById('nav-' + s).classList.toggle('active', s === sec);
  });
  if (sec === 'dashboard') renderDashboard();
  if (sec === 'menu') renderAdminMenu();
  if (sec === 'orders') renderOrders();
  if (sec === 'customers') renderCustomers();
  if (sec === 'feedback') renderAdminFeedback();
  if (sec === 'coupons') renderAdminCoupons();
  if (sec === 'settings') renderSettings();
}

function renderDashboard() {
  const orders = DB.getOrders();
  const items = DB.getItems();
  const users = DB.getUsers();
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const customers = users.filter(u => u.role === 'customer').length;

  // Stats
  const sg = document.getElementById('stats-grid');
  sg.innerHTML = `
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-shopping-bag"></i></div><div class="stat-label">Total Orders</div><div class="stat-value">${orders.length}</div><div class="stat-sub">All time</div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div><div class="stat-label">Total Revenue</div><div class="stat-value">${fmtPrice(revenue)}</div><div class="stat-sub">All time</div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-utensils"></i></div><div class="stat-label">Menu Items</div><div class="stat-value">${items.length}</div><div class="stat-sub">${items.filter(i => i.available).length} available</div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Customers</div><div class="stat-value">${customers}</div><div class="stat-sub">Registered</div></div>
  `;

  // Recent orders
  const ro = document.getElementById('recent-orders');
  if (!orders.length) { ro.innerHTML = '<div style="color:var(--text3);font-size:.85rem;padding:10px 0">No orders yet.</div>'; }
  else {
    ro.innerHTML = [...orders].reverse().slice(0, 6).map(o => `
      <div class="dash-row">
        <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
        <span>${o.customerName}</span>
        <span style="color:var(--yellow);font-weight:700">${fmtPrice(o.total)}</span>
        <span class="badge badge-${o.status}">${o.status}</span>
      </div>`).join('');
  }

  // Top items
  const counts = {};
  orders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.qty; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ti = document.getElementById('top-items');
  if (!sorted.length) { ti.innerHTML = '<div style="color:var(--text3);font-size:.85rem;padding:10px 0">No sales yet.</div>'; }
  else {
    ti.innerHTML = sorted.map(([name, cnt]) => {
      const it = items.find(i => i.name === name);
      return `<div class="top-row"><span class="top-icon">${it ? it.icon : '🍽️'}</span><span class="top-name">${name}</span><span class="top-count">${cnt} sold</span></div>`;
    }).join('');
  }
}

function renderAdminMenu() {
  const q = (document.getElementById('menu-search')?.value || '').toLowerCase();
  const cat = document.getElementById('menu-cat-filter')?.value || '';
  let items = DB.getItems().filter(i =>
    (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) &&
    (!cat || i.category === cat)
  );
  const grid = document.getElementById('admin-menu-grid');
  if (!items.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-utensils"></i><p>No items found.</p></div>'; return; }
  grid.innerHTML = items.map(i => `
    <div class="menu-card">
      <div class="mc-thumb">${i.image ? `<img src="${i.image}" alt="${i.name}">` : `<span class="mc-icon-emoji">${i.icon}</span>`}</div>
      <div class="mc-name">${i.name}</div>
      <div class="mc-cat">${i.category}</div>
      <div class="mc-desc">${i.description}</div>
      <div class="mc-price">${fmtPrice(i.price)}</div>
      <div class="mc-footer">
        <span class="mc-avail badge ${i.available ? 'badge-available' : 'badge-unavailable'}">${i.available ? 'Available' : 'Unavailable'}</span>
        <div style="display:flex;gap:6px">
          <button class="btn-icon" onclick="showEditItem('${i.id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="deleteItem('${i.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function itemFormHtml(item) {
  const cats = ['Burgers', 'Pizzas', 'Sides', 'Desserts', 'Drinks', 'Tuk Shop'];
  return `
    <div class="form-group"><label>Item Name</label><div class="inp-wrap"><i class="fas fa-tag"></i><input type="text" id="it-name" value="${item?.name || ''}" placeholder="e.g. Spicy Burger" required></div></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><div class="inp-wrap"><i class="fas fa-layer-group"></i><select id="it-cat">${cats.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
      <div class="form-group"><label>Price ($)</label><div class="inp-wrap"><i class="fas fa-dollar-sign"></i><input type="number" id="it-price" value="${item?.price || ''}" placeholder="9.99" step="0.01" min="0" required></div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Discount ($) <span style="color:var(--text3);font-weight:400;font-size:.8rem">Admin-controlled, leave 0 for none</span></label><div class="inp-wrap"><i class="fas fa-tag"></i><input type="number" id="it-discount" value="${item?.discount || '0'}" placeholder="0.00" step="0.01" min="0"></div></div>
    </div>
    <div class="form-group"><label>Description</label><textarea id="it-desc" rows="2" placeholder="Brief description...">${item?.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Icon (emoji fallback)</label><div class="inp-wrap"><i class="fas fa-smile"></i><input type="text" id="it-icon" value="${item?.icon || '🍔'}" placeholder="🍔" maxlength="4"></div></div>
      <div class="form-group"><label>Availability</label><div class="inp-wrap"><i class="fas fa-toggle-on"></i><select id="it-avail"><option value="true" ${item?.available !== false ? 'selected' : ''}>Available</option><option value="false" ${item?.available === false ? 'selected' : ''}>Unavailable</option></select></div></div>
    </div>
    <div class="form-group">
      <label>Food Photo <span style="color:var(--text3);font-weight:400;text-transform:none">(optional — replaces emoji)</span></label>
      <div class="img-upload-wrap" onclick="document.getElementById('it-img-input').click()">
        <div class="img-upload-preview" id="it-img-preview">
          ${item?.image ? `<img src="${item.image}" alt="preview">` : `<div class="img-upload-placeholder"><i class="fas fa-camera"></i><span>Click to upload photo</span></div>`}
        </div>
        <input type="file" id="it-img-input" accept="image/*" style="display:none" onchange="previewItemImage(this)">
      </div>
      ${item?.image ? `<button type="button" class="btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="clearItemImage()"><i class="fas fa-times"></i> Remove Photo</button>` : ''}
    </div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveItem(${item ? `'${item.id}'` : null})"><i class="fas fa-save"></i> Save Item</button>
  `;
}

function previewItemImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('it-img-preview');
    preview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    preview.dataset.b64 = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function clearItemImage() {
  const preview = document.getElementById('it-img-preview');
  preview.innerHTML = '<div class="img-upload-placeholder"><i class="fas fa-camera"></i><span>Click to upload photo</span></div>';
  delete preview.dataset.b64;
  const inp = document.getElementById('it-img-input');
  if (inp) inp.value = '';
}

function showAddItem() { showModal('Add Menu Item', itemFormHtml(null)); }
function showEditItem(id) {
  const item = DB.getItems().find(i => i.id === id);
  if (item) showModal('Edit Menu Item', itemFormHtml(item));
}

async function saveItem(id) {
  const name = document.getElementById('it-name').value.trim();
  const cat = document.getElementById('it-cat').value;
  const price = parseFloat(document.getElementById('it-price').value);
  const desc = document.getElementById('it-desc').value.trim();
  const icon = document.getElementById('it-icon').value.trim() || '🍽️';
  const avail = document.getElementById('it-avail').value === 'true';
  if (!name || isNaN(price) || price < 0) { toast('Please fill all fields correctly', 'error'); return; }
  try {
    const form = new FormData();
    form.append('name', name);
    form.append('category', cat);
    form.append('price', price);
    const discount = parseFloat(document.getElementById('it-discount')?.value || '0') || 0;
    form.append('discount', discount);
    form.append('description', desc);
    form.append('icon', icon);
    form.append('available', String(avail));
    const fileInput = document.getElementById('it-img-input');
    if (fileInput?.files?.[0]) form.append('image', fileInput.files[0]);
    if (fileInput && !fileInput.value && !document.querySelector('#it-img-preview img')) form.append('removeImage', 'true');
    if (id) await API.put(`/api/menu-items/${id}`, form);
    else await API.post('/api/menu-items', form);
    await DB.refreshAdmin();
    closeModal();
    toast(id ? 'Item updated!' : 'Item added!', 'success');
    renderAdminMenu();
  } catch (err) {
    toast(err.message || 'Unable to save item', 'error');
  }
}

async function deleteItem(id) {
  if (!confirm('Delete this menu item?')) return;
  try {
    await API.delete(`/api/menu-items/${id}`);
    await DB.refreshAdmin();
    toast('Item deleted', 'info');
    renderAdminMenu();
  } catch (err) {
    toast(err.message || 'Unable to delete item', 'error');
  }
}

function renderOrders() {
  const filter = document.getElementById('order-filter')?.value || '';
  let orders = DB.getOrders();
  if (filter) orders = orders.filter(o => o.status === filter);
  orders = [...orders].reverse();
  const tbody = document.getElementById('orders-tbody');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px"></i>No orders found</td></tr>`;
    renderOrderHistoryReport();
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td class="order-id">#${o.id.slice(-6).toUpperCase()}</td>
      <td>${o.customerName}</td>
      <td class="order-items-cell">${o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
      <td style="color:var(--yellow);font-weight:800">${fmtPrice(o.total)}</td>
      <td><i class="fas fa-${o.paymentMethod === 'Cash' ? 'money-bill-wave' : 'credit-card'}" style="color:var(--text3)"></i> ${o.paymentMethod}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td style="color:var(--text3);font-size:.78rem">${fmtDate(o.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <label style="font-size:.8rem;cursor:pointer;" title="Mark Paid">
            <input type="checkbox" ${o.paid ? 'checked' : ''} onchange="adminUpdatePaidStatus('${o.id}', this.checked)"> Paid
          </label>
        </div>
        <select class="filter-select" style="font-size:.78rem;padding:6px 10px;margin-top:4px" onchange="updateOrderStatus('${o.id}',this.value)">
          <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
          <option value="Ready"     ${o.status === 'Ready' ? 'selected' : ''}    >Ready</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
        <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
          ${o.status !== 'Delivered' && o.status !== 'Cancelled' ? `<button class="btn-icon" onclick="showAdminEditOrder('${o.id}')" title="Edit Order"><i class="fas fa-pen"></i></button>` : ''}
          <button class="btn-icon" onclick="showReceipt('${o.id}')" title="View Receipt"><i class="fas fa-file-invoice-dollar"></i></button>
        </div>
      </td>
    </tr>`).join('');
  renderOrderHistoryReport();
}

function renderOrderHistoryReport() {
  const container = document.getElementById('order-history-report');
  if (!container) return;

  const report = DB.getOrderHistory() || emptyOrderHistoryReport();
  const cutoff = report.businessDayCutoffHour ?? 4;
  const current = report.currentBusinessDay;
  const sections = [
    renderHistorySection('Daily Rollup', `Completed business days since the last week. Each day runs from ${cutoff}:00 AM to ${cutoff}:00 AM.`, report.daily),
    renderHistorySection('Weekly Rollup', 'Older days are automatically bundled week by week once they are more than 7 business days old.', report.weekly),
    renderHistorySection('Monthly Rollup', 'After about a month, history is grouped into previous months for reporting.', report.monthly)
  ].join('');

  container.innerHTML = `
    <div class="history-report-shell">
      <div class="history-current-card">
        <div>
          <div class="history-eyebrow">Current window</div>
          <h3>${current?.label || 'Current Business Day'}</h3>
          <p>Business day reset: ${cutoff}:00 AM${report.timezone ? ` (${report.timezone})` : ''}</p>
        </div>
        <div class="history-stat-grid">
          ${renderHistoryStat('Orders', current?.orderCount ?? 0)}
          ${renderHistoryStat('Sales', fmtPrice(current?.salesTotal ?? 0))}
          ${renderHistoryStat('Paid', current?.paidOrderCount ?? 0)}
          ${renderHistoryStat('Delivered', current?.deliveredOrderCount ?? 0)}
        </div>
      </div>
      ${sections}
    </div>
  `;
}

function renderHistorySection(title, description, buckets = []) {
  return `
    <section class="history-section">
      <div class="history-section-head">
        <div>
          <h3>${title}</h3>
          <p>${description}</p>
        </div>
      </div>
      ${buckets.length ? buckets.map(renderHistoryBucket).join('') : '<div class="history-empty">No archived order groups yet for this range.</div>'}
    </section>
  `;
}

function renderHistoryBucket(bucket) {
  return `
    <details class="history-bucket-card">
      <summary>
        <div>
          <div class="history-bucket-title">${bucket.label}</div>
          <div class="history-bucket-meta">${formatHistoryWindow(bucket.periodStart, bucket.periodEnd)}</div>
        </div>
        <div class="history-bucket-summary">
          <span>${bucket.orderCount} orders</span>
          <strong>${fmtPrice(bucket.salesTotal)}</strong>
        </div>
      </summary>
      <div class="history-stat-grid">
        ${renderHistoryStat('Orders', bucket.orderCount)}
        ${renderHistoryStat('Sales', fmtPrice(bucket.salesTotal))}
        ${renderHistoryStat('Paid', bucket.paidOrderCount)}
        ${renderHistoryStat('Delivered', bucket.deliveredOrderCount)}
        ${renderHistoryStat('Cancelled', bucket.cancelledOrderCount)}
      </div>
      <div class="history-order-list">
        ${bucket.orders.map(o => `
          <div class="history-order-row">
            <div>
              <div class="history-order-ref">#${o.id.slice(-6).toUpperCase()} · ${o.customerName || 'Walk-in Customer'}</div>
              <div class="history-order-meta">${fmtDate(o.createdAt)} · ${o.status} · ${o.paymentMethod}</div>
            </div>
            <div class="history-order-actions">
              <strong>${fmtPrice(o.total)}</strong>
              <button class="btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fas fa-receipt"></i> Receipt</button>
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

function renderHistoryStat(label, value) {
  return `
    <div class="history-stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

async function updateOrderStatus(id, status) {
  try {
    await API.put(`/api/admin/orders/${id}/status`, { status });
    await DB.refreshAdmin();
    toast(`Order status updated to ${status}`, 'success');
    renderOrders();
  } catch (err) {
    toast(err.message || 'Unable to update order', 'error');
  }
}

function cancelOrder(id) {
  const orders = DB.getOrders();
  const order = orders.find(o => o.id === id);
  if (!order) return;
  if (order.status !== 'Preparing') { toast('Only Preparing orders can be cancelled', 'error'); return; }
  showModal('Cancel Order', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
      <p style="font-size:1rem;margin-bottom:8px;font-weight:600">Are you sure you want to cancel this order?</p>
      <p style="color:var(--text2);font-size:.88rem;margin-bottom:28px">Order <strong style="color:var(--yellow)">#${id.slice(-6).toUpperCase()}</strong> will be marked as Cancelled.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:160px" onclick="confirmCancelOrder('${id}')">
          <i class="fas fa-times-circle"></i> Yes, Cancel Order
        </button>
        <button class="btn-outline" style="min-width:120px" onclick="closeModal()">
          <i class="fas fa-arrow-left"></i> No, Keep It
        </button>
      </div>
    </div>
  `);
}

async function confirmCancelOrder(id) {
  try {
    await API.post(`/api/customer/orders/${id}/cancel`, {});
    await DB.refreshCustomer();
    closeModal();
    toast('Order cancelled successfully', 'info');
    renderCustOrders();
  } catch (err) {
    toast(err.message || 'Unable to cancel order', 'error');
  }
}

let adminOrderEditState = null;

function showAdminEditOrder(orderId) {
  const order = DB.getOrders().find(o => o.id === orderId);
  if (!order) return;
  if (order.status === 'Delivered' || order.status === 'Cancelled') {
    toast('Only active orders can be edited', 'error');
    return;
  }
  adminOrderEditState = {
    id: order.id,
    customerName: order.customerName || 'Walk-in Customer',
    paymentMethod: order.paymentMethod || 'Cash',
    couponCode: order.couponCode || '',
    items: order.items.map(item => {
      const menuItem = DB.getItems().find(entry => entry.id === item.id) || {};
      return {
        ...menuItem,
        id: item.id,
        name: item.name,
        icon: item.icon || menuItem.icon || '🍽️',
        category: item.category || menuItem.category || '',
        qty: item.qty
      };
    })
  };
  showModal(`Edit Order #${order.id.slice(-6).toUpperCase()}`, adminOrderEditorHtml());
}

function adminOrderEditorHtml() {
  if (!adminOrderEditState) return '';
  const items = adminOrderEditState.items;
  const menuItems = DB.getItems().filter(item => item.available);
  const couponCode = adminOrderEditState.couponCode || '';
  return `
    <div style="display:grid;gap:18px">
      <div style="padding:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg3)">
        <div style="font-weight:700;margin-bottom:6px">${adminOrderEditState.customerName}</div>
        <div style="color:var(--text3);font-size:.82rem">Adjust items, coupon, and payment method for this order.</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Payment Method</label>
          <div class="inp-wrap"><i class="fas fa-credit-card"></i>
            <select id="admin-order-payment">
              <option value="Cash" ${adminOrderEditState.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
              <option value="Card" ${adminOrderEditState.paymentMethod === 'Card' ? 'selected' : ''}>Card</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Coupon Code</label>
          <div class="inp-wrap"><i class="fas fa-tag"></i>
            <input type="text" id="admin-order-coupon" value="${couponCode}" placeholder="Optional coupon" style="text-transform:uppercase">
          </div>
        </div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:10px">Current Items</div>
        ${items.length ? items.map(item => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-weight:600">${item.icon} ${item.name}</div>
              <div style="font-size:.78rem;color:var(--text3)">${item.category}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <button class="btn-icon" onclick="adminEditOrderQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
              <span style="min-width:36px;text-align:center">${item.qty}</span>
              <button class="btn-icon" onclick="adminEditOrderQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
            </div>
          </div>
        `).join('') : '<div style="color:var(--text3);font-size:.85rem">No items selected yet.</div>'}
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:10px">Add More Items</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
          ${menuItems.map(item => `
            <button class="btn-outline" style="justify-content:flex-start;text-align:left;padding:12px" onclick="adminEditOrderAddItem('${item.id}')">
              <span style="display:block;font-weight:700">${item.icon || '🍽️'} ${item.name}</span>
              <span style="display:block;font-size:.78rem;color:var(--text3);margin-top:4px">${fmtPrice(effectiveMenuPrice(item))}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <button class="btn-primary btn-full" onclick="saveAdminEditedOrder()"><i class="fas fa-save"></i> Update Order</button>
    </div>
  `;
}

function rerenderAdminOrderEditor() {
  if (!adminOrderEditState) return;
  const payment = document.getElementById('admin-order-payment')?.value;
  const couponCode = document.getElementById('admin-order-coupon')?.value;
  if (payment) adminOrderEditState.paymentMethod = payment;
  if (couponCode !== undefined) adminOrderEditState.couponCode = couponCode;
  document.getElementById('modal-body').innerHTML = adminOrderEditorHtml();
}

function adminEditOrderAddItem(itemId) {
  const menuItem = DB.getItems().find(item => item.id === itemId);
  if (!menuItem || !adminOrderEditState) return;
  const existing = adminOrderEditState.items.find(item => item.id === itemId);
  if (existing) {
    if (existing.qty >= MAX_ITEM_QUANTITY) {
      toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
      return;
    }
    existing.qty += 1;
  } else {
    adminOrderEditState.items.push({ ...menuItem, qty: 1 });
  }
  rerenderAdminOrderEditor();
}

function adminEditOrderQty(itemId, delta) {
  if (!adminOrderEditState) return;
  const index = adminOrderEditState.items.findIndex(item => item.id === itemId);
  if (index === -1) return;
  const nextQty = adminOrderEditState.items[index].qty + delta;
  if (nextQty > MAX_ITEM_QUANTITY) {
    toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
    return;
  }
  if (nextQty <= 0) adminOrderEditState.items.splice(index, 1);
  else adminOrderEditState.items[index].qty = nextQty;
  rerenderAdminOrderEditor();
}

async function saveAdminEditedOrder() {
  if (!adminOrderEditState || !adminOrderEditState.items.length) {
    toast('Add at least one item to the order', 'error');
    return;
  }
  const paymentMethod = document.getElementById('admin-order-payment').value;
  const couponCode = document.getElementById('admin-order-coupon').value.trim().toUpperCase() || null;
  try {
    await API.put(`/api/admin/orders/${adminOrderEditState.id}`, {
      customerName: adminOrderEditState.customerName,
      couponCode,
      paymentMethod,
      items: adminOrderEditState.items.map(item => ({ id: item.id, qty: item.qty }))
    });
    await DB.refreshAdmin();
    closeModal();
    adminOrderEditState = null;
    toast('Order updated successfully', 'success');
    renderOrders();
  } catch (err) {
    toast(err.message || 'Unable to update order', 'error');
  }
}

function renderAdminFeedback() {
  const fb = [...DB.getFeedback()].reverse();
  const container = document.getElementById('admin-feedback-list');
  if (!fb.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No feedback submitted yet.</p></div>'; return; }
  container.innerHTML = fb.map(f => `
    <div class="fb-card">
      <div class="fb-header">
        <div>
          <strong>${f.customerName}</strong>
          <div style="font-size:.8rem;color:var(--text3)">${f.orderRef || ''}</div>
        </div>
        <div class="fb-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
      </div>
      <div class="fb-comment">${f.comment || '<em style="color:var(--text3)">No comment provided</em>'}</div>
      <div class="fb-meta">${fmtDate(f.createdAt)}</div>
    </div>`).join('');
}

function renderCustomers() {
  const users = DB.getUsers().filter(u => u.role === 'customer');
  const orders = DB.getOrders();
  const feedback = DB.getFeedback();
  const container = document.getElementById('admin-customers-list');
  if (!users.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No customers registered yet.</p></div>'; return; }
  container.innerHTML = users.map(u => {
    const uOrders = orders.filter(o => o.customerId === u.id);
    const uFb = feedback.filter(f => f.customerId === u.id);
    const spent = uOrders.reduce((s, o) => s + o.total, 0);
    const avgRating = uFb.length ? (uFb.reduce((s, f) => s + f.rating, 0) / uFb.length).toFixed(1) : null;
    const customerDiscount = formatCustomerDiscount(u.restaurantDiscountType, u.restaurantDiscountValue);
    return `
    <div class="cust-detail-card">
      <div class="cust-detail-hdr">
        <div class="cust-detail-avatar">${u.name[0].toUpperCase()}</div>
        <div class="cust-detail-info">
          <div class="cust-detail-name">${u.name}</div>
          <div class="cust-detail-email"><i class="fas fa-envelope"></i> ${u.email}</div>
          <div class="cust-detail-meta">
            <span><i class="fas fa-calendar"></i> Joined ${new Date(u.createdAt).toLocaleDateString()}</span>
            ${avgRating ? `<span><i class="fas fa-star" style="color:var(--yellow)"></i> Avg Rating: ${avgRating}</span>` : ''}
            ${customerDiscount ? `<span><i class="fas fa-tag" style="color:var(--yellow)"></i> ${customerDiscount}</span>` : ''}
          </div>
        </div>
        <div class="cust-detail-stats">
          <div class="cust-stat"><div class="cust-stat-val">${uOrders.length}</div><div class="cust-stat-lbl">Orders</div></div>
          <div class="cust-stat"><div class="cust-stat-val" style="color:var(--yellow)">${fmtPrice(spent)}</div><div class="cust-stat-lbl">Total Spent</div></div>
          <div class="cust-stat"><div class="cust-stat-val">${uFb.length}</div><div class="cust-stat-lbl">Reviews</div></div>
        </div>
        <div style="display:flex;gap:8px;align-self:flex-start;flex-shrink:0">
          <button class="btn-outline btn-sm" onclick="showCustomerDiscountModal('${u.id}')"><i class="fas fa-tag"></i> Discount</button>
          <button class="btn-danger btn-sm" onclick="deleteCustomer('${u.id}')"><i class="fas fa-user-minus"></i> Delete</button>
        </div>
      </div>
      ${uOrders.length ? `
      <div class="cust-orders-tbl">
        <div class="cust-tbl-hdr"><span>Order ID</span><span>Items</span><span>Total</span><span>Payment</span><span>Status</span><span>Date</span></div>
        ${[...uOrders].reverse().map(o => `
        <div class="cust-tbl-row">
          <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
          <span style="color:var(--text2);font-size:.82rem">${o.items.map(i => `${i.icon} ${i.name} \u00d7${i.qty}`).join(', ')}</span>
          <span style="color:var(--yellow);font-weight:700">${fmtPrice(o.total)}</span>
          <span style="color:var(--text2)">${o.paymentMethod}</span>
          <span><span class="badge badge-${o.status}">${o.status}</span></span>
          <span style="color:var(--text3);font-size:.78rem">${fmtDate(o.createdAt)}</span>
        </div>`).join('')}
      </div>` : '<div style="color:var(--text3);font-size:.85rem;padding:12px 0">No orders yet.</div>'}
    </div>`;
  }).join('');
}

function showCustomerDiscountModal(id) {
  const customer = DB.getUsers().find(u => u.id === id && u.role === 'customer');
  if (!customer) return;
  showModal(`Restaurant Discount: ${customer.name}`, `
    <div class="form-group">
      <label>Discount Type</label>
      <div class="inp-wrap"><i class="fas fa-percent"></i>
        <select id="cust-discount-type">
          <option value="none" ${!customer.restaurantDiscountType ? 'selected' : ''}>No Discount</option>
          <option value="percentage" ${customer.restaurantDiscountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
          <option value="fixed" ${customer.restaurantDiscountType === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Discount Value</label>
      <div class="inp-wrap"><i class="fas fa-tag"></i>
        <input type="number" id="cust-discount-value" min="0" step="0.01" value="${customer.restaurantDiscountValue || 0}">
      </div>
    </div>
    <p style="font-size:.82rem;color:var(--text3);margin-bottom:18px">This discount is applied automatically for this customer, even without a coupon.</p>
    <button class="btn-primary btn-full" onclick="saveCustomerDiscount('${id}')"><i class="fas fa-save"></i> Save Discount</button>
  `);
}

async function saveCustomerDiscount(id) {
  const discountType = document.getElementById('cust-discount-type').value;
  const discountValue = parseFloat(document.getElementById('cust-discount-value').value || '0');
  if (Number.isNaN(discountValue) || discountValue < 0) {
    toast('Enter a valid discount value', 'error');
    return;
  }
  try {
    await API.put(`/api/admin/customers/${id}/discount`, { discountType, discountValue });
    await DB.refreshAdmin();
    closeModal();
    toast('Customer discount updated', 'success');
    renderCustomers();
  } catch (err) {
    toast(err.message || 'Unable to update customer discount', 'error');
  }
}

function deleteCustomer(id) {
  const user = DB.getUsers().find(u => u.id === id);
  if (!user) return;
  showModal('Delete Customer', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">\ud83d\uddd1\ufe0f</div>
      <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Delete account for <span style="color:var(--yellow)">${user.name}</span>?</p>
      <p style="color:var(--text2);font-size:.88rem;margin-bottom:28px">Permanently removes their account, orders and feedback.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:160px" onclick="confirmDeleteUser('${id}','customers')">
          <i class="fas fa-user-minus"></i> Yes, Delete
        </button>
        <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Cancel</button>
      </div>
    </div>
  `);
}

async function confirmDeleteUser(id, returnSec) {
  try {
    await API.delete(`/api/admin/customers/${id}`);
    await DB.refreshAdmin();
    closeModal();
    toast('Account deleted', 'info');
    adminNav(returnSec);
  } catch (err) {
    toast(err.message || 'Unable to delete account', 'error');
  }
}

// ===== COUPONS ADMIN =====
function renderAdminCoupons() {
  const coupons = DB.getCoupons();
  const tbody = document.getElementById('admin-coupons-tbody');
  if (!tbody) return;
  if (!coupons.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3)"><i class="fas fa-tags" style="font-size:2rem;display:block;margin-bottom:10px"></i>No coupons found</td></tr>`;
    return;
  }
  tbody.innerHTML = coupons.map(c => `
    <tr>
      <td style="font-weight:700;color:var(--yellow)">${c.code}</td>
      <td>${c.discountType === 'percentage' ? c.discountValue + '%' : fmtPrice(c.discountValue)}</td>
      <td style="color:var(--text2);font-size:.85rem">
        ${c.minOrderAttr > 0 ? `Min: ${fmtPrice(c.minOrderAttr)}<br>` : ''}
        ${c.applicableCategory ? `Cat: ${c.applicableCategory}` : 'All Items'}
      </td>
      <td><span class="badge ${c.status === 'Active' ? 'badge-available' : 'badge-unavailable'}">${c.status}</span></td>
      <td>
        <button class="btn-icon" onclick="showEditCouponModal('${c.id}')" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="btn-icon danger" onclick="deleteCoupon('${c.id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function couponFormHtml(coupon) {
  const cats = ['', 'Burgers', 'Pizzas', 'Sides', 'Desserts', 'Drinks', 'Tuk Shop'];
  return `
    <div class="form-group">
      <label>Coupon Code</label>
      <div class="inp-wrap"><i class="fas fa-tag"></i><input type="text" id="cp-code" value="${coupon?.code || ''}" placeholder="e.g. SUMMER20" required style="text-transform:uppercase"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Discount Type</label>
        <div class="inp-wrap"><i class="fas fa-percent"></i>
          <select id="cp-type">
            <option value="percentage" ${coupon?.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
            <option value="fixed" ${coupon?.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Discount Value</label>
        <div class="inp-wrap"><i class="fas fa-coins"></i><input type="number" id="cp-value" value="${coupon?.discountValue || ''}" placeholder="10" step="0.01" min="0" required></div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Min Order Total</label>
        <div class="inp-wrap"><i class="fas fa-dollar-sign"></i><input type="number" id="cp-min" value="${coupon?.minOrderAttr || 0}" placeholder="0 for no min" step="0.01" min="0"></div>
      </div>
      <div class="form-group">
        <label>Applicable Category</label>
        <div class="inp-wrap"><i class="fas fa-layer-group"></i>
          <select id="cp-cat">
            ${cats.map(c => `<option value="${c}" ${coupon?.applicableCategory === c ? 'selected' : ''}>${c ? c : 'All Categories'}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <div class="inp-wrap"><i class="fas fa-toggle-on"></i>
        <select id="cp-status">
          <option value="Active" ${coupon?.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${coupon?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
    </div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveCoupon(${coupon ? `'${coupon.id}'` : null})"><i class="fas fa-save"></i> Save Coupon</button>
  `;
}

function showAddCouponModal() { showModal('Add New Coupon', couponFormHtml(null)); }
function showEditCouponModal(id) {
  const coupon = DB.getCoupons().find(c => c.id === id);
  if (coupon) showModal('Edit Coupon', couponFormHtml(coupon));
}

async function saveCoupon(id) {
  const code = document.getElementById('cp-code').value.trim().toUpperCase();
  const type = document.getElementById('cp-type').value;
  const value = parseFloat(document.getElementById('cp-value').value);
  const min = parseFloat(document.getElementById('cp-min').value) || 0;
  const cat = document.getElementById('cp-cat').value;
  const status = document.getElementById('cp-status').value;

  if (!code || isNaN(value) || value <= 0) { toast('Please fill all fields correctly', 'error'); return; }
  try {
    const payload = { code, discountType: type, discountValue: value, minOrderAttr: min, applicableCategory: cat, status };
    if (id) await API.put(`/api/admin/coupons/${id}`, payload);
    else await API.post('/api/admin/coupons', payload);
    await DB.refreshAdmin();
    closeModal();
    toast(id ? 'Coupon updated!' : 'Coupon added!', 'success');
    renderAdminCoupons();
  } catch (err) {
    toast(err.message || 'Unable to save coupon', 'error');
  }
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  try {
    await API.delete(`/api/admin/coupons/${id}`);
    await DB.refreshAdmin();
    toast('Coupon deleted', 'info');
    renderAdminCoupons();
  } catch (err) {
    toast(err.message || 'Unable to delete coupon', 'error');
  }
}

// ===== SETTINGS =====
function renderSettings() {
  const session = DB.getSession();
  const superAdm = isSuperAdmin();
  const admins = DB.getUsers().filter(u => u.role === 'admin');
  const list = document.getElementById('admin-accounts-list');

  // Show/hide the "Add New Admin" button based on role
  const addBtn = document.querySelector('#sec-settings .settings-card:last-child button.btn-primary');
  if (addBtn) addBtn.style.display = superAdm ? '' : 'none';

  list.innerHTML = admins.map(a => {
    const isMe = a.id === session.id;
    const isSA = !!a.isSuperAdmin;
    const crownBadge = isSA
      ? `<span class="super-admin-badge"><i class="fas fa-crown"></i> Chief Admin</span>`
      : '';
    let action = '';
    if (isMe) {
      action = '<span class="you-badge">YOU</span>';
    } else if (!superAdm) {
      action = '<span style="font-size:.75rem;color:var(--text3)">—</span>';
    } else if (isSA) {
      action = '<span style="font-size:.75rem;color:var(--text3)" title="Chief Admin cannot be removed"><i class="fas fa-lock"></i></span>';
    } else {
      action = `<button class="btn-outline btn-sm" onclick="showEditAccountModal('${a.id}')" style="margin-right:6px"><i class="fas fa-pen"></i></button><button class="btn-danger btn-sm" onclick="deleteAdmin('${a.id}')"><i class="fas fa-trash"></i></button>`;
    }
    return `
    <div class="admin-acc-row">
      <div class="avatar" style="width:36px;height:36px;font-size:.85rem;flex-shrink:0;${isSA ? 'background:linear-gradient(135deg,#f5c400,#ff9900);' : ''}">${a.name[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.9rem;display:flex;align-items:center;gap:8px">${a.name} ${crownBadge}</div>
        <div style="font-size:.78rem;color:var(--text3)">${a.email}</div>
      </div>
      ${action}
    </div>`;
  }).join('');

  // If not super admin, show a restriction notice for the whole admin section
  const adminCard = document.querySelector('#sec-settings .settings-card:last-child');
  if (adminCard) {
    let notice = adminCard.querySelector('.sa-notice');
    if (!superAdm && !notice) {
      notice = document.createElement('div');
      notice.className = 'sa-notice settings-note';
      notice.style.marginTop = '16px';
      notice.innerHTML = '<i class="fas fa-lock"></i> Only the <strong>Chief Admin</strong> can add or remove admin accounts.';
      adminCard.appendChild(notice);
    } else if (superAdm && notice) {
      notice.remove();
    }
  }
  renderCurrencyCard();
  renderCashierAccountsList();
  // Pre-populate tax input
  const taxInput = document.getElementById('tax-input');
  if (taxInput) taxInput.value = (parseFloat(state.taxRate || 0) * 100).toFixed(2);
}

function showAddAdminModal() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add admins', 'error'); return; }
  showModal('Add New Admin', `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i><input type="text" id="na-name" placeholder="Admin Name" required></div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i><input type="email" id="na-email" placeholder="admin@example.com" required></div></div>
    <div class="form-group"><label>Password</label><div class="inp-wrap"><i class="fas fa-lock"></i><input type="password" id="na-pass" placeholder="Min. 6 characters" required></div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveNewAdmin()"><i class="fas fa-user-plus"></i> Create Admin</button>
  `);
}

async function saveNewAdmin() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add admins', 'error'); return; }
  const name = document.getElementById('na-name').value.trim();
  const email = document.getElementById('na-email').value.trim();
  const pass = document.getElementById('na-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  try {
    await API.post('/api/admin/staff/admins', { name, email, password: pass });
    await DB.refreshAdmin();
    closeModal();
    toast(`Admin "${name}" created!`, 'success');
    renderSettings();
  } catch (err) {
    toast(err.message || 'Unable to create admin', 'error');
  }
}

function deleteAdmin(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can remove admins', 'error'); return; }
  const adm = DB.getUsers().find(u => u.id === id);
  if (!adm) return;
  if (adm.isSuperAdmin) { toast('The Chief Admin account cannot be deleted', 'error'); return; }
  showModal('Remove Admin', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
      <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Remove admin <span style="color:var(--yellow)">${adm.name}</span>?</p>
      <p style="color:var(--text2);font-size:.88rem;margin-bottom:28px">Their account will be deleted. Orders data is kept.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:160px" onclick="confirmDeleteAdmin('${id}')">
          <i class="fas fa-trash"></i> Yes, Remove
        </button>
        <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Cancel</button>
      </div>
    </div>
  `);
}

async function confirmDeleteAdmin(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can remove admins', 'error'); return; }
  const adm = DB.getUsers().find(u => u.id === id);
  if (adm?.isSuperAdmin) { toast('Chief Admin cannot be deleted', 'error'); return; }
  try {
    await API.delete(`/api/admin/staff/${id}`);
    await DB.refreshAdmin();
    closeModal();
    toast('Admin removed', 'info');
    renderSettings();
  } catch (err) {
    toast(err.message || 'Unable to remove admin', 'error');
  }
}

// ===== EXPORT / IMPORT / CLEAR =====
async function exportData() {
  try {
    const data = await API.get('/api/admin/backup/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fastbite-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Data exported! \ud83d\udcbe', 'success');
  } catch (err) {
    toast(err.message || 'Unable to export data', 'error');
  }
}

function importData(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.users || !data.items) { toast('Invalid backup file', 'error'); return; }
      const safeJson = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      showModal('Confirm Import', `
        <div style="text-align:center;padding:8px 0">
          <div style="font-size:3rem;margin-bottom:16px">\ud83d\udcc2</div>
          <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Import this backup?</p>
          <p style="color:var(--text2);font-size:.85rem;margin-bottom:6px">Exported: <strong>${data.exportedAt ? fmtDate(data.exportedAt) : 'unknown'}</strong></p>
          <p style="color:var(--text2);font-size:.85rem;margin-bottom:20px">${data.users.length} users \u00b7 ${data.items.length} items \u00b7 ${(data.orders || []).length} orders</p>
          <p style="color:var(--red);font-size:.82rem;margin-bottom:20px">\u26a0\ufe0f This will overwrite all current data.</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn-primary" style="min-width:160px" onclick="confirmImport('${safeJson}')">
              <i class="fas fa-upload"></i> Yes, Import
            </button>
            <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Cancel</button>
          </div>
        </div>
      `);
    } catch { toast('Failed to read backup file', 'error'); }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

async function confirmImport(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    await API.post('/api/admin/backup/import', data);
    await DB.refreshAdmin();
    closeModal();
    toast('Data imported! \u2705', 'success');
    adminNav('settings');
  } catch (err) {
    toast(err.message || 'Import failed', 'error');
  }
}

function clearAllData() {
  showModal('Clear All Data', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">\ud83d\udca3</div>
      <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Clear ALL app data?</p>
      <p style="color:var(--red);font-size:.88rem;margin-bottom:28px">Permanently deletes all users, orders, menu items and feedback. Cannot be undone.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:160px" onclick="confirmClearAll()">
          <i class="fas fa-bomb"></i> Yes, Clear Everything
        </button>
        <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Cancel</button>
      </div>
    </div>
  `);
}

async function confirmClearAll() {
  try {
    await API.delete('/api/admin/backup/all');
    await DB.refreshAdmin();
    closeModal();
    toast('All data cleared.', 'info');
    adminNav('dashboard');
  } catch (err) {
    toast(err.message || 'Unable to clear data', 'error');
  }
}

// ===== PROFILE MANAGEMENT =====

// --- CUSTOMER: edit own profile ---
function showCustomerProfileModal() {
  const user = DB.getSession();
  showModal('Edit My Profile', `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i>
      <input type="text" id="ep-name" value="${user.name}" required>
    </div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i>
      <input type="email" id="ep-email" value="${user.email}" required>
    </div></div>
    <hr style="border-color:var(--border);margin:12px 0">
    <p style="font-size:.8rem;color:var(--text3);margin-bottom:12px">Leave password fields blank to keep current password.</p>
    <div class="form-group"><label>Current Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="ep-cur-pass" placeholder="Required to save changes">
    </div></div>
    <div class="form-group"><label>New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="ep-new-pass" placeholder="Leave blank to keep current">
    </div></div>
    <div class="form-group"><label>Confirm New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="ep-con-pass" placeholder="Repeat new password">
    </div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveCustomerProfile()">
      <i class="fas fa-save"></i> Save Changes
    </button>
  `);
}

async function saveCustomerProfile() {
  const name = document.getElementById('ep-name').value.trim();
  const email = document.getElementById('ep-email').value.trim();
  const curPass = document.getElementById('ep-cur-pass').value;
  const newPass = document.getElementById('ep-new-pass').value;
  const conPass = document.getElementById('ep-con-pass').value;

  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (!curPass) { toast('Enter your current password to save', 'error'); return; }
  try {
    const updated = await API.put('/api/account/profile', {
      name, email, currentPassword: curPass, newPassword: newPass || null, confirmPassword: conPass || null
    });
    state.session = { ...state.session, ...updated };
    document.getElementById('cust-name').textContent = updated.name;
    document.getElementById('cust-avatar').textContent = updated.name[0].toUpperCase();
    closeModal();
    toast('Profile updated! ✅', 'success');
  } catch (err) {
    toast(err.message || 'Unable to update profile', 'error');
  }
}

// --- ADMIN: edit own profile (via sidebar footer) ---
function showEditMyAdminProfile() {
  const user = DB.getSession();
  showModal('Edit My Profile', `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i>
      <input type="text" id="amp-name" value="${user.name}" required>
    </div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i>
      <input type="email" id="amp-email" value="${user.email}" required>
    </div></div>
    <hr style="border-color:var(--border);margin:12px 0">
    <p style="font-size:.8rem;color:var(--text3);margin-bottom:12px">Leave blank to keep current password.</p>
    <div class="form-group"><label>Current Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="amp-cur" placeholder="Required to save changes">
    </div></div>
    <div class="form-group"><label>New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="amp-new" placeholder="Leave blank to keep current">
    </div></div>
    <div class="form-group"><label>Confirm New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="amp-con" placeholder="Repeat new password">
    </div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveMyAdminProfile()">
      <i class="fas fa-save"></i> Save Changes
    </button>
  `);
}

async function saveMyAdminProfile() {
  const name = document.getElementById('amp-name').value.trim();
  const email = document.getElementById('amp-email').value.trim();
  const curPass = document.getElementById('amp-cur').value;
  const newPass = document.getElementById('amp-new').value;
  const conPass = document.getElementById('amp-con').value;

  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (!curPass) { toast('Enter your current password to save', 'error'); return; }
  try {
    const updated = await API.put('/api/account/profile', {
      name, email, currentPassword: curPass, newPassword: newPass || null, confirmPassword: conPass || null
    });
    state.session = { ...state.session, ...updated };
    document.getElementById('admin-name').textContent = updated.name;
    document.getElementById('admin-avatar').textContent = updated.name[0].toUpperCase();
    closeModal();
    toast('Profile updated! ✅', 'success');
  } catch (err) {
    toast(err.message || 'Unable to update profile', 'error');
  }
}

// --- SUPER ADMIN: edit any admin or cashier account ---
function showEditAccountModal(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can edit other accounts', 'error'); return; }
  const target = DB.getUsers().find(u => u.id === id);
  if (!target) return;
  showModal(`Edit: ${target.name}`, `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i>
      <input type="text" id="ea-name" value="${target.name}" required>
    </div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i>
      <input type="email" id="ea-email" value="${target.email}" required>
    </div></div>
    <hr style="border-color:var(--border);margin:12px 0">
    <p style="font-size:.8rem;color:var(--text3);margin-bottom:12px">Leave blank to keep current password.</p>
    <div class="form-group"><label>New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="ea-pass" placeholder="Leave blank to keep current">
    </div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveEditAccount('${id}')">
      <i class="fas fa-save"></i> Save Changes
    </button>
  `);
}

async function saveEditAccount(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can edit other accounts', 'error'); return; }
  const name = document.getElementById('ea-name').value.trim();
  const email = document.getElementById('ea-email').value.trim();
  const pass = document.getElementById('ea-pass').value;
  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (pass && pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
  try {
    await API.put(`/api/admin/staff/${id}`, { name, email, password: pass || null });
    await DB.refreshAdmin();
    closeModal();
    toast(`Account updated for ${name} ✅`, 'success');
    renderSettings();
  } catch (err) {
    toast(err.message || 'Unable to update account', 'error');
  }
}

// ===== CURRENCY SETTINGS =====
const CURRENCIES = [
  'USD|$|US Dollar', 'EUR|€|Euro', 'GBP|£|British Pound', 'PKR|₨|Pakistani Rupee',
  'INR|₹|Indian Rupee', 'RUB|₽|Russian Ruble', 'JPY|¥|Japanese Yen',
  'AED|د.إ|UAE Dirham', 'SAR|﷼|Saudi Riyal', 'CNY|¥|Chinese Yuan',
  'CAD|CA$|Canadian Dollar', 'AUD|A$|Australian Dollar', 'CHF|Fr|Swiss Franc',
  'TRY|₺|Turkish Lira', 'KRW|₩|South Korean Won', 'BRL|R$|Brazilian Real',
  'MXN|MX$|Mexican Peso', 'ZAR|R|South African Rand', 'NGN|₦|Nigerian Naira',
  'EGP|E£|Egyptian Pound', 'SEK|kr|Swedish Krona', 'NOK|kr|Norwegian Krone',
  'DKK|kr|Danish Krone', 'SGD|S$|Singapore Dollar', 'HKD|HK$|Hong Kong Dollar',
  'BDT|৳|Bangladeshi Taka', 'MYR|RM|Malaysian Ringgit', 'IDR|Rp|Indonesian Rupiah',
  'THB|฿|Thai Baht', 'PHP|₱|Philippine Peso', 'IQD|ع.د|Iraqi Dinar',
];

function renderCurrencyCard() {
  const sel = document.getElementById('currency-select');
  const preview = document.getElementById('currency-preview');
  if (!sel) return;
  const cur = DB.getCurrency();
  sel.innerHTML = CURRENCIES.map(c => {
    const [code, sym, name] = c.split('|');
    return `<option value="${c}" ${c === cur ? 'selected' : ''}>${code} ${sym} — ${name}</option>`;
  }).join('');
  const [code, sym, name] = cur.split('|');
  preview.innerHTML = `<i class="fas fa-tag"></i> Preview: <strong>${sym}12.99</strong> &nbsp;·&nbsp; ${name} (${code})`;
}

async function saveCurrencySetting(val) {
  try {
    await API.put('/api/admin/settings/currency', { currency: val });
    DB.saveCurrency(val);
    const [code, sym, name] = val.split('|');
    document.getElementById('currency-preview').innerHTML = `<i class="fas fa-check text-green"></i> Currency updated to ${name} (${code})`;
    toast('Currency updated effectively', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function saveTaxSetting(val) {
  try {
    const rate = parseFloat(val) / 100;
    await API.put('/api/admin/settings/tax', { rate });
    DB.saveTaxRate(rate);
    document.getElementById('tax-preview').innerHTML = `<i class="fas fa-check text-green"></i> Tax updated to ${val}%`;
    toast('Tax updated effectively', 'success');
  } catch (err) { toast(err.message, 'error'); }
}


// ===== CASHIER ACCOUNTS =====
function renderCashierAccountsList() {
  const cashiers = DB.getUsers().filter(u => u.role === 'cashier');
  const superAdm = isSuperAdmin();
  const list = document.getElementById('cashier-accounts-list');
  if (!list) return;
  if (!cashiers.length) {
    list.innerHTML = '<div style="color:var(--text3);font-size:.85rem;padding:8px 0">No cashier accounts yet.</div>';
  } else {
    list.innerHTML = cashiers.map(c => `
      <div class="admin-acc-row">
        <div class="avatar" style="width:36px;height:36px;font-size:.85rem;flex-shrink:0;background:linear-gradient(135deg,#1a6b3e,#28a96a)">${c.name[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.9rem">${c.name}</div>
          <div style="font-size:.78rem;color:var(--text3)">${c.email}</div>
        </div>
        ${superAdm
        ? `<button class="btn-outline btn-sm" onclick="showEditAccountModal('${c.id}')" style="margin-right:6px"><i class="fas fa-pen"></i></button><button class="btn-danger btn-sm" onclick="deleteCashier('${c.id}')"><i class="fas fa-trash"></i></button>`
        : '<span style="color:var(--text3);font-size:.75rem">—</span>'}
      </div>`).join('');
  }
  // Show/hide Add button
  const addBtn = document.querySelector('#cashier-accounts-list + button');
  if (addBtn) addBtn.style.display = superAdm ? '' : 'none';
}

function showAddCashierModal() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add cashiers', 'error'); return; }
  showModal('Add New Cashier', `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i><input type="text" id="nc-name" placeholder="Cashier Name" required></div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i><input type="email" id="nc-email" placeholder="cashier@example.com" required></div></div>
    <div class="form-group"><label>Password</label><div class="inp-wrap"><i class="fas fa-lock"></i><input type="password" id="nc-pass" placeholder="Min. 6 characters" required></div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveNewCashier()"><i class="fas fa-user-plus"></i> Create Cashier</button>
  `);
}

async function saveNewCashier() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add cashiers', 'error'); return; }
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const pass = document.getElementById('nc-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  try {
    await API.post('/api/admin/staff/cashiers', { name, email, password: pass });
    await DB.refreshAdmin();
    closeModal();
    toast(`Cashier "${name}" created!`, 'success');
    renderCashierAccountsList();
  } catch (err) {
    toast(err.message || 'Unable to create cashier', 'error');
  }
}

function deleteCashier(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can remove cashiers', 'error'); return; }
  const c = DB.getUsers().find(u => u.id === id);
  if (!c) return;
  showModal('Remove Cashier', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
      <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Remove cashier <span style="color:var(--yellow)">${c.name}</span>?</p>
      <p style="color:var(--text2);font-size:.88rem;margin-bottom:28px">Their account will be deleted.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:160px" onclick="confirmDeleteCashier('${id}')">
          <i class="fas fa-trash"></i> Yes, Remove
        </button>
        <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Cancel</button>
      </div>
    </div>
  `);
}

async function confirmDeleteCashier(id) {
  try {
    await API.delete(`/api/admin/staff/${id}`);
    await DB.refreshAdmin();
    closeModal();
    toast('Cashier removed', 'info');
    renderCashierAccountsList();
  } catch (err) {
    toast(err.message || 'Unable to remove cashier', 'error');
  }
}

// ===== CASHIER POS TERMINAL =====
let posCat = '';
let posCart = [];
let posCoupon = null;
let posEditOrderId = null;

async function loadCashier(refresh = true) {
  if (refresh) await DB.refreshCashier();
  const user = DB.getSession();
  document.getElementById('cashier-name').textContent = user.name;
  document.getElementById('cashier-avatar').textContent = user.name[0].toUpperCase();
  showPage('page-cashier');
  posCart = [];
  posCoupon = null;
  posEditOrderId = null;
  buildPosCatTabs();
  renderPosMenu();
  renderPosCart();
  renderCashierCustomersDL();
  posNav('order');
}

function buildPosCatTabs() {
  const items = DB.getItems().filter(i => i.available);
  const cats = ['', ...new Set(items.map(i => i.category))];
  const catIcons = { '': '🍽️ All', Burgers: '🍔 Burgers', Pizzas: '🍕 Pizzas', Sides: '🍟 Sides', Desserts: '🍰 Desserts', Drinks: '🥤 Drinks', 'Tuk Shop': '🏪 Tuk Shop' };
  const tabs = document.getElementById('pos-cat-tabs');
  tabs.innerHTML = cats.map((c, idx) =>
    `<button class="cat-tab${idx === 0 ? ' active' : ''}" onclick="posFilterCat(this,'${c}')">${catIcons[c] || c}</button>`
  ).join('');
}

function posNav(sec) {
  ['order', 'orders', 'customers'].forEach(s => {
    document.getElementById('pos-sec-' + s)?.classList.toggle('hidden', s !== sec);
    document.getElementById('posnav-' + s)?.classList.toggle('active', s === sec);
  });
  if (sec === 'orders') renderCashierOrders();
  if (sec === 'customers') renderCashierCustomers();
}

function posFilterCat(btn, cat) {
  posCat = cat;
  document.querySelectorAll('#pos-cat-tabs .cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPosMenu();
}

function renderPosMenu() {
  const q = (document.getElementById('pos-search')?.value || '').toLowerCase();
  const items = DB.getItems().filter(i => i.available &&
    (posCat === '' || i.category === posCat) &&
    (q === '' || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)));
  const grid = document.getElementById('pos-items-grid');
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No items found.</p></div>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const hasDiscount = item.discount && parseFloat(item.discount) > 0;
    const effectivePrice = effectiveMenuPrice(item);
    return `
    <div class="pos-item-card" onclick="posAddToCart('${item.id}')">
      <div class="pos-item-thumb">
        ${item.image
      ? `<img src="${item.image}" alt="${item.name}">`
      : `<span class="mc-icon-emoji">${item.icon}</span>`}
      </div>
      <div class="pos-item-name">${item.name}</div>
      <div class="pos-item-price">
        ${hasDiscount ? `<span style="text-decoration:line-through;color:var(--text3);font-size:.78em;margin-right:4px">${fmtPrice(item.price)}</span>` : ''}
        ${fmtPrice(effectivePrice)}
      </div>
      <button class="pos-add-btn"><i class="fas fa-plus"></i></button>
    </div>`;
  }).join('');
}

function renderCashierOrders() {
  const filter = document.getElementById('pos-status-filter')?.value || '';
  let orders = [...DB.getOrders()].reverse();
  if (filter) orders = orders.filter(o => o.status === filter);
  const container = document.getElementById('cashier-orders-list');
  if (!orders.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found.</p></div>';
    return;
  }
  const statusColors = { Preparing: '#f59e0b', Ready: '#3b82f6', Delivered: '#22c55e', Cancelled: '#ef4444' };
  container.innerHTML = orders.map(o => `
    <div class="cashier-order-card">
      <div class="cashier-order-hdr">
        <div>
          <div class="cashier-order-id">#${o.id.slice(-6).toUpperCase()}
            <span class="badge" style="background:${statusColors[o.status]}22;color:${statusColors[o.status]};border:1px solid ${statusColors[o.status]}44;margin-left:8px">${o.status}</span>
            <span class="badge" style="background:${o.paid ? '#22c55e' : '#f59e0b'}22;color:${o.paid ? '#22c55e' : '#f59e0b'};border:1px solid ${o.paid ? '#22c55e' : '#f59e0b'}44;margin-left:8px">${o.paid ? 'PAID' : 'UNPAID'}</span>
          </div>
          <div style="font-size:.8rem;color:var(--text3);margin-top:3px">
            <i class="fas fa-user" style="margin-right:4px"></i>${o.customerName || 'Walk-in'}
            &nbsp;·&nbsp;<i class="fas fa-clock" style="margin-right:4px"></i>${fmtDate(o.createdAt)}
            &nbsp;·&nbsp;<i class="fas fa-credit-card" style="margin-right:4px"></i>${o.paymentMethod}
            ${o.cashierName ? `&nbsp;·&nbsp;<i class="fas fa-cash-register" style="margin-right:4px"></i>${o.cashierName}` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:1.2rem;font-weight:800;color:var(--yellow)">${fmtPrice(o.total)}</div>
          <div style="font-size:.78rem;color:var(--text3)">${o.items.reduce((s, i) => s + i.qty, 0)} items</div>
        </div>
      </div>
      <div class="cashier-order-items">
        ${o.items.map(i => `<span class="cashier-order-item">${i.icon} ${i.name} <strong>×${i.qty}</strong></span>`).join('')}
      </div>
      ${o.status !== 'Delivered' && o.status !== 'Cancelled' ? `
      <div class="cashier-order-actions">
        ${o.status === 'Preparing' ? `<button class="btn-outline btn-sm" onclick="editPosOrder('${o.id}')"><i class="fas fa-edit"></i> Edit Order</button>` : ''}
        ${o.status === 'Preparing' ? `<button class="btn-outline btn-sm" onclick="cashierUpdateStatus('${o.id}','Ready')"><i class="fas fa-check"></i> Mark Ready</button>` : ''}
        ${o.status === 'Ready' ? `<button class="btn-primary btn-sm" onclick="cashierUpdateStatus('${o.id}','Delivered')"><i class="fas fa-box"></i> Mark Delivered</button>` : ''}
        ${!o.paid ? `<button class="btn-outline btn-sm" style="color:var(--yellow);border-color:var(--yellow)" onclick="cashierUpdatePaid('${o.id}', true)"><i class="fas fa-money-bill"></i> Mark Paid</button>` : `<button class="btn-outline btn-sm" style="color:var(--green);border-color:var(--green)" onclick="cashierUpdatePaid('${o.id}', false)"><i class="fas fa-times"></i> Mark Unpaid</button>`}
        <button class="btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fas fa-receipt"></i> Receipt</button>
        <button class="btn-danger btn-sm" onclick="cashierCancelOrder('${o.id}')"><i class="fas fa-times"></i> Cancel</button>
      </div>` : `
      <div class="cashier-order-actions">
        <button class="btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fas fa-receipt"></i> Receipt</button>
      </div>`}
    </div>`).join('');
}

async function cashierUpdateStatus(id, status) {
  try {
    await API.put(`/api/cashier/orders/${id}/status`, { status });
    await DB.refreshCashier();
    toast(`Order marked as ${status}`, 'success');
    renderCashierOrders();
  } catch (err) {
    toast(err.message || 'Unable to update order', 'error');
  }
}

function cashierCancelOrder(id) {
  showModal('Cancel Order', `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:3rem;margin-bottom:16px">❌</div>
      <p style="font-size:1rem;font-weight:600;margin-bottom:8px">Cancel this order?</p>
      <p style="color:var(--text2);font-size:.88rem;margin-bottom:28px">The order will be marked as Cancelled.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" style="background:var(--red);color:#fff;min-width:140px" onclick="confirmCashierCancel('${id}')">
          <i class="fas fa-times"></i> Yes, Cancel
        </button>
        <button class="btn-outline" onclick="closeModal()"><i class="fas fa-arrow-left"></i> Go Back</button>
      </div>
    </div>
  `);
}

async function confirmCashierCancel(id) {
  try {
    await API.post(`/api/cashier/orders/${id}/cancel`, {});
    await DB.refreshCashier();
    closeModal();
    toast('Order cancelled', 'info');
    renderCashierOrders();
  } catch (err) {
    toast(err.message || 'Unable to cancel order', 'error');
  }
}

function posAddToCart(itemId) {
  const item = DB.getItems().find(i => i.id === itemId);
  if (!item) return;
  const exists = posCart.find(c => c.id === itemId);
  const price = effectiveMenuPrice(item);
  if (exists) {
    if (exists.qty >= MAX_ITEM_QUANTITY) {
      toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
      return;
    }
    exists.qty++;
  } else {
    posCart.push({ ...item, price, qty: 1 });
  }
  renderPosCart();
  // brief flash on button
  toast(`${item.icon} ${item.name} added`, 'success');
}

function posUpdateQty(itemId, delta) {
  const idx = posCart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  const nextQty = posCart[idx].qty + delta;
  if (nextQty > MAX_ITEM_QUANTITY) {
    toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
    return;
  }
  posCart[idx].qty = nextQty;
  if (posCart[idx].qty <= 0) posCart.splice(idx, 1);
  renderPosCart();
}

function applyPosCoupon() {
  const codeInp = document.getElementById('pos-promo')?.value.trim().toUpperCase() || '';
  if (!codeInp) { posCoupon = null; renderPosCart(); return; }
  const c = DB.getCoupons().find(x => x.code === codeInp && x.status === 'Active');
  if (!c) { toast('Invalid or inactive coupon', 'error'); return; }
  posCoupon = c;
  toast('Coupon applied!', 'success');
  renderPosCart();
}

function removePosCoupon() { posCoupon = null; renderPosCart(); }

function renderPosCart() {
  const itemsEl = document.getElementById('pos-order-items');
  const footerEl = document.getElementById('pos-order-footer');
  const currentPayment = document.getElementById('pos-payment')?.value || 'Cash';
  const currentPromoValue = document.getElementById('pos-promo')?.value || '';
  if (!posCart.length) {
    itemsEl.innerHTML = '<div class="pos-empty-order"><i class="fas fa-shopping-bag"></i><p>Add items from the menu</p></div>';
    footerEl.innerHTML = '';
    posCoupon = null;
    return;
  }
  itemsEl.innerHTML = posCart.map(c => `
    <div class="pos-cart-row">
      <span class="pos-cart-icon">${c.icon}</span>
      <div class="pos-cart-info">
        <div class="pos-cart-name">${c.name}</div>
        <div class="pos-cart-price">${fmtPrice(c.price)} each</div>
      </div>
      <div class="pos-cart-qty">
        <button onclick="posUpdateQty('${c.id}',-1)"><i class="fas fa-minus"></i></button>
        <span>${c.qty}</span>
        <button onclick="posUpdateQty('${c.id}',1)"><i class="fas fa-plus"></i></button>
      </div>
      <div class="pos-cart-total">${fmtPrice(c.price * c.qty)}</div>
    </div>`).join('');

  const subtotal = posCart.reduce((s, c) => s + c.price * c.qty, 0);

  let discount = 0;
  if (posCoupon) {
    let validSubtotal = 0;
    posCart.forEach(c => {
      if (!posCoupon.applicableCategory || c.category === posCoupon.applicableCategory) {
        validSubtotal += c.price * c.qty;
      }
    });
    if (validSubtotal >= (posCoupon.minOrderAttr || 0) && validSubtotal > 0) {
      if (posCoupon.discountType === 'percentage') {
        discount = validSubtotal * (posCoupon.discountValue / 100);
      } else {
        discount = Math.min(validSubtotal, posCoupon.discountValue);
      }
    } else {
      if (posCoupon.minOrderAttr > validSubtotal) toast('Coupon requires ' + fmtPrice(posCoupon.minOrderAttr) + ' minimum', 'info');
      posCoupon = null;
    }
  }

  const customer = findCustomerByName(document.getElementById('pos-customer')?.value || '');
  const customerDiscount = calculateDirectDiscount(customer?.restaurantDiscountType, customer?.restaurantDiscountValue, subtotal);
  const totalDiscount = Math.min(subtotal, discount + customerDiscount);

  const delivery = 0;
  const taxRate = state.taxRate || 0;
  const tax = Math.max(0, subtotal - totalDiscount) * taxRate;
  const total = Math.max(0, subtotal - totalDiscount) + tax + delivery;

  footerEl.innerHTML = `
    <div class="pos-totals">
      <div class="pos-total-row"><span>Subtotal</span><span>${fmtPrice(subtotal)}</span></div>
      ${discount > 0 ? `<div class="pos-total-row" style="color:var(--yellow)"><span>Discount (${posCoupon.code})</span><span>-${fmtPrice(discount)} <i class="fas fa-times" style="cursor:pointer;margin-left:4px" onclick="removePosCoupon()"></i></span></div>` : ''}
      ${customerDiscount > 0 ? `<div class="pos-total-row" style="color:var(--yellow)"><span>${formatCustomerDiscount(customer.restaurantDiscountType, customer.restaurantDiscountValue)}</span><span>-${fmtPrice(customerDiscount)}</span></div>` : ''}
      <div class="pos-total-row"><span>${formatTaxLabel(taxRate)}</span><span>${fmtPrice(tax)}</span></div>
      <div class="pos-total-row pos-grand-total"><span>TOTAL</span><span>${fmtPrice(total)}</span></div>
    </div>
    
    ${!posCoupon ? `
      <div class="pos-pay-row" style="margin-top:-10px;margin-bottom:8px;display:flex;gap:6px">
        <div class="inp-wrap" style="margin:0;flex:1"><i class="fas fa-tag"></i><input type="text" id="pos-promo" value="${currentPromoValue}" placeholder="Promo code" style="padding:6px 10px 6px 32px"></div>
        <button class="btn-outline btn-sm" onclick="applyPosCoupon()">Apply</button>
      </div>` : ''}

    <div class="pos-pay-row">
      <label style="font-size:.8rem;color:var(--text3)">Payment Method</label>
      <div class="inp-wrap" style="margin:6px 0 12px"><i class="fas fa-credit-card"></i>
        <select id="pos-payment">
          <option value="Cash" ${currentPayment === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="Card" ${currentPayment === 'Card' ? 'selected' : ''}>Card</option>
        </select>
      </div>
    </div>
    <button class="btn-primary btn-full" onclick="placePosOrder()"><i class="fas fa-check-circle"></i> ${posEditOrderId ? 'Update Order' : 'Place Order'}</button>
    <button class="btn-outline btn-full" style="margin-top:8px" onclick="clearPosCart()"><i class="fas fa-trash"></i> Clear Order</button>
  `;
}

async function placePosOrder() {
  if (!posCart.length) { toast('Cart is empty', 'error'); return; }
  const customerName = document.getElementById('pos-customer').value.trim() || 'Walk-in Customer';
  const payment = document.getElementById('pos-payment')?.value || 'Cash';
  const editId = posEditOrderId;
  try {
    const body = {
      customerName,
      couponCode: posCoupon ? posCoupon.code : null,
      paymentMethod: payment,
      items: posCart.map(c => ({ id: c.id, qty: c.qty }))
    };
    let resultOrder;
    if (editId) {
      resultOrder = await API.put(`/api/cashier/orders/${editId}`, body);
    } else {
      resultOrder = await API.post('/api/cashier/orders', body);
    }
    await DB.refreshCashier();
    posCart = [];
    posCoupon = null;
    posEditOrderId = null;
    document.getElementById('pos-customer').value = '';
    renderPosCart();
    toast(editId ? 'Order updated! ✏️' : `Order placed for ${customerName}! 🎉`, 'success');
    // Auto-show receipt for new orders
    if (!editId && resultOrder && resultOrder.id) {
      showReceipt(resultOrder.id);
    }
  } catch (err) {
    toast(err.message || 'Unable to place order', 'error');
  }
}

function clearPosCart() {
  posCart = [];
  posCoupon = null;
  posEditOrderId = null;
  renderPosCart();
}

function editPosOrder(orderId) {
  const o = DB.getOrders().find(x => x.id === orderId);
  if (!o) return;
  if (o.status !== 'Preparing') { toast('Only Preparing orders can be edited', 'error'); return; }
  posCart = o.items.map(i => {
    const menuItem = DB.getItems().find(m => m.id === i.id) || {};
    return { ...menuItem, id: i.id, name: i.name, price: parseFloat(i.price), icon: i.icon || '🍽️', category: i.category, qty: i.qty };
  });
  posCoupon = null;
  posEditOrderId = orderId;
  document.getElementById('pos-customer').value = o.customerName || '';
  posNav('order');
  renderPosCart();
  toast(`Editing order #${orderId.slice(-6).toUpperCase()} — modify items then click Update Order`, 'info');
}

// ===== CASHIER CUSTOMERS =====
function renderCashierCustomersDL() {
  const users = DB.getUsers().filter(u => u.role === 'customer');
  const dl = document.getElementById('pos-customers-dl');
  if (dl) dl.innerHTML = users.map(u => `<option value="${u.name}"></option>`).join('');
}

function renderCashierCustomers() {
  const users = DB.getUsers().filter(u => u.role === 'customer').reverse();
  const container = document.getElementById('cashier-customers-list');
  if (!container) return;
  if (!users.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No customers found.</p></div>'; return; }

  container.innerHTML = users.map(u => `
    <div class="admin-acc-row" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px">
      <div class="avatar" style="width:40px;height:40px;font-size:1rem;flex-shrink:0">${u.name[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:1rem;margin-bottom:4px">${u.name}</div>
        <div style="font-size:.8rem;color:var(--text3)"><i class="fas fa-envelope"></i> ${u.email}</div>
      </div>
      <div>
        <button class="btn-outline btn-sm" onclick="showEditCashierCustomer('${u.id}')" style="margin-right:6px"><i class="fas fa-pen"></i> Edit</button>
      </div>
    </div>`).join('');
}

function showAddCashierCustomer() {
  showModal('Add Customer', `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i>
      <input type="text" id="nc-name" placeholder="E.g. John Doe">
    </div></div>
    <div class="form-group"><label>Email address</label><div class="inp-wrap"><i class="fas fa-envelope"></i>
      <input type="email" id="nc-email" placeholder="john@example.com">
    </div></div>
    <div class="form-group"><label>Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="nc-pass" placeholder="(min 6 characters)">
    </div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveCashierCustomer()">
      <i class="fas fa-plus"></i> Add Customer
    </button>
  `);
}

async function saveCashierCustomer() {
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const pass = document.getElementById('nc-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  try {
    await API.post('/api/cashier/customers', { name, email, password: pass });
    await DB.refreshCashier();
    closeModal();
    toast(`Customer "${name}" created!`, 'success');
    renderCashierCustomersDL();
    renderCashierCustomers();
  } catch (err) {
    toast(err.message || 'Unable to create customer', 'error');
  }
}

function showEditCashierCustomer(id) {
  const target = DB.getUsers().find(u => u.id === id);
  if (!target || target.role !== 'customer') return;
  showModal(`Edit: ${target.name}`, `
    <div class="form-group"><label>Full Name</label><div class="inp-wrap"><i class="fas fa-user"></i>
      <input type="text" id="ecc-name" value="${target.name}" required>
    </div></div>
    <div class="form-group"><label>Email</label><div class="inp-wrap"><i class="fas fa-envelope"></i>
      <input type="email" id="ecc-email" value="${target.email}" required>
    </div></div>
    <hr style="border-color:var(--border);margin:12px 0">
    <p style="font-size:.8rem;color:var(--text3);margin-bottom:12px">Leave blank to keep current password.</p>
    <div class="form-group"><label>New Password</label><div class="inp-wrap"><i class="fas fa-lock"></i>
      <input type="password" id="ecc-pass" placeholder="Leave blank to keep current">
    </div></div>
    <button class="btn-primary btn-full" style="margin-top:8px" onclick="saveEditCashierCustomer('${id}')">
      <i class="fas fa-save"></i> Save Changes
    </button>
  `);
}

async function saveEditCashierCustomer(id) {
  const name = document.getElementById('ecc-name').value.trim();
  const email = document.getElementById('ecc-email').value.trim();
  const pass = document.getElementById('ecc-pass').value;
  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (pass && pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
  try {
    await API.put(`/api/cashier/customers/${id}`, { name, email, password: pass || null });
    await DB.refreshCashier();
    closeModal();
    toast(`Customer updated: ${name} ✅`, 'success');
    renderCashierCustomersDL();
    renderCashierCustomers();
  } catch (err) {
    toast(err.message || 'Unable to update customer', 'error');
  }
}

// ===== CUSTOMER =====

let activeCat = '';
let custCoupon = null;

async function loadCustomer(refresh = true) {
  if (refresh) await DB.refreshCustomer();
  const user = DB.getSession();
  document.getElementById('cust-name').textContent = user.name;
  document.getElementById('cust-avatar').textContent = user.name[0].toUpperCase();
  showPage('page-customer');
  custNav('home');
  updateCartBadge();
}

function custNav(sec) {
  const secs = ['home', 'cart', 'checkout', 'orders', 'feedback'];
  secs.forEach(s => {
    document.getElementById('csec-' + s).classList.toggle('active', s === sec);
    document.getElementById('csec-' + s).classList.toggle('hidden', s !== sec);
  });
  ['home', 'orders', 'feedback'].forEach(s => {
    const btn = document.getElementById('cnav-' + s);
    if (btn) btn.classList.toggle('active', s === sec);
  });
  if (sec === 'home') renderCustMenu();
  if (sec === 'cart') renderCart();
  if (sec === 'checkout') renderCheckout();
  if (sec === 'orders') renderCustOrders();
  if (sec === 'feedback') renderCustFeedback();
}

function filterCat(btn, cat) {
  activeCat = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCustMenu();
}

function renderCustMenu() {
  const items = DB.getItems().filter(i => i.available && (!activeCat || i.category === activeCat));
  const grid = document.getElementById('cust-menu-grid');
  if (!items.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-utensils"></i><p>No items available in this category.</p></div>'; return; }
  grid.innerHTML = items.map(i => {
    const hasDiscount = i.discount && parseFloat(i.discount) > 0;
    const effectivePrice = effectiveMenuPrice(i);
    return `
    <div class="cust-card">
      <div class="mc-thumb">${i.image ? `<img src="${i.image}" alt="${i.name}">` : `<span class="mc-icon-emoji">${i.icon}</span>`}</div>
      ${hasDiscount ? '<div style="position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:.72rem;font-weight:700;padding:3px 7px;border-radius:20px">SALE</div>' : ''}
      <div class="mc-name">${i.name}</div>
      <div class="mc-cat">${i.category}</div>
      <div class="mc-desc">${i.description}</div>
      <div class="cust-card-footer">
        <div class="mc-price">
          ${hasDiscount ? `<span style="text-decoration:line-through;color:var(--text3);font-size:.85em;margin-right:6px">${fmtPrice(i.price)}</span>` : ''}
          ${fmtPrice(effectivePrice)}
        </div>
        <button class="add-cart-btn" onclick="addToCart('${i.id}')" title="Add to cart"><i class="fas fa-plus"></i></button>
      </div>
    </div>`;
  }).join('');
}

async function addToCart(itemId) {
  const item = DB.getItems().find(i => i.id === itemId);
  if (!item) return;
  const existing = DB.getCart().find(c => c.id === itemId);
  if (existing && existing.qty >= MAX_ITEM_QUANTITY) {
    toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
    return;
  }
  try {
    syncCustomerCart(await API.post('/api/customer/cart/items', { menuItemId: itemId, quantity: 1 }));
    refreshCustomerCartViews();
    toast(`${item.name} added to cart!`, 'success');
  } catch (err) {
    toast(err.message || 'Unable to add item to cart', 'error');
  }
}

function updateCartBadge() {
  const total = DB.getCart().reduce((s, c) => s + c.qty, 0);
  document.getElementById('cart-count').textContent = total;
}

async function applyCustCoupon() {
  const codeInp = document.getElementById('cust-promo')?.value.trim().toUpperCase() || '';
  if (!codeInp) {
    if (!state.cart.couponCode) {
      custCoupon = null;
      renderCart();
      return;
    }
    await removeCustCoupon();
    return;
  }
  try {
    syncCustomerCart(await API.post('/api/customer/cart/coupon', { code: codeInp }));
    refreshCustomerCartViews();
    toast('Coupon applied!', 'success');
  } catch (err) {
    toast(err.message || 'Invalid or inactive coupon', 'error');
  }
}

async function removeCustCoupon() {
  try {
    syncCustomerCart(await API.delete('/api/customer/cart/coupon'));
    refreshCustomerCartViews();
  } catch (err) {
    toast(err.message || 'Unable to remove coupon', 'error');
  }
}

function renderCart() {
  const cartState = state.cart || emptyCart();
  const cart = cartState.items || [];
  const container = document.getElementById('cart-items');
  if (!cart.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Your cart is empty. Go add some food!</p></div>';
    document.getElementById('cart-summary-lines').innerHTML = '';
    document.getElementById('cart-total').innerHTML = '';
    return;
  }
  container.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="ci-icon">${c.icon}</div>
      <div class="ci-info">
        <div class="ci-name">${c.name}</div>
        <div class="ci-cat">${c.category}</div>
        <div class="ci-price">${fmtPrice(c.price)} each</div>
      </div>
      <div class="ci-controls">
        <button class="qty-btn" onclick="changeQty('${c.id}',-1)">−</button>
        <span class="ci-qty">${c.qty}</span>
        <button class="qty-btn" onclick="changeQty('${c.id}',1)">+</button>
      </div>
      <div class="ci-total">${fmtPrice(c.price * c.qty)}</div>
      <button class="btn-icon danger" onclick="removeCartItem('${c.id}')" style="margin-left:8px"><i class="fas fa-trash"></i></button>
    </div>`).join('');

  document.getElementById('cart-summary-lines').innerHTML = `
    <div class="summary-line"><span>Subtotal</span><span>${fmtPrice(cartState.subtotal)}</span></div>
    ${cartState.discount > 0 ? `<div class="summary-line" style="color:var(--yellow)"><span>${discountLineLabel(cartState.couponCode || custCoupon?.code)}</span><span>-${fmtPrice(cartState.discount)} ${cartState.couponCode ? '<i class="fas fa-times" style="cursor:pointer;margin-left:4px" onclick="removeCustCoupon()"></i>' : ''}</span></div>` : ''}
    <div class="summary-line"><span>Delivery Fee</span><span>${fmtPrice(cartState.delivery)}</span></div>
    <div class="summary-line"><span>${formatTaxLabel()}</span><span>${fmtPrice(cartState.tax)}</span></div>
  `;

  const totalHtml = `
    ${!cartState.couponCode ? `
    <div style="display:flex;gap:6px;margin-bottom:12px;font-weight:400;font-size:.9rem">
      <div class="inp-wrap" style="margin:0;flex:1"><i class="fas fa-tag"></i><input type="text" id="cust-promo" placeholder="Promo code" style="padding:6px 10px 6px 32px"></div>
      <button class="btn-outline btn-sm" onclick="applyCustCoupon()">Apply</button>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;width:100%"><span>Total</span><span>${fmtPrice(cartState.total)}</span></div>
  `;
  document.getElementById('cart-total').innerHTML = totalHtml;
}

async function changeQty(id, delta) {
  const item = DB.getCart().find(c => c.id === id);
  if (!item) return;
  const nextQty = item.qty + delta;
  if (nextQty > MAX_ITEM_QUANTITY) {
    toast(`Per-item quantity cannot exceed ${MAX_ITEM_QUANTITY}`, 'error');
    return;
  }
  try {
    const cart = nextQty <= 0
      ? await API.delete(`/api/customer/cart/items/${id}`)
      : await API.patch(`/api/customer/cart/items/${id}`, { quantity: nextQty });
    syncCustomerCart(cart);
    refreshCustomerCartViews();
  } catch (err) {
    toast(err.message || 'Unable to update cart', 'error');
  }
}

async function removeCartItem(id) {
  try {
    syncCustomerCart(await API.delete(`/api/customer/cart/items/${id}`));
    refreshCustomerCartViews();
    toast('Item removed from cart', 'info');
  } catch (err) {
    toast(err.message || 'Unable to remove item', 'error');
  }
}

function renderCheckout() {
  const user = DB.getSession();
  document.getElementById('co-name').value = user.name;
  const cartState = state.cart || emptyCart();
  const cart = cartState.items || [];
  if (!cart.length) { custNav('cart'); return; }

  document.getElementById('co-items').innerHTML = [
    ...cart.map(c => `<div class="co-item-row"><span>${c.icon} ${c.name} ×${c.qty}</span><span>${fmtPrice(c.price * c.qty)}</span></div>`),
    cartState.discount > 0 ? `<div class="co-item-row" style="color:var(--yellow)"><span>${discountLineLabel(cartState.couponCode || custCoupon?.code)}</span><span>-${fmtPrice(cartState.discount)}</span></div>` : '',
    `<div class="co-item-row"><span>Delivery</span><span>${fmtPrice(cartState.delivery)}</span></div>`,
    `<div class="co-item-row"><span>${formatTaxLabel()}</span><span>${fmtPrice(cartState.tax)}</span></div>`
  ].join('');
  document.getElementById('co-total').innerHTML = `<span>Total</span><span>${fmtPrice(cartState.total)}</span>`;
}

function switchPayment(radio) {
  const cardFields = document.getElementById('card-fields');
  cardFields.classList.toggle('hidden', radio.value !== 'Card');
  document.querySelectorAll('.pay-opt').forEach(l => l.classList.remove('active'));
  radio.closest('.pay-opt').classList.add('active');
}

function fmtCard(inp) {
  let v = inp.value.replace(/\D/g, '').slice(0, 16);
  inp.value = v.replace(/(.{4})/g, '$1 ').trim();
}

async function placeOrder() {
  const cart = DB.getCart();
  const name = document.getElementById('co-name').value.trim();
  const phone = document.getElementById('co-phone').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const payRadio = document.querySelector('input[name="pay"]:checked');
  const payMethod = payRadio ? payRadio.value : 'Cash';

  if (!name || !phone || !address) { toast('Please fill in all delivery details', 'error'); return; }
  if (!cart.length) { toast('Your cart is empty', 'error'); return; }

  if (payMethod === 'Card') {
    const card = document.getElementById('co-card').value.replace(/\s/g, '');
    const exp = document.getElementById('co-expiry').value;
    const cvv = document.getElementById('co-cvv').value;
    if (card.length < 16 || !exp || cvv.length < 3) { toast('Please enter valid card details', 'error'); return; }
    try {
      const order = await API.post('/api/customer/orders', {
        deliveryName: name,
        phone,
        address,
        paymentMethod: payMethod,
        cardNumber: card,
        expiry: exp,
        cvv
      });
      await DB.refreshCustomer();
      toast('Order placed successfully! 🎉', 'success');
      custNav('orders');
      showReceipt(order.id);
    } catch (err) {
      toast(err.message || 'Unable to place order', 'error');
    }
    return;
  }

  try {
    const order = await API.post('/api/customer/orders', {
      deliveryName: name,
      phone,
      address,
      paymentMethod: payMethod
    });
    await DB.refreshCustomer();
    toast('Order placed successfully! 🎉', 'success');
    custNav('orders');
    showReceipt(order.id);
  } catch (err) {
    toast(err.message || 'Unable to place order', 'error');
  }
}

function renderCustOrders() {
  const user = DB.getSession();
  const orders = DB.getOrders().filter(o => o.customerId === user.id).reverse();
  const container = document.getElementById('cust-orders-list');
  if (!orders.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>You have no orders yet. Go order some food!</p></div>'; return; }
  container.innerHTML = orders.map(o => `
    <div class="cust-order-card">
      <div class="co-hdr">
        <div>
          <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
          <span class="badge badge-${o.status}" style="margin-left:10px">${o.status}</span>
          <span class="badge" style="background:${o.paid ? '#22c55e' : '#f59e0b'}22;color:${o.paid ? '#22c55e' : '#f59e0b'};border:1px solid ${o.paid ? '#22c55e' : '#f59e0b'}44;margin-left:8px;font-size:0.7rem;padding:2px 6px;">${o.paid ? 'PAID' : 'UNPAID'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="co-date">${fmtDate(o.createdAt)}</span>
          ${o.status === 'Preparing'
      ? `<button class="btn-danger btn-sm" onclick="cancelOrder('${o.id}')"><i class="fas fa-times-circle"></i> Cancel Order</button>`
      : ''}
        </div>
      </div>
      <div class="co-body">
        <div class="co-items-txt">${o.items.map(i => `${i.icon} ${i.name} ×${i.qty}`).join(' · ')}</div>
        <div class="co-amt">${fmtPrice(o.total)}</div>
      </div>
      <div style="margin-top:10px;font-size:.8rem;color:var(--text3);display:flex;justify-content:space-between;align-items:center">
        <div>
          <i class="fas fa-${o.paymentMethod === 'Cash' ? 'money-bill-wave' : 'credit-card'}"></i> ${o.paymentMethod} &nbsp;·&nbsp;
          <i class="fas fa-map-marker-alt"></i> ${o.address}
        </div>
        <button class="btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fas fa-receipt"></i> View Receipt</button>
      </div>
    </div>`).join('');
}

function renderCustFeedback() {
  const user = DB.getSession();
  const orders = DB.getOrders().filter(o => o.customerId === user.id);
  const existingFb = DB.getFeedback().filter(f => f.customerId === user.id).map(f => f.orderId);
  const eligibleOrders = orders.filter(o => o.status === 'Delivered' && !existingFb.includes(o.id));

  const sel = document.getElementById('fb-order');
  sel.innerHTML = '<option value="">Choose an order...</option>' +
    eligibleOrders.map(o => `<option value="${o.id}">#${o.id.slice(-6).toUpperCase()} — ${fmtPrice(o.total)}</option>`).join('');

  // Star rating setup
  currentRating = 0;
  const stars = document.querySelectorAll('.star');
  stars.forEach(s => {
    s.classList.remove('active');
    s.onclick = () => {
      currentRating = parseInt(s.dataset.v);
      stars.forEach(st => st.classList.toggle('active', parseInt(st.dataset.v) <= currentRating));
    };
  });

  // My past reviews
  const myFb = DB.getFeedback().filter(f => f.customerId === user.id).reverse();
  const container = document.getElementById('my-feedback');
  if (!myFb.length) { container.innerHTML = '<div style="color:var(--text3);font-size:.85rem">No reviews yet.</div>'; return; }
  container.innerHTML = myFb.map(f => `
    <div class="my-fb-card">
      <div class="my-fb-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
      <div class="my-fb-comment">${f.comment || '<em>No comment</em>'}</div>
      <div class="my-fb-meta">${f.orderRef} · ${fmtDate(f.createdAt)}</div>
    </div>`).join('');
}

async function submitFeedback() {
  const orderId = document.getElementById('fb-order').value;
  const comment = document.getElementById('fb-comment').value.trim();
  if (!orderId) { toast('Please select an order', 'error'); return; }
  if (!currentRating) { toast('Please select a rating', 'error'); return; }
  try {
    await API.post('/api/customer/feedback', { orderId, rating: currentRating, comment });
    await DB.refreshCustomer();
    toast('Thank you for your feedback! ⭐', 'success');
    document.getElementById('fb-comment').value = '';
    renderCustFeedback();
  } catch (err) {
    toast(err.message || 'Unable to submit feedback', 'error');
  }
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', async () => {
  await DB.init();
  const session = DB.getSession();
  if (session) {
    if (session.role === 'admin') await loadAdmin(false);
    else if (session.role === 'cashier') await loadCashier(false);
    else await loadCustomer(false);
  } else {
    showPage('page-auth');
  }

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
});

async function adminUpdatePaidStatus(id, paid) {
  try {
    await API.put(`/api/admin/orders/${id}/paid`, { paid });
    await DB.refreshAdmin();
    toast(`Order marked as ${paid ? 'Paid' : 'Unpaid'}`, 'success');
    renderOrders();
  } catch(e) { toast(e.message, 'error')}
}

async function cashierUpdatePaid(id, paid) {
  try {
    await API.put(`/api/cashier/orders/${id}/paid`, { paid });
    await DB.refreshCashier();
    toast(`Order marked as ${paid ? 'Paid' : 'Unpaid'}`, 'success');
    renderCashierOrders();
  } catch(e) { toast(e.message, 'error')}
}

function showReceipt(id) {
  const o = DB.getOrders().find(x => x.id === id);
  if (!o) return;
  const currencySymbol = DB.getCurrency().split('|')[1] || '$';
  const afterDiscount = parseFloat(o.subtotal) - parseFloat(o.discount);
  const orderType = o.deliveryName === 'Walk-in Customer' || !o.deliveryName ? 'Dine-in / Takeaway' : 'Delivery';
  const logoUrl = resolveAppAssetUrl(BRAND_LOGO_PATH);
  const html = `
    <div id="print-area" style="font-family:'Courier New',monospace;color:#111;background:#fff;padding:24px;border-radius:10px;max-width:440px;margin:0 auto;font-size:14px;line-height:1.5;border:1px solid #ece7dc;">
      <div style="text-align:center; margin-bottom:16px;">
        <img src="${logoUrl}" alt="Punjabi Cafe Logo" style="height:130px; margin-bottom:12px; object-fit:contain;">
        <h2 style="margin:0;font-size:24px;">Punjabi Cafe</h2>
        <div style="color:#555">Order Receipt</div>
        <div style="margin-top:10px;font-size:16px;letter-spacing:2px;"><strong>RECEIPT</strong></div>
      </div>
      <hr style="border-top:1px dashed #000; margin:10px 0;">
      <div><strong>Order:</strong> #${o.id.slice(-6).toUpperCase()}</div>
      <div><strong>Date:</strong> ${new Date(o.createdAt).toLocaleString()}</div>
      <div><strong>Customer:</strong> ${o.customerName || 'Walk-in'}</div>
      ${o.phone ? `<div><strong>Phone:</strong> ${o.phone}</div>` : ''}
      ${o.address && o.address !== 'In-store' ? `<div><strong>Address:</strong> ${o.address}</div>` : ''}
      <div><strong>Type:</strong> ${orderType}</div>
      ${o.cashierName ? `<div><strong>Cashier:</strong> ${o.cashierName}</div>` : ''}
      <hr style="border-top:1px dashed #000; margin:10px 0;">
      <table style="width:100%; text-align:left; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #ccc;">
          <th style="padding-bottom:6px;text-align:left;">Item</th>
          <th style="padding-bottom:6px;text-align:center;">Qty</th>
          <th style="padding-bottom:6px;text-align:right;">Price</th>
          <th style="padding-bottom:6px;text-align:right;">Total</th>
        </tr>
        ${o.items.map(i => `
          <tr>
            <td style="padding:4px 0;">${i.name}</td>
            <td style="text-align:center;padding:4px 0;">x${i.qty}</td>
            <td style="text-align:right;padding:4px 0;">${currencySymbol}${parseFloat(i.price).toFixed(2)}</td>
            <td style="text-align:right;padding:4px 0;">${currencySymbol}${parseFloat(i.price * i.qty).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <hr style="border-top:1px dashed #000; margin:10px 0;">
      <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${currencySymbol}${parseFloat(o.subtotal).toFixed(2)}</span></div>
      ${o.discount > 0 ? `<div style="display:flex; justify-content:space-between; color:#c0392b;"><span>Discount${o.couponCode ? ' (' + o.couponCode + ')' : ''}:</span><span>-${currencySymbol}${parseFloat(o.discount).toFixed(2)}</span></div>` : ''}
      ${o.discount > 0 ? `<div style="display:flex; justify-content:space-between; font-weight:600;"><span>After Discount:</span><span>${currencySymbol}${afterDiscount.toFixed(2)}</span></div>` : ''}
      ${o.delivery > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Delivery Fee:</span><span>${currencySymbol}${parseFloat(o.delivery).toFixed(2)}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between;"><span>Tax:</span><span>${currencySymbol}${parseFloat(o.tax).toFixed(2)}</span></div>
      <hr style="border-top:2px solid #000; margin:10px 0;">
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:18px;"><span>TOTAL:</span><span>${currencySymbol}${parseFloat(o.total).toFixed(2)}</span></div>
      <div style="text-align:center; margin-top:20px; font-size:12px;">
        <div>Paid via: ${o.paymentMethod}</div>
        <div style="margin-top:4px; font-weight:bold;">*** ${o.paid ? 'PAID' : 'PAYMENT PENDING'} ***</div>
        <div style="margin-top:16px; font-style:italic;">Thank you for dining with us!</div>
        <div style="margin-top:4px; font-weight:700;">Punjabi Cafe</div>
        <div style="margin-top:4px;">50A, Civic Centre, E Block Gulshan-e-Ravi, Lahore</div>
        <div style="margin-top:4px;">03000745672</div>
      </div>
    </div>
    <div style="text-align:center; margin-top:16px;">
      <button class="btn-primary" onclick="printReceipt()"><i class="fas fa-print"></i> Print Receipt</button>
    </div>
  `;
  showModal('Receipt', html);
}

function printReceipt() {
  const content = document.getElementById('print-area').innerHTML;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Please allow pop-ups to print the receipt.', 'error');
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { margin: 0; padding: 24px; background: #f5f5f5; }
          #print-area { box-shadow: none !important; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
