const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambia-esta-clave-super-segura';
const DATA_FILE = path.join(__dirname, 'data', 'site.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 8 }
  })
);

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('No se encontró data/site.json');
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(items) {
  return items.length ? Math.max(...items.map(item => item.id)) + 1 : 1;
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/admin/login');
  next();
}

function verifyPassword(user, plainPassword) {
  if (user.password_hash.startsWith('PLAINTEXT:')) {
    return plainPassword === user.password_hash.replace('PLAINTEXT:', '');
  }
  return bcrypt.compareSync(plainPassword, user.password_hash);
}

function setPassword(user, plainPassword) {
  user.password_hash = bcrypt.hashSync(plainPassword, 10);
}

function getPublicData() {
  const data = readData();
  const today = new Date().toISOString().slice(0, 10);
  const events = data.events
    .filter(item => item.visible && item.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const producers = data.producers
    .filter(item => item.visible)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const socials = [...data.socials].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return { settings: data.settings, socials, events, producers };
}

app.get('/', (req, res) => {
  res.render('index', { ...getPublicData() });
});

app.get('/admin/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const data = readData();
  const { username, password } = req.body;
  const user = data.users.find(item => item.username === username);
  if (!user || !verifyPassword(user, password)) {
    return res.status(401).render('login', { error: 'Usuario o contraseña incorrectos.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/admin');
});

app.post('/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAuth, (req, res) => {
  const data = readData();
  res.render('admin', {
    settings: data.settings,
    socials: [...data.socials].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    events: [...data.events].sort((a, b) => a.event_date.localeCompare(b.event_date) || b.id - a.id),
    producers: [...data.producers].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    username: req.session.username,
    message: req.query.message || ''
  });
});

app.post('/admin/settings', requireAuth, (req, res) => {
  const data = readData();
  data.settings = {
    site_title: req.body.site_title,
    hero_text: req.body.hero_text,
    intro_text: req.body.intro_text,
    whatsapp_number: (req.body.whatsapp_number || '').replace(/\D/g, ''),
    whatsapp_message: req.body.whatsapp_message || 'Hola, quiero información sobre conciertos.'
  };
  writeData(data);
  res.redirect('/admin?message=Configuración actualizada');
});

app.post('/admin/password', requireAuth, (req, res) => {
  const data = readData();
  const user = data.users.find(item => item.id === req.session.userId);
  if (!verifyPassword(user, req.body.current_password)) {
    return res.redirect('/admin?message=La contraseña actual no coincide');
  }
  setPassword(user, req.body.new_password);
  writeData(data);
  res.redirect('/admin?message=Contraseña actualizada');
});

app.post('/admin/socials', requireAuth, (req, res) => {
  const data = readData();
  data.socials.push({
    id: nextId(data.socials),
    platform: req.body.platform,
    url: req.body.url,
    handle: req.body.handle,
    sort_order: Number(req.body.sort_order || 0)
  });
  writeData(data);
  res.redirect('/admin?message=Red social agregada');
});

app.post('/admin/socials/:id/update', requireAuth, (req, res) => {
  const data = readData();
  const item = data.socials.find(row => row.id === Number(req.params.id));
  Object.assign(item, {
    platform: req.body.platform,
    url: req.body.url,
    handle: req.body.handle,
    sort_order: Number(req.body.sort_order || 0)
  });
  writeData(data);
  res.redirect('/admin?message=Red social actualizada');
});

app.post('/admin/socials/:id/delete', requireAuth, (req, res) => {
  const data = readData();
  data.socials = data.socials.filter(row => row.id !== Number(req.params.id));
  writeData(data);
  res.redirect('/admin?message=Red social eliminada');
});

app.post('/admin/events', requireAuth, (req, res) => {
  const data = readData();
  data.events.push({
    id: nextId(data.events),
    title: req.body.title,
    event_date: req.body.event_date,
    venue: req.body.venue,
    city: req.body.city,
    producer_name: req.body.producer_name,
    producer_instagram: req.body.producer_instagram,
    source_post_url: req.body.source_post_url,
    ticket_url: req.body.ticket_url,
    notes: req.body.notes,
    visible: !!req.body.visible
  });
  writeData(data);
  res.redirect('/admin?message=Evento agregado');
});

app.post('/admin/events/:id/update', requireAuth, (req, res) => {
  const data = readData();
  const item = data.events.find(row => row.id === Number(req.params.id));
  Object.assign(item, {
    title: req.body.title,
    event_date: req.body.event_date,
    venue: req.body.venue,
    city: req.body.city,
    producer_name: req.body.producer_name,
    producer_instagram: req.body.producer_instagram,
    source_post_url: req.body.source_post_url,
    ticket_url: req.body.ticket_url,
    notes: req.body.notes,
    visible: !!req.body.visible
  });
  writeData(data);
  res.redirect('/admin?message=Evento actualizado');
});

app.post('/admin/events/:id/delete', requireAuth, (req, res) => {
  const data = readData();
  data.events = data.events.filter(row => row.id !== Number(req.params.id));
  writeData(data);
  res.redirect('/admin?message=Evento eliminado');
});

app.post('/admin/producers', requireAuth, (req, res) => {
  const data = readData();
  data.producers.push({
    id: nextId(data.producers),
    name: req.body.name,
    instagram_url: req.body.instagram_url,
    category: req.body.category,
    notes: req.body.notes,
    visible: !!req.body.visible,
    logo: req.body.logo
  });
  writeData(data);
  res.redirect('/admin?message=Productora agregada');
});

app.post('/admin/producers/:id/update', requireAuth, (req, res) => {
  const data = readData();
  const item = data.producers.find(row => row.id === Number(req.params.id));
  Object.assign(item, {
    name: req.body.name,
    instagram_url: req.body.instagram_url,
    category: req.body.category,
    notes: req.body.notes,
    logo: req.body.logo,
    visible: !!req.body.visible
  });
  writeData(data);
  res.redirect('/admin?message=Productora actualizada');
});

app.post('/admin/producers/:id/delete', requireAuth, (req, res) => {
  const data = readData();
  data.producers = data.producers.filter(row => row.id !== Number(req.params.id));
  writeData(data);
  res.redirect('/admin?message=Productora eliminada');
});

app.use((req, res) => res.status(404).send('Página no encontrada'));

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
