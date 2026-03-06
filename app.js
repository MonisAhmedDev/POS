/* ============================================================
   FastBite — app.js
   All application logic: DB, Auth, Admin, Customer, Utilities
   ============================================================ */

// ===== DATABASE =====
const DB = {
  getUsers: () => JSON.parse(localStorage.getItem('fb_users') || '[]'),
  saveUsers: (d) => localStorage.setItem('fb_users', JSON.stringify(d)),
  getItems: () => JSON.parse(localStorage.getItem('fb_items') || '[]'),
  saveItems: (d) => localStorage.setItem('fb_items', JSON.stringify(d)),
  getOrders: () => JSON.parse(localStorage.getItem('fb_orders') || '[]'),
  saveOrders: (d) => localStorage.setItem('fb_orders', JSON.stringify(d)),
  getFeedback: () => JSON.parse(localStorage.getItem('fb_feedback') || '[]'),
  saveFeedback: (d) => localStorage.setItem('fb_feedback', JSON.stringify(d)),
  getCart: () => JSON.parse(localStorage.getItem('fb_cart') || '[]'),
  saveCart: (d) => localStorage.setItem('fb_cart', JSON.stringify(d)),
  clearCart: () => localStorage.removeItem('fb_cart'),
  getSession: () => JSON.parse(sessionStorage.getItem('fb_session') || 'null'),
  setSession: (u) => sessionStorage.setItem('fb_session', JSON.stringify(u)),
  clearSession: () => sessionStorage.removeItem('fb_session'),
  getCurrency: () => localStorage.getItem('fb_currency') || 'PKR|₨|Pakistani Rupee',
  saveCurrency: (v) => localStorage.setItem('fb_currency', v),

  init() {
    // Default super admin
    const users = this.getUsers();
    const existing = users.find(u => u.email === 'admin@gmail.com');
    if (!existing) {
      users.push({ id: uid(), name: 'Super Admin', email: 'admin@gmail.com', password: '123', role: 'admin', isSuperAdmin: true, createdAt: now() });
      this.saveUsers(users);
    } else if (!existing.isSuperAdmin) {
      existing.isSuperAdmin = true;
      this.saveUsers(users);
    }
    // Default menu items
    if (this.getItems().length === 0) {
      this.saveItems([
        { id: uid(), name: 'Classic Burger', category: 'Burgers', price: 8.99, description: 'Juicy beef patty with lettuce, tomato & special sauce', icon: '🍔', available: true, createdAt: now() },
        { id: uid(), name: 'Double Smash Burger', category: 'Burgers', price: 12.99, description: 'Double smashed patties, melted cheese & caramelized onions', icon: '🍔', available: true, createdAt: now() },
        { id: uid(), name: 'Crispy Chicken Burger', category: 'Burgers', price: 9.99, description: 'Crispy fried chicken fillet with coleslaw and mayo', icon: '🍗', available: true, createdAt: now() },
        { id: uid(), name: 'Zinger Burger', category: 'Burgers', price: 10.99, description: 'Spicy fried chicken with jalapeños and sriracha mayo', icon: '🔥', available: true, createdAt: now() },
        { id: uid(), name: 'Pepperoni Pizza', category: 'Pizzas', price: 14.99, description: 'Classic pepperoni on mozzarella & tomato base', icon: '🍕', available: true, createdAt: now() },
        { id: uid(), name: 'BBQ Chicken Pizza', category: 'Pizzas', price: 16.99, description: 'Smoky BBQ sauce, grilled chicken, red onion & peppers', icon: '🍕', available: true, createdAt: now() },
        { id: uid(), name: 'Margherita Pizza', category: 'Pizzas', price: 12.99, description: 'Fresh tomato, mozzarella & basil leaves', icon: '🍕', available: true, createdAt: now() },
        { id: uid(), name: 'Fried Chicken (3 pcs)', category: 'Sides', price: 7.99, description: '3 pieces of golden crispy fried chicken', icon: '🍗', available: true, createdAt: now() },
        { id: uid(), name: 'French Fries (Large)', category: 'Sides', price: 3.99, description: 'Crispy golden fries with your choice of dip', icon: '🍟', available: true, createdAt: now() },
        { id: uid(), name: 'Onion Rings', category: 'Sides', price: 4.99, description: 'Crispy beer-battered onion rings', icon: '🧅', available: true, createdAt: now() },
        { id: uid(), name: 'Chocolate Lava Cake', category: 'Desserts', price: 5.99, description: 'Warm chocolate cake with molten center & vanilla ice cream', icon: '🎂', available: true, createdAt: now() },
        { id: uid(), name: 'Ice Cream Sundae', category: 'Desserts', price: 4.49, description: 'Creamy vanilla soft serve with hot fudge & whipped cream', icon: '🍨', available: true, createdAt: now() },
        { id: uid(), name: 'Soda (Large)', category: 'Drinks', price: 2.99, description: 'Chilled fizzy drink — Coke, Pepsi, Sprite, or Fanta', icon: '🥤', available: true, createdAt: now() },
        { id: uid(), name: 'Chocolate Milkshake', category: 'Drinks', price: 4.99, description: 'Thick and creamy chocolate milkshake', icon: '🥛', available: true, createdAt: now() },
        { id: uid(), name: 'Fresh Juice', category: 'Drinks', price: 3.49, description: 'Freshly squeezed orange or mango juice', icon: '🍊', available: true, createdAt: now() },
      ]);
    }
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

function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const users = DB.getUsers();
  const user = users.find(u => u.email === email && u.password === pass);
  if (!user) { toast('Invalid email or password', 'error'); return; }
  DB.setSession(user);
  toast(`Welcome back, ${user.name}!`, 'success');
  if (user.role === 'admin') loadAdmin();
  else if (user.role === 'cashier') loadCashier();
  else loadCustomer();
}

function doSignup(e) {
  e.preventDefault();
  const name = document.getElementById('su-name').value.trim();
  const role = 'customer'; // public signup is customers only
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-pass').value;
  const confirm = document.getElementById('su-confirm').value;
  if (pass !== confirm) { toast('Passwords do not match', 'error'); return; }
  const users = DB.getUsers();
  if (users.find(u => u.email === email)) { toast('Email already registered', 'error'); return; }
  const user = { id: uid(), name, email, password: pass, role, createdAt: now() };
  users.push(user);
  DB.saveUsers(users);
  DB.setSession(user);
  toast(`Account created! Welcome, ${name}!`, 'success');
  loadCustomer();
}

function doLogout() {
  DB.clearSession();
  DB.clearCart();
  showPage('page-auth');
  showLogin();
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  toast('Logged out successfully', 'info');
}

// ===== ADMIN =====
function loadAdmin() {
  const user = DB.getSession();
  document.getElementById('admin-name').textContent = user.name;
  document.getElementById('admin-avatar').textContent = user.name[0].toUpperCase();
  showPage('page-admin');
  adminNav('dashboard');
}

function adminNav(sec) {
  ['dashboard', 'menu', 'orders', 'customers', 'feedback', 'settings'].forEach(s => {
    document.getElementById('sec-' + s).classList.toggle('active', s === sec);
    document.getElementById('sec-' + s).classList.toggle('hidden', s !== sec);
    document.getElementById('nav-' + s).classList.toggle('active', s === sec);
  });
  if (sec === 'dashboard') renderDashboard();
  if (sec === 'menu') renderAdminMenu();
  if (sec === 'orders') renderOrders();
  if (sec === 'customers') renderCustomers();
  if (sec === 'feedback') renderAdminFeedback();
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
  const cats = ['Burgers', 'Pizzas', 'Sides', 'Desserts', 'Drinks'];
  return `
    <div class="form-group"><label>Item Name</label><div class="inp-wrap"><i class="fas fa-tag"></i><input type="text" id="it-name" value="${item?.name || ''}" placeholder="e.g. Spicy Burger" required></div></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><div class="inp-wrap"><i class="fas fa-layer-group"></i><select id="it-cat">${cats.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
      <div class="form-group"><label>Price ($)</label><div class="inp-wrap"><i class="fas fa-dollar-sign"></i><input type="number" id="it-price" value="${item?.price || ''}" placeholder="9.99" step="0.01" min="0" required></div></div>
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

function saveItem(id) {
  const name = document.getElementById('it-name').value.trim();
  const cat = document.getElementById('it-cat').value;
  const price = parseFloat(document.getElementById('it-price').value);
  const desc = document.getElementById('it-desc').value.trim();
  const icon = document.getElementById('it-icon').value.trim() || '🍽️';
  const avail = document.getElementById('it-avail').value === 'true';
  const preview = document.getElementById('it-img-preview');
  const image = preview?.dataset.b64 || null;
  if (!name || isNaN(price) || price < 0) { toast('Please fill all fields correctly', 'error'); return; }
  let items = DB.getItems();
  if (id) {
    items = items.map(i => i.id === id
      ? { ...i, name, category: cat, price, description: desc, icon, available: avail, image: image !== null ? image : i.image }
      : i);
    toast('Item updated!', 'success');
  } else {
    items.push({ id: uid(), name, category: cat, price, description: desc, icon, image, available: avail, createdAt: now() });
    toast('Item added!', 'success');
  }
  DB.saveItems(items);
  closeModal();
  renderAdminMenu();
}

function deleteItem(id) {
  if (!confirm('Delete this menu item?')) return;
  DB.saveItems(DB.getItems().filter(i => i.id !== id));
  toast('Item deleted', 'info');
  renderAdminMenu();
}

function renderOrders() {
  const filter = document.getElementById('order-filter')?.value || '';
  let orders = DB.getOrders();
  if (filter) orders = orders.filter(o => o.status === filter);
  orders = [...orders].reverse();
  const tbody = document.getElementById('orders-tbody');
  if (!orders.length) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px"></i>No orders found</td></tr>`; return; }
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
        <select class="filter-select" style="font-size:.78rem;padding:6px 10px" onchange="updateOrderStatus('${o.id}',this.value)">
          <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
          <option value="Ready"     ${o.status === 'Ready' ? 'selected' : ''}    >Ready</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
    </tr>`).join('');
}

function updateOrderStatus(id, status) {
  const orders = DB.getOrders().map(o => o.id === id ? { ...o, status } : o);
  DB.saveOrders(orders);
  toast(`Order status updated to ${status}`, 'success');
  renderOrders();
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

function confirmCancelOrder(id) {
  const orders = DB.getOrders();
  DB.saveOrders(orders.map(o => o.id === id ? { ...o, status: 'Cancelled' } : o));
  closeModal();
  toast('Order cancelled successfully', 'info');
  renderCustOrders();
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
          </div>
        </div>
        <div class="cust-detail-stats">
          <div class="cust-stat"><div class="cust-stat-val">${uOrders.length}</div><div class="cust-stat-lbl">Orders</div></div>
          <div class="cust-stat"><div class="cust-stat-val" style="color:var(--yellow)">${fmtPrice(spent)}</div><div class="cust-stat-lbl">Total Spent</div></div>
          <div class="cust-stat"><div class="cust-stat-val">${uFb.length}</div><div class="cust-stat-lbl">Reviews</div></div>
        </div>
        <button class="btn-danger btn-sm" onclick="deleteCustomer('${u.id}')" style="align-self:flex-start;flex-shrink:0"><i class="fas fa-user-minus"></i> Delete</button>
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

function confirmDeleteUser(id, returnSec) {
  DB.saveUsers(DB.getUsers().filter(u => u.id !== id));
  DB.saveOrders(DB.getOrders().filter(o => o.customerId !== id));
  DB.saveFeedback(DB.getFeedback().filter(f => f.customerId !== id));
  closeModal();
  toast('Account deleted', 'info');
  adminNav(returnSec);
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

function saveNewAdmin() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add admins', 'error'); return; }
  const name = document.getElementById('na-name').value.trim();
  const email = document.getElementById('na-email').value.trim();
  const pass = document.getElementById('na-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  const users = DB.getUsers();
  if (users.find(u => u.email === email)) { toast('Email already registered', 'error'); return; }
  users.push({ id: uid(), name, email, password: pass, role: 'admin', isSuperAdmin: false, createdAt: now() });
  DB.saveUsers(users);
  closeModal();
  toast(`Admin "${name}" created!`, 'success');
  renderSettings();
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

function confirmDeleteAdmin(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can remove admins', 'error'); return; }
  const adm = DB.getUsers().find(u => u.id === id);
  if (adm?.isSuperAdmin) { toast('Chief Admin cannot be deleted', 'error'); return; }
  DB.saveUsers(DB.getUsers().filter(u => u.id !== id));
  closeModal();
  toast('Admin removed', 'info');
  renderSettings();
}

// ===== EXPORT / IMPORT / CLEAR =====
function exportData() {
  const data = {
    version: '1.0', exportedAt: now(),
    users: DB.getUsers(), items: DB.getItems(),
    orders: DB.getOrders(), feedback: DB.getFeedback()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fastbite-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Data exported! \ud83d\udcbe', 'success');
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

function confirmImport(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    DB.saveUsers(data.users || []);
    DB.saveItems(data.items || []);
    DB.saveOrders(data.orders || []);
    DB.saveFeedback(data.feedback || []);
    closeModal();
    toast('Data imported! \u2705 Reloading...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch { toast('Import failed', 'error'); }
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

function confirmClearAll() {
  ['fb_users', 'fb_items', 'fb_orders', 'fb_feedback', 'fb_cart', 'fb_session'].forEach(k => localStorage.removeItem(k));
  closeModal();
  toast('All data cleared. Reloading...', 'info');
  setTimeout(() => location.reload(), 1500);
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

function saveCustomerProfile() {
  const session = DB.getSession();
  const name = document.getElementById('ep-name').value.trim();
  const email = document.getElementById('ep-email').value.trim();
  const curPass = document.getElementById('ep-cur-pass').value;
  const newPass = document.getElementById('ep-new-pass').value;
  const conPass = document.getElementById('ep-con-pass').value;

  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (!curPass) { toast('Enter your current password to save', 'error'); return; }

  const users = DB.getUsers();
  const user = users.find(u => u.id === session.id);
  if (!user || user.password !== curPass) { toast('Current password is incorrect', 'error'); return; }

  if (newPass) {
    if (newPass.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    if (newPass !== conPass) { toast('Passwords do not match', 'error'); return; }
    user.password = newPass;
  }

  // Check email uniqueness (ignore self)
  if (users.find(u => u.email === email && u.id !== user.id)) { toast('Email already in use', 'error'); return; }

  user.name = name;
  user.email = email;
  DB.saveUsers(users);
  DB.setSession(user);
  document.getElementById('cust-name').textContent = name;
  document.getElementById('cust-avatar').textContent = name[0].toUpperCase();
  closeModal();
  toast('Profile updated! ✅', 'success');
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

function saveMyAdminProfile() {
  const session = DB.getSession();
  const name = document.getElementById('amp-name').value.trim();
  const email = document.getElementById('amp-email').value.trim();
  const curPass = document.getElementById('amp-cur').value;
  const newPass = document.getElementById('amp-new').value;
  const conPass = document.getElementById('amp-con').value;

  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (!curPass) { toast('Enter your current password to save', 'error'); return; }

  const users = DB.getUsers();
  const user = users.find(u => u.id === session.id);
  if (!user || user.password !== curPass) { toast('Current password is incorrect', 'error'); return; }

  if (newPass) {
    if (newPass.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    if (newPass !== conPass) { toast('Passwords do not match', 'error'); return; }
    user.password = newPass;
  }

  if (users.find(u => u.email === email && u.id !== user.id)) { toast('Email already in use', 'error'); return; }

  user.name = name;
  user.email = email;
  DB.saveUsers(users);
  DB.setSession(user);
  document.getElementById('admin-name').textContent = name;
  document.getElementById('admin-avatar').textContent = name[0].toUpperCase();
  closeModal();
  toast('Profile updated! ✅', 'success');
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

function saveEditAccount(id) {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can edit other accounts', 'error'); return; }
  const name = document.getElementById('ea-name').value.trim();
  const email = document.getElementById('ea-email').value.trim();
  const pass = document.getElementById('ea-pass').value;
  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (pass && pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  const users = DB.getUsers();
  const target = users.find(u => u.id === id);
  if (!target) return;
  if (users.find(u => u.email === email && u.id !== id)) { toast('Email already in use', 'error'); return; }

  target.name = name;
  target.email = email;
  if (pass) target.password = pass;
  DB.saveUsers(users);
  closeModal();
  toast(`Account updated for ${name} ✅`, 'success');
  renderSettings();
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

function saveCurrencySetting(val) {
  DB.saveCurrency(val);
  const [code, sym, name] = val.split('|');
  document.getElementById('currency-preview').innerHTML =
    `<i class="fas fa-check-circle" style="color:var(--yellow)"></i> Saved! Prices now show as <strong>${sym}12.99</strong> — ${name} (${code})`;
  toast(`Currency set to ${name} (${sym})`, 'success');
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

function saveNewCashier() {
  if (!isSuperAdmin()) { toast('Only the Chief Admin can add cashiers', 'error'); return; }
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const pass = document.getElementById('nc-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  const users = DB.getUsers();
  if (users.find(u => u.email === email)) { toast('Email already registered', 'error'); return; }
  users.push({ id: uid(), name, email, password: pass, role: 'cashier', createdAt: now() });
  DB.saveUsers(users);
  closeModal();
  toast(`Cashier "${name}" created!`, 'success');
  renderCashierAccountsList();
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

function confirmDeleteCashier(id) {
  DB.saveUsers(DB.getUsers().filter(u => u.id !== id));
  closeModal();
  toast('Cashier removed', 'info');
  renderCashierAccountsList();
}

// ===== CASHIER POS TERMINAL =====
let posCat = '';
let posCart = [];

function loadCashier() {
  const user = DB.getSession();
  document.getElementById('cashier-name').textContent = user.name;
  document.getElementById('cashier-avatar').textContent = user.name[0].toUpperCase();
  showPage('page-cashier');
  posCart = [];
  buildPosCatTabs();
  renderPosMenu();
  renderPosCart();
  renderCashierCustomersDL();
  posNav('order');
}

function buildPosCatTabs() {
  const items = DB.getItems().filter(i => i.available);
  const cats = ['', ...new Set(items.map(i => i.category))];
  const catIcons = { '': '🍽️ All', Burgers: '🍔 Burgers', Pizzas: '🍕 Pizzas', Sides: '🍟 Sides', Desserts: '🍰 Desserts', Drinks: '🥤 Drinks' };
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
  grid.innerHTML = items.map(item => `
    <div class="pos-item-card" onclick="posAddToCart('${item.id}')">
      <div class="pos-item-thumb">
        ${item.image
      ? `<img src="${item.image}" alt="${item.name}">`
      : `<span class="mc-icon-emoji">${item.icon}</span>`}
      </div>
      <div class="pos-item-name">${item.name}</div>
      <div class="pos-item-price">${fmtPrice(item.price)}</div>
      <button class="pos-add-btn"><i class="fas fa-plus"></i></button>
    </div>`).join('');
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
        ${o.status === 'Preparing' ? `<button class="btn-outline btn-sm" onclick="cashierUpdateStatus('${o.id}','Ready')"><i class="fas fa-check"></i> Mark Ready</button>` : ''}
        ${o.status === 'Ready' ? `<button class="btn-primary btn-sm" onclick="cashierUpdateStatus('${o.id}','Delivered')"><i class="fas fa-box"></i> Mark Delivered</button>` : ''}
        <button class="btn-danger btn-sm" onclick="cashierCancelOrder('${o.id}')"><i class="fas fa-times"></i> Cancel</button>
      </div>` : ''}
    </div>`).join('');
}

function cashierUpdateStatus(id, status) {
  const orders = DB.getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.status = status;
  DB.saveOrders(orders);
  toast(`Order marked as ${status}`, 'success');
  renderCashierOrders();
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

function confirmCashierCancel(id) {
  const orders = DB.getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.status = 'Cancelled';
  DB.saveOrders(orders);
  closeModal();
  toast('Order cancelled', 'info');
  renderCashierOrders();
}

function posAddToCart(itemId) {
  const item = DB.getItems().find(i => i.id === itemId);
  if (!item) return;
  const exists = posCart.find(c => c.id === itemId);
  if (exists) { exists.qty++; }
  else { posCart.push({ ...item, qty: 1 }); }
  renderPosCart();
  // brief flash on button
  toast(`${item.icon} ${item.name} added`, 'success');
}

function posUpdateQty(itemId, delta) {
  const idx = posCart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  posCart[idx].qty += delta;
  if (posCart[idx].qty <= 0) posCart.splice(idx, 1);
  renderPosCart();
}

function renderPosCart() {
  const itemsEl = document.getElementById('pos-order-items');
  const footerEl = document.getElementById('pos-order-footer');
  if (!posCart.length) {
    itemsEl.innerHTML = '<div class="pos-empty-order"><i class="fas fa-shopping-bag"></i><p>Add items from the menu</p></div>';
    footerEl.innerHTML = '';
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
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  footerEl.innerHTML = `
    <div class="pos-totals">
      <div class="pos-total-row"><span>Subtotal</span><span>${fmtPrice(subtotal)}</span></div>
      <div class="pos-total-row"><span>Tax (8%)</span><span>${fmtPrice(tax)}</span></div>
      <div class="pos-total-row pos-grand-total"><span>TOTAL</span><span>${fmtPrice(total)}</span></div>
    </div>
    <div class="pos-pay-row">
      <label style="font-size:.8rem;color:var(--text3)">Payment Method</label>
      <div class="inp-wrap" style="margin:6px 0 12px"><i class="fas fa-credit-card"></i>
        <select id="pos-payment">
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
        </select>
      </div>
    </div>
    <button class="btn-primary btn-full" onclick="placePosOrder()"><i class="fas fa-check-circle"></i> Place Order</button>
    <button class="btn-outline btn-full" style="margin-top:8px" onclick="clearPosCart()"><i class="fas fa-trash"></i> Clear Order</button>
  `;
}

function placePosOrder() {
  if (!posCart.length) { toast('Cart is empty', 'error'); return; }
  const customerName = document.getElementById('pos-customer').value.trim() || 'Walk-in Customer';
  let customerId = 'walkin';

  // Try to link to an existing customer
  const users = DB.getUsers();
  const existingCust = users.find(u => u.role === 'customer' && u.name.toLowerCase() === customerName.toLowerCase());
  if (existingCust) customerId = existingCust.id;

  const payment = document.getElementById('pos-payment')?.value || 'Cash';
  const cashier = DB.getSession();
  const subtotal = posCart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const order = {
    id: uid(),
    customerId,
    customerName,
    cashierId: cashier.id,
    cashierName: cashier.name,
    items: posCart.map(c => ({ id: c.id, name: c.name, icon: c.icon, price: c.price, qty: c.qty })),
    subtotal, tax, total,
    paymentMethod: payment,
    deliveryAddress: 'In-store',
    status: 'Preparing',
    createdAt: now()
  };
  const orders = DB.getOrders();
  orders.push(order);
  DB.saveOrders(orders);
  posCart = [];
  document.getElementById('pos-customer').value = '';
  renderPosCart();
  toast(`Order placed for ${customerName}! 🎉`, 'success');
}

function clearPosCart() {
  posCart = [];
  renderPosCart();
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

function saveCashierCustomer() {
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const pass = document.getElementById('nc-pass').value;
  if (!name || !email || pass.length < 6) { toast('Fill all fields (min 6-char password)', 'error'); return; }
  const users = DB.getUsers();
  if (users.find(u => u.email === email)) { toast('Email already registered', 'error'); return; }
  users.push({ id: uid(), name, email, password: pass, role: 'customer', createdAt: now() });
  DB.saveUsers(users);
  closeModal();
  toast(`Customer "${name}" created!`, 'success');
  renderCashierCustomersDL();
  renderCashierCustomers();
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

function saveEditCashierCustomer(id) {
  const name = document.getElementById('ecc-name').value.trim();
  const email = document.getElementById('ecc-email').value.trim();
  const pass = document.getElementById('ecc-pass').value;
  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  if (pass && pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  const users = DB.getUsers();
  const target = users.find(u => u.id === id);
  if (!target || target.role !== 'customer') return;
  if (users.find(u => u.email === email && u.id !== id)) { toast('Email already in use', 'error'); return; }

  target.name = name;
  target.email = email;
  if (pass) target.password = pass;
  DB.saveUsers(users);
  closeModal();
  toast(`Customer updated: ${name} ✅`, 'success');
  renderCashierCustomersDL();
  renderCashierCustomers();
}

// ===== CUSTOMER =====

let activeCat = '';

function loadCustomer() {
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
  grid.innerHTML = items.map(i => `
    <div class="cust-card">
      <div class="mc-thumb">${i.image ? `<img src="${i.image}" alt="${i.name}">` : `<span class="mc-icon-emoji">${i.icon}</span>`}</div>
      <div class="mc-name">${i.name}</div>
      <div class="mc-cat">${i.category}</div>
      <div class="mc-desc">${i.description}</div>
      <div class="cust-card-footer">
        <div class="mc-price">${fmtPrice(i.price)}</div>
        <button class="add-cart-btn" onclick="addToCart('${i.id}')" title="Add to cart"><i class="fas fa-plus"></i></button>
      </div>
    </div>`).join('');
}

function addToCart(itemId) {
  const item = DB.getItems().find(i => i.id === itemId);
  if (!item) return;
  const cart = DB.getCart();
  const ex = cart.find(c => c.id === itemId);
  if (ex) ex.qty++;
  else cart.push({ id: item.id, name: item.name, price: item.price, category: item.category, icon: item.icon, qty: 1 });
  DB.saveCart(cart);
  updateCartBadge();
  toast(`${item.name} added to cart!`, 'success');
}

function updateCartBadge() {
  const total = DB.getCart().reduce((s, c) => s + c.qty, 0);
  document.getElementById('cart-count').textContent = total;
}

function renderCart() {
  const cart = DB.getCart();
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

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal > 0 ? 1.99 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + delivery + tax;

  document.getElementById('cart-summary-lines').innerHTML = `
    <div class="summary-line"><span>Subtotal</span><span>${fmtPrice(subtotal)}</span></div>
    <div class="summary-line"><span>Delivery Fee</span><span>${fmtPrice(delivery)}</span></div>
    <div class="summary-line"><span>Tax (8%)</span><span>${fmtPrice(tax)}</span></div>
  `;
  document.getElementById('cart-total').innerHTML = `<span>Total</span><span>${fmtPrice(total)}</span>`;
}

function changeQty(id, delta) {
  let cart = DB.getCart();
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  DB.saveCart(cart);
  updateCartBadge();
  renderCart();
}

function removeCartItem(id) {
  DB.saveCart(DB.getCart().filter(c => c.id !== id));
  updateCartBadge();
  renderCart();
  toast('Item removed from cart', 'info');
}

function renderCheckout() {
  const user = DB.getSession();
  document.getElementById('co-name').value = user.name;
  const cart = DB.getCart();
  if (!cart.length) { custNav('cart'); return; }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = 1.99;
  const tax = subtotal * 0.08;
  const total = subtotal + delivery + tax;

  document.getElementById('co-items').innerHTML = [
    ...cart.map(c => `<div class="co-item-row"><span>${c.icon} ${c.name} ×${c.qty}</span><span>${fmtPrice(c.price * c.qty)}</span></div>`),
    `<div class="co-item-row"><span>Delivery</span><span>${fmtPrice(delivery)}</span></div>`,
    `<div class="co-item-row"><span>Tax</span><span>${fmtPrice(tax)}</span></div>`
  ].join('');
  document.getElementById('co-total').innerHTML = `<span>Total</span><span>${fmtPrice(total)}</span>`;
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

function placeOrder() {
  const user = DB.getSession();
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
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = 1.99;
  const tax = subtotal * 0.08;
  const total = subtotal + delivery + tax;

  const order = {
    id: uid(), customerId: user.id, customerName: user.name,
    items: cart.map(c => ({ itemId: c.id, name: c.name, icon: c.icon, price: c.price, qty: c.qty })),
    subtotal, delivery, tax, total, paymentMethod: payMethod,
    deliveryName: name, phone, address, status: 'Preparing', createdAt: now()
  };
  const orders = DB.getOrders();
  orders.push(order);
  DB.saveOrders(orders);
  DB.clearCart();
  updateCartBadge();

  toast('Order placed successfully! 🎉', 'success');
  custNav('orders');
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
      <div style="margin-top:10px;font-size:.8rem;color:var(--text3)">
        <i class="fas fa-${o.paymentMethod === 'Cash' ? 'money-bill-wave' : 'credit-card'}"></i> ${o.paymentMethod} &nbsp;·&nbsp;
        <i class="fas fa-map-marker-alt"></i> ${o.address}
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

function submitFeedback() {
  const user = DB.getSession();
  const orderId = document.getElementById('fb-order').value;
  const comment = document.getElementById('fb-comment').value.trim();
  if (!orderId) { toast('Please select an order', 'error'); return; }
  if (!currentRating) { toast('Please select a rating', 'error'); return; }
  const order = DB.getOrders().find(o => o.id === orderId);
  const fb = DB.getFeedback();
  fb.push({ id: uid(), customerId: user.id, customerName: user.name, orderId, orderRef: '#' + orderId.slice(-6).toUpperCase(), rating: currentRating, comment, createdAt: now() });
  DB.saveFeedback(fb);
  toast('Thank you for your feedback! ⭐', 'success');
  document.getElementById('fb-comment').value = '';
  renderCustFeedback();
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  const session = DB.getSession();
  if (session) {
    if (session.role === 'admin') loadAdmin();
    else loadCustomer();
  } else {
    showPage('page-auth');
  }

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
});
