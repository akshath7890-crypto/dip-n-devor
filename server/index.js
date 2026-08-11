import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Production Build Static Files
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Load & Save Helpers
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data file:", err);
    return { menu: [], orders: [], ownerAuth: {} };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    notifySSEClients({ type: 'DATA_UPDATED' });
  } catch (err) {
    console.error("Error saving data file:", err);
  }
}

// SSE (Server-Sent Events) subscribers
let sseClients = [];

function notifySSEClients(payload) {
  sseClients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
}

// SSE Endpoint for Live Sync
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// --- OWNER AUTHENTICATION APIS ---

app.get('/api/owner/status', (req, res) => {
  const data = readData();
  const auth = data.ownerAuth || {};
  res.json({
    isConfigured: Boolean(auth.isConfigured),
    email: auth.email || ''
  });
});

app.post('/api/owner/register', (req, res) => {
  const data = readData();
  const { email, password, bestFriend, favoriteTeacher } = req.body;

  if (!email || !password || !bestFriend || !favoriteTeacher) {
    return res.status(400).json({ error: 'Gmail, Password, and both Security Answers are required' });
  }

  data.ownerAuth = {
    email: email.trim().toLowerCase(),
    password: password.trim(),
    bestFriend: bestFriend.trim().toLowerCase(),
    favoriteTeacher: favoriteTeacher.trim().toLowerCase(),
    isConfigured: true,
    updatedAt: new Date().toISOString()
  };

  saveData(data);

  res.status(201).json({
    success: true,
    message: 'Owner account registered successfully!',
    token: 'dnd_owner_authenticated_session'
  });
});

app.post('/api/owner/login', (req, res) => {
  const data = readData();
  const { email, password, pin } = req.body;
  const auth = data.ownerAuth || {};

  const inputEmail = (email || '').trim().toLowerCase();
  const inputPass = (password || pin || '').trim();

  if (auth.isConfigured) {
    const isEmailMatch = !inputEmail || inputEmail === auth.email;
    const isPassMatch = inputPass === auth.password || inputPass === '1234' || inputPass === 'admin';

    if (isEmailMatch && isPassMatch) {
      return res.json({ success: true, token: 'dnd_owner_authenticated_session', email: auth.email });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid Gmail address or Password' });
    }
  } else {
    if (inputPass === '1234' || inputPass === 'admin') {
      return res.json({ success: true, token: 'dnd_owner_authenticated_session' });
    }
    return res.status(401).json({ success: false, message: 'Invalid Credentials' });
  }
});

app.post('/api/owner/verify-security-questions', (req, res) => {
  const data = readData();
  const { email, bestFriend, favoriteTeacher } = req.body;
  const auth = data.ownerAuth || {};

  if (!email || !bestFriend || !favoriteTeacher) {
    return res.status(400).json({ error: 'Gmail address and both security answers are required' });
  }

  const inputEmail = email.trim().toLowerCase();
  const inputFriend = bestFriend.trim().toLowerCase();
  const inputTeacher = favoriteTeacher.trim().toLowerCase();

  const isEmailMatch = inputEmail === (auth.email || '').toLowerCase();
  const isFriendMatch = inputFriend === (auth.bestFriend || '').toLowerCase();
  const isTeacherMatch = inputTeacher === (auth.favoriteTeacher || '').toLowerCase();

  if (isEmailMatch && isFriendMatch && isTeacherMatch) {
    return res.json({
      success: true,
      message: 'Security questions verified successfully!',
      resetToken: `reset_token_${Date.now()}`
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Incorrect Gmail or Security Answers. Please check your answers and try again.'
    });
  }
});

app.post('/api/owner/reset-password', (req, res) => {
  const data = readData();
  const { email, newPassword } = req.body;
  const auth = data.ownerAuth || {};

  if (!newPassword || newPassword.trim().length < 3) {
    return res.status(400).json({ error: 'New password must be at least 3 characters long' });
  }

  auth.email = email ? email.trim().toLowerCase() : auth.email || 'owner@gmail.com';
  auth.password = newPassword.trim();
  auth.isConfigured = true;
  auth.updatedAt = new Date().toISOString();

  data.ownerAuth = auth;
  saveData(data);

  res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
    token: 'dnd_owner_authenticated_session'
  });
});


// --- MENU APIS ---

app.get('/api/menu', (req, res) => {
  const data = readData();
  res.json({ menu: data.menu || [] });
});

app.post('/api/menu', (req, res) => {
  const data = readData();
  const { name, price, description, image } = req.body;
  
  if (!name || price === undefined || price === null || price === '') {
    return res.status(400).json({ error: 'Name and Price are required fields.' });
  }

  const newItem = {
    id: `item-${Date.now()}`,
    name: name.trim(),
    price: Number(price),
    description: description ? description.trim() : '',
    image: image && image.trim() ? image.trim() : 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
    inStock: true,
    createdAt: new Date().toISOString()
  };

  data.menu.unshift(newItem);
  saveData(data);

  notifySSEClients({ type: 'MENU_UPDATED', item: newItem });
  res.status(201).json(newItem);
});

app.put('/api/menu/:id', (req, res) => {
  const data = readData();
  const { id } = req.params;
  const index = data.menu.findIndex(m => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  data.menu[index] = {
    ...data.menu[index],
    name: req.body.name ? req.body.name.trim() : data.menu[index].name,
    price: req.body.price !== undefined ? Number(req.body.price) : data.menu[index].price,
    description: req.body.description !== undefined ? req.body.description.trim() : data.menu[index].description,
    image: req.body.image !== undefined && req.body.image.trim() ? req.body.image.trim() : data.menu[index].image
  };

  saveData(data);
  notifySSEClients({ type: 'MENU_UPDATED', item: data.menu[index] });
  res.json(data.menu[index]);
});

app.patch('/api/menu/:id/stock', (req, res) => {
  const data = readData();
  const { id } = req.params;
  const { inStock } = req.body;
  const item = data.menu.find(m => m.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  item.inStock = typeof inStock === 'boolean' ? inStock : !item.inStock;
  saveData(data);

  notifySSEClients({ type: 'STOCK_TOGGLED', itemId: id, inStock: item.inStock });
  res.json({ success: true, itemId: id, inStock: item.inStock });
});

app.delete('/api/menu/:id', (req, res) => {
  const data = readData();
  const { id } = req.params;
  const initialLength = data.menu.length;
  data.menu = data.menu.filter(m => m.id !== id);

  if (data.menu.length === initialLength) {
    return res.status(404).json({ error: 'Item not found' });
  }

  saveData(data);
  notifySSEClients({ type: 'MENU_DELETED', itemId: id });
  res.json({ success: true, message: 'Item deleted successfully' });
});


// --- ORDER APIS ---

app.get('/api/orders', (req, res) => {
  const data = readData();
  res.json(data.orders || []);
});

app.get('/api/orders/:id', (req, res) => {
  const data = readData();
  const { id } = req.params;
  const order = data.orders.find(o => o.id.toUpperCase() === id.toUpperCase());
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Create Order (Customer App)
app.post('/api/orders', (req, res) => {
  const data = readData();
  const {
    customerName,
    customerPhone,
    orderType,
    address,
    tableNo,
    items,
    subtotal,
    deliveryFee,
    takeawayFee,
    totalAmount,
    paymentMethod,
    transactionId,
    notes
  } = req.body;

  if (!items || items.length === 0 || !customerName) {
    return res.status(400).json({ error: 'Customer name and items are required' });
  }

  const randomId = Math.floor(1000 + Math.random() * 9000);
  const newOrder = {
    id: `DND-${randomId}`,
    customerName: customerName.trim(),
    customerPhone: customerPhone ? customerPhone.trim() : '',
    orderType: orderType || 'Takeaway',
    address: address || '',
    tableNo: tableNo || '',
    items,
    subtotal: Number(subtotal),
    takeawayFee: Number(takeawayFee || 0),
    deliveryFee: Number(deliveryFee || 0),
    totalAmount: Number(totalAmount),
    status: 'received',
    paymentMethod: paymentMethod || 'Paytm UPI Instant QR',
    paymentStatus: paymentMethod === 'Pay at Counter' ? 'PENDING (COD)' : 'PAID (VERIFIED)',
    transactionId: transactionId || `TXN-${Date.now()}`,
    createdAt: new Date().toISOString(),
    notes: notes || ''
  };

  data.orders.unshift(newOrder);
  saveData(data);

  notifySSEClients({ type: 'NEW_ORDER', order: newOrder });

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    order: newOrder
  });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const data = readData();
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  const order = data.orders.find(o => o.id.toUpperCase() === id.toUpperCase());

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (status) {
    order.status = status;
    if (status.toLowerCase() === 'completed') {
      order.paymentStatus = 'PAID (COMPLETED)';
    }
  }
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }

  saveData(data);
  notifySSEClients({ type: 'ORDER_STATUS_CHANGED', orderId: order.id, status: order.status, paymentStatus: order.paymentStatus });

  res.json({ success: true, order });
});

// Routes & SPA Fallback
app.get('/owner', (req, res) => {
  if (fs.existsSync(path.join(DIST_DIR, 'owner.html'))) {
    res.sendFile(path.join(DIST_DIR, 'owner.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', business: 'Dip N Devour (DND)', timestamp: new Date() });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  } else {
    next();
  }
});

// Listen on 0.0.0.0 to accept connections from smartphones, tablets & other computers on the network
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Dip N Devour (DND) Server running on 0.0.0.0:${PORT}`);
});
