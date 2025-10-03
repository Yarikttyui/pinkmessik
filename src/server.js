const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const { body, query, param, validationResult } = require('express-validator');
const { Server } = require('socket.io');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const dayjs = require('dayjs');
const { initDb, getPool, withTransaction } = require('./db');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const pool = getPool();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'],
  video: ['video/webm', 'video/mp4', 'video/quicktime']
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuid().replace(/-/g, '')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'));
    }
  }
});

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));
app.use(express.static(path.join(process.cwd(), 'public')));

const USER_PALETTE = ['#ff8fab', '#ffb3c6', '#ff7aa2', '#ff4d6d', '#f72585', '#f48fb1', '#d946ef', '#fb7185'];

function pickAvatarColor() {
  return USER_PALETTE[Math.floor(Math.random() * USER_PALETTE.length)];
}

function tokenForUser(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '14d' });
}

function validationProblem(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Данные заполнены неверно', errors: errors.array() });
  }
  return next();
}

async function generateUserCode() {
  while (true) {
    const candidate = `U${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const [rows] = await pool.query('SELECT id FROM users WHERE public_id = ? LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
  }
}

async function generateConversationCode() {
  while (true) {
    const candidate = `C${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const [rows] = await pool.query('SELECT id FROM conversations WHERE share_code = ? LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
  }
}

async function findUserByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, public_id, username, password_hash, display_name, avatar_color, status_message, avatar_url, bio, last_seen FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

async function findUserByPublicId(publicId) {
  const [rows] = await pool.query(
    'SELECT id, public_id, username, display_name, avatar_color, status_message, avatar_url, bio, last_seen FROM users WHERE public_id = ? LIMIT 1',
    [publicId]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, public_id, username, display_name, avatar_color, status_message, avatar_url, bio, last_seen FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url || null,
    statusMessage: row.status_message,
    bio: row.bio,
    lastSeen: row.last_seen
  };
}

function mapConversation(row) {
  const lastMessage = safeJsonParse(row.last_message);
  return {
    id: row.id,
    shareCode: row.share_code,
    type: row.type,
    title: row.title,
    description: row.description,
    isPrivate: Boolean(row.is_private),
    creatorId: row.creator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage,
    unreadCount: row.unread_count ? Number(row.unread_count) : 0
  };
}
function mapAttachment(row) {
  if (!row) return null;
  return normalizeAttachment({
    id: row.id,
    stored_name: row.stored_name,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size: row.size,
    kind: row.kind,
    is_circle: row.is_circle,
    duration_ms: row.duration_ms,
    waveform: row.waveform,
    file_type: row.file_type
  });
}

function normalizeAttachment(payload) {
  if (!payload) return null;
  const mimeType = payload.mimeType || payload.mime_type || '';
  const waveform = payload.waveform ? safeJsonParse(payload.waveform) : null;
  const durationRaw = payload.durationMs ?? payload.duration_ms;
  const parsedDuration = Number(durationRaw);
  const durationMs = Number.isFinite(parsedDuration) && parsedDuration >= 0 ? parsedDuration : null;
  return {
    id: payload.id,
    url: payload.url || (payload.stored_name ? `/uploads/${payload.stored_name}` : null),
    originalName: payload.originalName || payload.file_name || null,
    mimeType,
    size: payload.size ?? payload.file_size ?? null,
    kind: payload.kind || detectAttachmentKind(mimeType),
    isCircle: Boolean(payload.isCircle ?? payload.is_circle ?? false),
    durationMs,
    waveform,
    fileType: payload.fileType || payload.file_type || null
  };
}

function mapMessage(row, currentUserId) {
  const attachmentsRaw = safeJsonParse(row.attachments, []);
  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((item) => normalizeAttachment(item)).filter(Boolean)
    : [];
  const reactions = safeJsonParse(row.reactions, []);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    user: {
      id: row.user_id,
      publicId: row.public_id,
      username: row.username,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      avatarUrl: row.avatar_url
    },
    content: row.deleted_at ? null : row.content,
    attachments,
    parentId: row.parent_id,
    isEdited: Boolean(row.is_edited),
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    reactions: reactions.map((reaction) => ({
      emoji: reaction.emoji,
      count: reaction.count,
      reacted: reaction.userIds.includes(currentUserId)
    }))
  };
}

function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Failed to parse JSON value', error);
      return fallback;
    }
  }
  return fallback;
}

async function fetchConversationMembers(conversationId) {
  const [rows] = await pool.query(
    `SELECT cm.user_id, cm.role, u.public_id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.status_message, u.bio, u.last_seen
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = ?
     ORDER BY u.display_name`,
    [conversationId]
  );
  return rows.map((row) => ({
    id: row.user_id,
    publicId: row.public_id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
    statusMessage: row.status_message,
    bio: row.bio,
    role: row.role,
    lastSeen: row.last_seen
  }));
}

async function fetchConversationList(userId) {
  const [rows] = await pool.query(
    `SELECT c.*, json_object('id', m.id, 'content', m.content, 'createdAt', m.created_at,
      'user', json_object('id', u.id, 'publicId', u.public_id, 'displayName', u.display_name, 'username', u.username, 'avatarUrl', u.avatar_url, 'avatarColor', u.avatar_color)) AS last_message,
            IFNULL(uc.unread_count, 0) AS unread_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     LEFT JOIN (
       SELECT m1.conversation_id, m1.id, m1.content, m1.created_at, m1.user_id
       FROM messages m1
       JOIN (
         SELECT conversation_id, MAX(created_at) AS created_at
         FROM messages
         GROUP BY conversation_id
       ) lm ON lm.conversation_id = m1.conversation_id AND lm.created_at = m1.created_at
     ) m ON m.conversation_id = c.id
  LEFT JOIN users u ON u.id = m.user_id
     LEFT JOIN (
       SELECT m.conversation_id,
              SUM(CASE WHEN cm.last_read_at IS NULL OR m.created_at > cm.last_read_at THEN 1 ELSE 0 END) AS unread_count
       FROM messages m
       JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?
       GROUP BY m.conversation_id
     ) uc ON uc.conversation_id = c.id
     WHERE cm.user_id = ?
     ORDER BY c.updated_at DESC, c.id DESC`,
    [userId, userId]
  );

  return rows.map(mapConversation);
}

async function fetchConversationById(conversationId) {
  const [rows] = await pool.query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
  return rows[0] || null;
}

async function ensureMembership(conversationId, userId) {
  const [rows] = await pool.query(
    'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1',
    [conversationId, userId]
  );
  return rows[0] || null;
}

async function fetchMessageById(messageId, currentUserId) {
  const [rows] = await pool.query(
    `SELECT m.*, u.public_id, u.username, u.display_name, u.avatar_color, u.avatar_url,
            (
              SELECT JSON_ARRAYAGG(JSON_OBJECT('emoji', emoji, 'userIds', user_ids, 'count', cnt))
              FROM (
                SELECT emoji,
                       COUNT(*) AS cnt,
                       JSON_ARRAYAGG(user_id) AS user_ids
                FROM message_reactions
                WHERE message_id = m.id
                GROUP BY emoji
              ) r
            ) AS reactions
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.id = ?
     LIMIT 1`,
    [messageId]
  );
  return rows[0] ? mapMessage(rows[0], currentUserId) : null;
}

async function fetchMessages(conversationId, currentUserId, options = {}) {
  const limit = Math.min(Number(options.limit) || 30, 200);
  const beforeId = options.before ? Number(options.before) : null;
  const params = [conversationId];
  let condition = '';
  if (beforeId) {
    condition = 'AND m.id < ?';
    params.push(beforeId);
  }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT m.*, u.public_id, u.username, u.display_name, u.avatar_color, u.avatar_url,
            (
              SELECT JSON_ARRAYAGG(JSON_OBJECT('emoji', emoji, 'userIds', user_ids, 'count', cnt))
              FROM (
                SELECT emoji, COUNT(*) AS cnt, JSON_ARRAYAGG(user_id) AS user_ids
                FROM message_reactions
                WHERE message_id = m.id
                GROUP BY emoji
              ) r
            ) AS reactions
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ? ${condition}
     ORDER BY m.id DESC
     LIMIT ?`,
    params
  );
  return rows.reverse().map((row) => mapMessage(row, currentUserId));
}

async function updateConversationTimestamp(conversationId) {
  await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
}

async function attachFiles(userId, attachmentIds = []) {
  if (!attachmentIds.length) return [];
  const [rows] = await pool.query(
    `SELECT * FROM attachments WHERE id IN (?) AND user_id = ?`,
    [attachmentIds, userId]
  );
  return rows.map(mapAttachment);
}

function emitToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach((socket) => socket.emit(event, payload));
}

function joinUserToConversationSockets(userId, conversationId) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach((socket) => {
    if (!socket.data.conversations) {
      socket.data.conversations = new Set();
    }
    if (!socket.data.conversations.has(conversationId)) {
      socket.data.conversations.add(conversationId);
    }
    socket.join(`conversation:${conversationId}`);
  });
}

function leaveUserFromConversationSockets(userId, conversationId) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach((socket) => {
    socket.leave(`conversation:${conversationId}`);
    socket.data.conversations?.delete(conversationId);
  });
}

async function emitConversationUpdate(conversationId, userIds = null) {
  let targets = userIds;
  if (!targets || !targets.length) {
    const members = await fetchConversationMembers(conversationId);
    targets = members.map((member) => member.id);
  }
  await Promise.all(
    targets.map(async (userId) => {
      const conversations = await fetchConversationList(userId);
      emitToUser(userId, 'conversation:list', conversations);
    })
  );
}

async function markConversationRead(conversationId, userId) {
  await pool.query(
    'UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
    [conversationId, userId]
  );
}

function isAllowedMimeType(mimeType) {
  const base = (mimeType || '').split(';')[0];
  return Object.values(ALLOWED_MIME_TYPES).some((group) => group.includes(base));
}

function detectAttachmentKind(mimeType) {
  const base = (mimeType || '').split(';')[0];
  if (ALLOWED_MIME_TYPES.image.includes(base)) return 'image';
  if (ALLOWED_MIME_TYPES.audio.includes(base)) return 'audio';
  if (ALLOWED_MIME_TYPES.video.includes(base)) return 'video';
  return 'file';
}

function tryStringifyWaveform(raw) {
  if (!raw) return null;
  try {
    if (Array.isArray(raw)) {
      return JSON.stringify(raw.slice(0, 256));
    }
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.slice(0, 256));
      }
      return raw;
    }
    if (typeof raw === 'object') {
      if (Array.isArray(raw.values)) {
        return JSON.stringify(raw.values.slice(0, 256));
      }
      return JSON.stringify(raw);
    }
  } catch (error) {
    console.warn('Failed to stringify waveform', error);
  }
  return null;
}

function authGuard(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = { id: payload.id };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный или истекший токен' });
  }
}
app.post(
  '/api/register',
  body('username').isLength({ min: 3, max: 32 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Разрешены латинские буквы, цифры и знак подчёркивания'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не короче 6 символов'),
  validationProblem,
  async (req, res) => {
    try {
      const username = String(req.body.username).toLowerCase();
      const password = String(req.body.password);

      const existing = await findUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: 'Такой логин уже занят' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const avatarColor = pickAvatarColor();
      const displayName = username;
      const publicId = await generateUserCode();

      const [result] = await pool.query(
        'INSERT INTO users (public_id, username, password_hash, display_name, avatar_color) VALUES (?, ?, ?, ?, ?)',
        [publicId, username, passwordHash, displayName, avatarColor]
      );
      const userId = result.insertId;

      const [defaults] = await pool.query('SELECT id FROM conversations WHERE share_code = ? LIMIT 1', ['PINKHOME01']);
      if (defaults.length) {
        await pool.query(
          'INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
          [defaults[0].id, userId, 'member']
        );
      }

      const token = tokenForUser(userId);
      const user = await findUserById(userId);
      return res.status(201).json({ token, user: mapUser(user) });
    } catch (error) {
      console.error('Register error', error);
      return res.status(500).json({ message: 'Не удалось создать аккаунт' });
    }
  }
);

app.post(
  '/api/login',
  body('username').notEmpty(),
  body('password').notEmpty(),
  validationProblem,
  async (req, res) => {
    try {
      const username = String(req.body.username).toLowerCase();
      const password = String(req.body.password);

      const user = await findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Неверный логин или пароль' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Неверный логин или пароль' });
      }

      const token = tokenForUser(user.id);
      return res.json({ token, user: mapUser(user) });
    } catch (error) {
      console.error('Login error', error);
      return res.status(500).json({ message: 'Не удалось войти' });
    }
  }
);

app.get('/api/profile', authGuard, async (req, res) => {
  const user = await findUserById(req.auth.id);
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }
  const conversations = await fetchConversationList(req.auth.id);
  return res.json({ user: mapUser(user), conversations });
});

app.put(
  '/api/profile',
  authGuard,
  body('displayName').optional().isLength({ min: 2, max: 60 }),
  body('statusMessage').optional().isLength({ max: 160 }),
  body('bio').optional().isLength({ max: 500 }),
  body('avatarAttachmentId').optional().isUUID(),
  body('removeAvatar').optional().isBoolean().toBoolean(),
  validationProblem,
  async (req, res) => {
    try {
      const updates = [];
      const params = [];
      if (typeof req.body.displayName === 'string') {
        updates.push('display_name = ?');
        params.push(req.body.displayName.trim());
      }
      if (typeof req.body.statusMessage === 'string') {
        updates.push('status_message = ?');
        params.push(req.body.statusMessage.trim());
      }
      if (typeof req.body.bio === 'string') {
        updates.push('bio = ?');
        params.push(req.body.bio.trim());
      }

      const attachmentId = typeof req.body.avatarAttachmentId === 'string' ? req.body.avatarAttachmentId.trim() : '';
      let avatarApplied = false;
      if (attachmentId) {
        const [files] = await pool.query(
          'SELECT stored_name FROM attachments WHERE id = ? AND user_id = ? LIMIT 1',
          [attachmentId, req.auth.id]
        );
        if (!files.length) {
          return res.status(400).json({ message: 'Файл для аватара не найден' });
        }
        updates.push('avatar_url = ?');
        params.push(`/uploads/${files[0].stored_name}`);
        avatarApplied = true;
      }

      const removeAvatar = req.body.removeAvatar === true;
      if (!avatarApplied && removeAvatar) {
        updates.push('avatar_url = NULL');
      }
      if (!updates.length) {
        const user = await findUserById(req.auth.id);
        return res.json({ user: mapUser(user) });
      }
      params.push(req.auth.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      const user = await findUserById(req.auth.id);
      emitToUser(req.auth.id, 'profile:update', mapUser(user));
      return res.json({ user: mapUser(user) });
    } catch (error) {
      console.error('Profile update error', error);
      return res.status(500).json({ message: 'Не удалось обновить профиль' });
    }
  }
);

app.get(
  '/api/users/search',
  authGuard,
  query('q').isLength({ min: 1 }).withMessage('Введите хотя бы один символ'),
  validationProblem,
  async (req, res) => {
    const term = String(req.query.q || '').trim();
    const like = `%${term}%`;
    const likeUpper = `%${term.toUpperCase()}%`;
    const [rows] = await pool.query(
      `SELECT id, public_id, username, display_name, avatar_color, avatar_url, status_message, bio
       FROM users
       WHERE (username LIKE ? OR display_name LIKE ? OR UPPER(public_id) LIKE ? OR UPPER(public_id) = ?)
         AND id != ?
       ORDER BY display_name ASC
       LIMIT 30`,
      [like, like, likeUpper, term.toUpperCase(), req.auth.id]
    );
    return res.json({ users: rows.map(mapUser) });
  }
);

app.get(
  '/api/users/by-code/:code',
  authGuard,
  param('code').isLength({ min: 4 }),
  validationProblem,
  async (req, res) => {
    const user = await findUserByPublicId(String(req.params.code).trim());
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    return res.json({ user: mapUser(user) });
  }
);

app.get('/api/conversations', authGuard, async (req, res) => {
  const conversations = await fetchConversationList(req.auth.id);
  return res.json({ conversations });
});

app.post(
  '/api/conversations',
  authGuard,
  body('title').isLength({ min: 3, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('isPrivate').optional().isBoolean(),
  body('members').optional().isArray(),
  validationProblem,
  async (req, res) => {
    const { title, description = '', isPrivate = false, members = [] } = req.body;
    try {
      const memberUsernames = Array.from(new Set(members.map((m) => String(m).toLowerCase())));
      const memberRows = memberUsernames.length
        ? await pool.query('SELECT id, username FROM users WHERE username IN (?)', [memberUsernames]).then(([rows]) => rows)
        : [];

      const memberIds = memberRows.map((row) => row.id).filter((id) => id !== req.auth.id);
      const shareCode = await generateConversationCode();

      const conversationId = await withTransaction(async (conn) => {
        const [result] = await conn.query(
          'INSERT INTO conversations (share_code, type, title, description, creator_id, is_private) VALUES (?, \'group\', ?, ?, ?, ?)',
          [shareCode, title, description, req.auth.id, isPrivate ? 1 : 0]
        );
        const newConversationId = result.insertId;
        await conn.query(
          'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
          [newConversationId, req.auth.id, 'owner']
        );
        if (memberIds.length) {
          const values = memberIds.map(() => '(?, ?, ?)').join(',');
          const params = memberIds.flatMap((id) => [newConversationId, id, 'member']);
          await conn.query(`INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES ${values}`, params);
        }
        return newConversationId;
      });

      await updateConversationTimestamp(conversationId);
      const conversation = await fetchConversationById(conversationId);
      const membersList = await fetchConversationMembers(conversationId);

      const targets = [req.auth.id, ...memberIds];
      targets.forEach((userId) => joinUserToConversationSockets(userId, conversationId));
      await emitConversationUpdate(conversationId, targets);
      targets.forEach((userId) => {
        emitToUser(userId, 'conversation:created', {
          conversation: { ...mapConversation(conversation), members: membersList }
        });
      });

      return res.status(201).json({ conversation: { ...mapConversation(conversation), members: membersList } });
    } catch (error) {
      console.error('Create conversation error', error);
      return res.status(500).json({ message: 'Не удалось создать беседу' });
    }
  }
);

app.post(
  '/api/conversations/:id/read',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    await markConversationRead(conversationId, req.auth.id);
    await emitConversationUpdate(conversationId, [req.auth.id]);
    return res.status(204).send();
  }
);
app.post(
  '/api/conversations/direct',
  authGuard,
  body('username').isString().isLength({ min: 3, max: 64 }).withMessage('Укажите логин или ID собеседника'),
  validationProblem,
  async (req, res) => {
    try {
      const rawIdentifier = String(req.body.username || '').trim();
      if (!rawIdentifier) {
        return res.status(400).json({ message: 'Укажите логин или ID собеседника' });
      }

      let user = await findUserByUsername(rawIdentifier.toLowerCase());
      if (!user && rawIdentifier.length >= 4) {
        user = await findUserByPublicId(rawIdentifier.toUpperCase());
      }
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      if (user.id === req.auth.id) {
        return res.status(400).json({ message: 'Нельзя начать диалог с самим собой' });
      }

      const [existing] = await pool.query(
        `SELECT c.id
         FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
         WHERE c.type = 'direct'
         LIMIT 1`,
        [req.auth.id, user.id]
      );

      let conversationId;
      if (existing.length) {
        conversationId = existing[0].id;
      } else {
        const shareCode = await generateConversationCode();
        const [result] = await pool.query(
          'INSERT INTO conversations (share_code, type, title, description, creator_id, is_private) VALUES (?, \'direct\', ?, ?, ?, 1)',
          [
            shareCode,
            user.display_name || user.username,
            `Личный чат с ${user.display_name || user.username}`,
            req.auth.id
          ]
        );
        conversationId = result.insertId;
        await pool.query(
          'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)',
          [conversationId, req.auth.id, 'owner', conversationId, user.id, 'member']
        );
      }

      const conversation = await fetchConversationById(conversationId);
      const membersList = await fetchConversationMembers(conversationId);
      const payload = { ...mapConversation(conversation), members: membersList };

  joinUserToConversationSockets(req.auth.id, conversationId);
  joinUserToConversationSockets(user.id, conversationId);
      await emitConversationUpdate(conversationId, [req.auth.id, user.id]);
      emitToUser(req.auth.id, 'conversation:created', { conversation: payload });
      emitToUser(user.id, 'conversation:created', { conversation: payload });

      return res.json({ conversation: payload });
    } catch (error) {
      console.error('Direct conversation error', error);
      return res.status(500).json({ message: 'Не удалось открыть диалог' });
    }
  }
);

app.post(
  '/api/conversations/join',
  authGuard,
  body('code').isLength({ min: 5 }),
  validationProblem,
  async (req, res) => {
    const code = String(req.body.code || '').trim().toUpperCase();
    try {
      const [rows] = await pool.query('SELECT id FROM conversations WHERE share_code = ? LIMIT 1', [code]);
      if (!rows.length) {
        return res.status(404).json({ message: 'Беседа с таким кодом не найдена' });
      }
      const conversationId = rows[0].id;
      await pool.query(
        'INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
        [conversationId, req.auth.id, 'member']
      );
      joinUserToConversationSockets(req.auth.id, conversationId);
      await emitConversationUpdate(conversationId);
      const conversation = await fetchConversationById(conversationId);
      const membersList = await fetchConversationMembers(conversationId);
      emitToUser(req.auth.id, 'conversation:created', { conversation: { ...mapConversation(conversation), members: membersList } });
      return res.json({ conversation: { ...mapConversation(conversation), members: membersList } });
    } catch (error) {
      console.error('Join conversation error', error);
      return res.status(500).json({ message: 'Не удалось присоединиться к беседе' });
    }
  }
);

app.get(
  '/api/conversations/:id',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    const conversation = await fetchConversationById(conversationId);
    const members = await fetchConversationMembers(conversationId);
    return res.json({ conversation: { ...mapConversation(conversation), members } });
  }
);

app.post(
  '/api/conversations/:id/members',
  authGuard,
  param('id').isInt(),
  body('username').isLength({ min: 3 }),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Только администраторы могут приглашать' });
    }
    const username = String(req.body.username).toLowerCase();
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    await pool.query(
      'INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
      [conversationId, user.id, 'member']
    );
    joinUserToConversationSockets(user.id, conversationId);
    const members = await fetchConversationMembers(conversationId);
    await emitConversationUpdate(conversationId, members.map((m) => m.id));
    emitToUser(user.id, 'conversation:member-added', { conversationId, members });
    return res.status(201).json({ members });
  }
);

app.delete(
  '/api/conversations/:id/members/:userId',
  authGuard,
  param('id').isInt(),
  param('userId').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    if (targetUserId !== req.auth.id && membership.role !== 'owner') {
      return res.status(403).json({ message: 'Только владелец беседы может удалять других' });
    }
    await pool.query('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [conversationId, targetUserId]);
    leaveUserFromConversationSockets(targetUserId, conversationId);
    const members = await fetchConversationMembers(conversationId);
    await emitConversationUpdate(conversationId, members.map((m) => m.id));
    emitToUser(targetUserId, 'conversation:member-removed', { conversationId });
    return res.json({ members });
  }
);

app.get(
  '/api/conversations/:id/messages',
  authGuard,
  param('id').isInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('before').optional().isInt({ min: 1 }),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    const messages = await fetchMessages(conversationId, req.auth.id, {
      limit: req.query.limit,
      before: req.query.before
    });
    return res.json({ messages });
  }
);

app.post('/api/conversations/:id/read', authGuard, param('id').isInt(), validationProblem, async (req, res) => {
  const conversationId = Number(req.params.id);
  const membership = await ensureMembership(conversationId, req.auth.id);
  if (!membership) {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  await markConversationRead(conversationId, req.auth.id);
  await emitConversationUpdate(conversationId, [req.auth.id]);
  return res.json({ ok: true });
});

app.post(
  '/api/conversations/:id/messages',
  authGuard,
  param('id').isInt(),
  body('content').optional().isLength({ max: 4000 }),
  body('attachments').optional().isArray({ max: 10 }),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const attachmentIds = Array.isArray(req.body.attachments) ? req.body.attachments : [];

    if (!content && !attachmentIds.length) {
      return res.status(400).json({ message: 'Сообщение не может быть пустым' });
    }

    const attachments = await attachFiles(req.auth.id, attachmentIds);

    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, user_id, content, attachments) VALUES (?, ?, ?, ?)',
      [conversationId, req.auth.id, content || null, attachments.length ? JSON.stringify(attachments) : null]
    );
    const message = await fetchMessageById(result.insertId, req.auth.id);
    await updateConversationTimestamp(conversationId);
    await emitConversationUpdate(conversationId);
    io.to(`conversation:${conversationId}`).emit('message:created', message);
    return res.status(201).json({ message });
  }
);

app.put(
  '/api/messages/:id',
  authGuard,
  param('id').isInt(),
  body('content').isLength({ min: 1, max: 4000 }),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const content = req.body.content.trim();
    const [rows] = await pool.query('SELECT conversation_id, user_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    const messageRow = rows[0];
    if (messageRow.user_id !== req.auth.id) {
      return res.status(403).json({ message: 'Редактировать можно только свои сообщения' });
    }
    await pool.query('UPDATE messages SET content = ?, is_edited = 1, edited_at = CURRENT_TIMESTAMP WHERE id = ?', [content, messageId]);
    const message = await fetchMessageById(messageId, req.auth.id);
    io.to(`conversation:${messageRow.conversation_id}`).emit('message:updated', message);
    return res.json({ message });
  }
);

app.delete(
  '/api/messages/:id',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const [rows] = await pool.query('SELECT conversation_id, user_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    const messageRow = rows[0];
    if (messageRow.user_id !== req.auth.id) {
      return res.status(403).json({ message: 'Удалять можно только свои сообщения' });
    }
    await pool.query('UPDATE messages SET content = NULL, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [messageId]);
    const message = await fetchMessageById(messageId, req.auth.id);
    io.to(`conversation:${messageRow.conversation_id}`).emit('message:deleted', message);
    return res.json({ message });
  }
);

app.post(
  '/api/messages/:id/reactions',
  authGuard,
  param('id').isInt(),
  body('emoji').isLength({ min: 1, max: 16 }),
  body('action').isIn(['add', 'remove']),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const emoji = String(req.body.emoji);
    const action = req.body.action;

    const [rows] = await pool.query('SELECT conversation_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    const conversationId = rows[0].conversation_id;
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    if (action === 'add') {
      await pool.query(
        'REPLACE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [messageId, req.auth.id, emoji]
      );
    } else {
      await pool.query(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
        [messageId, req.auth.id, emoji]
      );
    }

    const message = await fetchMessageById(messageId, req.auth.id);
    io.to(`conversation:${conversationId}`).emit('message:updated', message);
    return res.json({ message });
  }
);

app.post('/api/uploads', authGuard, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не получен' });
  }
  try {
    const id = uuid();
    const kind = detectAttachmentKind(req.file.mimetype);
    const isCircle = String(req.body?.circle || '').toLowerCase() === 'true';
  const rawDuration = req.body?.duration !== undefined ? Number(req.body.duration) : null;
  const duration = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.round(rawDuration) : null;
    const waveform = req.body?.waveform ? tryStringifyWaveform(req.body.waveform) : null;
    const fileType = req.body?.type || null;
    await pool.query(
      'INSERT INTO attachments (id, user_id, file_name, stored_name, mime_type, size, kind, is_circle, duration_ms, waveform, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.auth.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, kind, isCircle ? 1 : 0, duration, waveform, fileType]
    );
    return res.status(201).json({ attachment: mapAttachment({
      id,
      file_name: req.file.originalname,
      stored_name: req.file.filename,
      mime_type: req.file.mimetype,
      size: req.file.size,
      kind,
      is_circle: isCircle ? 1 : 0,
      duration_ms: duration,
      waveform,
      file_type: fileType
    }) });
  } catch (error) {
    console.error('Upload error', error);
    return res.status(500).json({ message: 'Не удалось сохранить файл' });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  }
  return next();
});
const userSockets = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Missing token'));
    }
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(payload.id);
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.data.user = mapUser(user);
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const user = socket.data.user;
  if (!user) {
    socket.disconnect();
    return;
  }

  let sockets = userSockets.get(user.id);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(user.id, sockets);
  }
  sockets.add(socket);

  if (sockets.size === 1) {
    io.emit('presence:update', { userId: user.id, status: 'online' });
  }

  const [conversationRows] = await pool.query(
    'SELECT conversation_id FROM conversation_members WHERE user_id = ?',
    [user.id]
  );
  const conversationIds = conversationRows.map((row) => row.conversation_id);
  socket.data.conversations = new Set(conversationIds);
  conversationIds.forEach((conversationId) => socket.join(`conversation:${conversationId}`));

  socket.emit('conversation:list', await fetchConversationList(user.id));

  socket.on('conversation:read', async ({ conversationId }) => {
    if (!socket.data.conversations.has(conversationId)) return;
    await markConversationRead(conversationId, user.id);
    await emitConversationUpdate(conversationId, [user.id]);
  });

  socket.on('typing:start', async ({ conversationId }) => {
    if (!socket.data.conversations.has(conversationId)) return;
    socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId: user.id, isTyping: true });
  });

  socket.on('typing:stop', async ({ conversationId }) => {
    if (!socket.data.conversations.has(conversationId)) return;
    socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId: user.id, isTyping: false });
  });

  socket.on('message:create', async (payload, ack) => {
    try {
      const conversationId = Number(payload?.conversationId);
      const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
      const attachmentIds = Array.isArray(payload?.attachments) ? payload.attachments : [];
      const parentId = payload?.parentId ? Number(payload.parentId) : null;

      if (!conversationId || !socket.data.conversations.has(conversationId)) {
        throw new Error('Conversation not joined');
      }

      if (!content && !attachmentIds.length) {
        throw new Error('Сообщение не может быть пустым');
      }

      const attachments = await attachFiles(user.id, attachmentIds);

      const [result] = await pool.query(
        'INSERT INTO messages (conversation_id, user_id, content, attachments, parent_id) VALUES (?, ?, ?, ?, ?)',
        [conversationId, user.id, content || null, attachments.length ? JSON.stringify(attachments) : null, parentId]
      );
      const message = await fetchMessageById(result.insertId, user.id);
      await updateConversationTimestamp(conversationId);
      io.to(`conversation:${conversationId}`).emit('message:created', message);
      await emitConversationUpdate(conversationId);
      if (ack) ack({ ok: true, message });
    } catch (error) {
      console.error('Socket message error', error);
      if (ack) ack({ ok: false, message: error.message || 'Не удалось отправить сообщение' });
    }
  });

  socket.on('message:update', async ({ messageId, content }, ack) => {
    try {
      const message = await fetchMessageById(messageId, user.id);
      if (!message) throw new Error('not-found');
      if (message.user.id !== user.id) throw new Error('forbidden');
      await pool.query('UPDATE messages SET content = ?, is_edited = 1, edited_at = CURRENT_TIMESTAMP WHERE id = ?', [content.trim(), messageId]);
      const updated = await fetchMessageById(messageId, user.id);
      io.to(`conversation:${updated.conversationId}`).emit('message:updated', updated);
      if (ack) ack({ ok: true, message: updated });
    } catch (error) {
      if (ack) ack({ ok: false });
    }
  });

  socket.on('message:delete', async ({ messageId }, ack) => {
    try {
      const message = await fetchMessageById(messageId, user.id);
      if (!message) throw new Error('not-found');
      if (message.user.id !== user.id) throw new Error('forbidden');
      await pool.query('UPDATE messages SET content = NULL, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [messageId]);
      const updated = await fetchMessageById(messageId, user.id);
      io.to(`conversation:${updated.conversationId}`).emit('message:deleted', updated);
      if (ack) ack({ ok: true });
    } catch (error) {
      if (ack) ack({ ok: false });
    }
  });

  socket.on('message:reaction', async ({ messageId, emoji, action }, ack) => {
    try {
      const message = await fetchMessageById(messageId, user.id);
      if (!message) throw new Error('not-found');
      const conversationId = message.conversationId;
      if (!socket.data.conversations.has(conversationId)) throw new Error('forbidden');
      if (action === 'remove') {
        await pool.query('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [messageId, user.id, emoji]);
      } else {
        await pool.query('REPLACE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [messageId, user.id, emoji]);
      }
      const updated = await fetchMessageById(messageId, user.id);
      io.to(`conversation:${conversationId}`).emit('message:updated', updated);
      if (ack) ack({ ok: true, message: updated });
    } catch (error) {
      if (ack) ack({ ok: false });
    }
  });

  socket.on('disconnect', async () => {
    const socketsSet = userSockets.get(user.id);
    if (socketsSet) {
      socketsSet.delete(socket);
      if (!socketsSet.size) {
        userSockets.delete(user.id);
        await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        io.emit('presence:update', {
          userId: user.id,
          status: 'offline',
          lastSeen: dayjs().toISOString()
        });
      }
    }
  });
});

async function start() {
  try {
    await initDb();
    server.listen(config.port, () => {
      console.log(`Advanced pink messenger listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
