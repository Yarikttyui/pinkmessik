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

const MAX_PINNED_MESSAGES = 5;

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

async function ensureDirectConversationBetween(currentUserId, targetUser) {
  const [existing] = await pool.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
     JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`,
    [currentUserId, targetUser.id]
  );

  let conversationId;
  let created = false;

  if (existing.length) {
    conversationId = existing[0].id;
  } else {
    const shareCode = await generateConversationCode();
    const [result] = await pool.query(
      'INSERT INTO conversations (share_code, type, title, description, creator_id, is_private, avatar_attachment_id, avatar_url) VALUES (?, \'direct\', ?, ?, ?, 1, NULL, NULL)',
      [
        shareCode,
        targetUser.display_name || targetUser.username,
        `Личный чат с ${targetUser.display_name || targetUser.username}`,
        currentUserId
      ]
    );
    conversationId = result.insertId;
    await pool.query(
      'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)',
      [conversationId, currentUserId, 'owner', conversationId, targetUser.id, 'member']
    );
    created = true;
  }

  const conversation = await fetchConversationById(conversationId);
  const membersList = await fetchConversationMembers(conversationId);
  const payloadFor = (userId) => {
    const member = membersList.find((m) => m.id === userId);
    return buildConversationPayload(conversation, membersList, {
      role: member?.role || (userId === currentUserId ? 'owner' : 'member'),
      notifications_enabled: 1
    });
  };
  const payload = payloadFor(currentUserId);

  joinUserToConversationSockets(currentUserId, conversationId);
  joinUserToConversationSockets(targetUser.id, conversationId);

  if (created) {
    await emitConversationUpdate(conversationId, [currentUserId, targetUser.id]);
    emitToUser(currentUserId, 'conversation:created', { conversation: payload });
    emitToUser(targetUser.id, 'conversation:created', { conversation: payloadFor(targetUser.id) });
  }

  return { conversationId, created, payload };
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
  const avatarStoredName = row.avatar_stored_name || row.avatarStoredName;
  const avatarUrl = row.avatar_url || (avatarStoredName ? `/uploads/${avatarStoredName}` : null);
  const membershipRole = row.membership_role || row.member_role || row.role || null;
  const notificationsRaw = row.notifications_enabled;
  return {
    id: row.id,
    shareCode: row.share_code,
    type: row.type,
    title: row.title,
    description: row.description,
    avatarAttachmentId: row.avatar_attachment_id || null,
    avatarUrl,
    isPrivate: Boolean(row.is_private),
    creatorId: row.creator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage,
    unreadCount: row.unread_count ? Number(row.unread_count) : 0,
    membershipRole,
    notificationsEnabled:
      notificationsRaw === undefined || notificationsRaw === null ? true : Boolean(notificationsRaw)
  };
}

function buildConversationPayload(conversationRow, members, membership) {
  const mapped = mapConversation(conversationRow);
  return {
    ...mapped,
    members,
    membershipRole: membership?.role || mapped.membershipRole || null,
    notificationsEnabled:
      membership?.notifications_enabled === undefined
        ? mapped.notificationsEnabled
        : Boolean(membership.notifications_enabled)
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
  const replySnapshot = safeJsonParse(row.reply_snapshot);
  const forwardMetadata = safeJsonParse(row.forward_metadata);
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
    replyTo: replySnapshot
      ? {
          id: replySnapshot.id,
          content: replySnapshot.content || null,
          attachments: Array.isArray(replySnapshot.attachments) ? replySnapshot.attachments : [],
          user: replySnapshot.user || null
        }
      : null,
    forwardedFrom: forwardMetadata
      ? {
          messageId: row.forwarded_from_message_id || forwardMetadata.messageId || null,
          conversationId: forwardMetadata.conversationId || null,
          user: forwardMetadata.user || null,
          createdAt: forwardMetadata.createdAt || null
        }
      : null,
    isEdited: Boolean(row.is_edited),
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    reactions: reactions.map((reaction) => ({
      emoji: reaction.emoji,
      count: reaction.count,
      reacted: reaction.userIds.includes(currentUserId)
    })),
    isFavorite: Boolean(row.is_favorite),
    pinnedAt: row.pinned_at || null,
    pinnedBy:
      row.pinned_by
        ? {
            id: row.pinned_by,
            displayName: row.pinned_by_display_name || null,
            username: row.pinned_by_username || null,
            publicId: row.pinned_by_public_id || null
          }
        : null
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
    `SELECT c.*, ca.stored_name AS avatar_stored_name, ca.file_name AS avatar_file_name, ca.mime_type AS avatar_mime_type,
            json_object('id', m.id, 'content', m.content, 'createdAt', m.created_at,
      'user', json_object('id', u.id, 'publicId', u.public_id, 'displayName', u.display_name, 'username', u.username, 'avatarUrl', u.avatar_url, 'avatarColor', u.avatar_color)) AS last_message,
            IFNULL(uc.unread_count, 0) AS unread_count,
            cm.role AS membership_role,
            cm.notifications_enabled
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     LEFT JOIN attachments ca ON ca.id = c.avatar_attachment_id
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
  const [rows] = await pool.query(
    `SELECT c.*, ca.stored_name AS avatar_stored_name, ca.file_name AS avatar_file_name, ca.mime_type AS avatar_mime_type
     FROM conversations c
     LEFT JOIN attachments ca ON ca.id = c.avatar_attachment_id
     WHERE c.id = ?
     LIMIT 1`,
    [conversationId]
  );
  return rows[0] || null;
}

async function ensureMembership(conversationId, userId) {
  const [rows] = await pool.query(
    'SELECT role, notifications_enabled FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1',
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
            ) AS reactions,
            EXISTS(
              SELECT 1 FROM message_favorites mf
              WHERE mf.message_id = m.id AND mf.user_id = ?
            ) AS is_favorite
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.id = ?
     LIMIT 1`,
    [currentUserId, messageId]
  );
  return rows[0] ? mapMessage(rows[0], currentUserId) : null;
}

async function fetchMessages(conversationId, currentUserId, options = {}) {
  const limit = Math.min(Number(options.limit) || 30, 200);
  const beforeId = options.before ? Number(options.before) : null;
  const params = [currentUserId, conversationId];
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
            ) AS reactions,
            EXISTS(
              SELECT 1 FROM message_favorites mf
              WHERE mf.message_id = m.id AND mf.user_id = ?
            ) AS is_favorite
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ? ${condition}
     ORDER BY m.id DESC
     LIMIT ?`,
    params
  );
  return rows.reverse().map((row) => mapMessage(row, currentUserId));
}

async function fetchPinnedMessages(conversationId, currentUserId) {
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
            ) AS reactions,
            EXISTS(
              SELECT 1 FROM message_favorites mf
              WHERE mf.message_id = m.id AND mf.user_id = ?
            ) AS is_favorite,
            cp.pinned_at, cp.pinned_by,
            pu.display_name AS pinned_by_display_name,
            pu.username AS pinned_by_username,
            pu.public_id AS pinned_by_public_id
     FROM conversation_pins cp
     JOIN messages m ON m.id = cp.message_id
     JOIN users u ON u.id = m.user_id
     LEFT JOIN users pu ON pu.id = cp.pinned_by
     WHERE cp.conversation_id = ?
     ORDER BY cp.pinned_at DESC
     LIMIT 20`,
    [currentUserId, conversationId]
  );
  return rows.map((row) => mapMessage(row, currentUserId));
}

async function fetchFavoriteMessages(userId) {
  const [rows] = await pool.query(
    `SELECT mf.message_id
     FROM message_favorites mf
     JOIN messages m ON m.id = mf.message_id
     WHERE mf.user_id = ? AND m.user_id = ?
     ORDER BY mf.created_at DESC
     LIMIT 200`,
    [userId, userId]
  );
  if (!rows.length) return [];
  const messages = await Promise.all(rows.map((row) => fetchMessageById(row.message_id, userId)));
  return messages.filter(Boolean);
}

async function broadcastPinnedMessages(conversationId) {
  const members = await fetchConversationMembers(conversationId);
  await Promise.all(
    members.map(async (member) => {
      const pins = await fetchPinnedMessages(conversationId, member.id);
      emitToUser(member.id, 'conversation:pins', { conversationId, pins });
    })
  );
}

async function fetchFolders(userId) {
  const [folders] = await pool.query(
    'SELECT id, title, color FROM conversation_folders WHERE user_id = ? ORDER BY title',
    [userId]
  );
  if (!folders.length) return [];
  const folderIds = folders.map((folder) => folder.id);
  const [items] = await pool.query(
    'SELECT folder_id, conversation_id FROM conversation_folder_items WHERE folder_id IN (?) ORDER BY position, conversation_id',
    [folderIds]
  );
  const grouped = new Map();
  items.forEach((item) => {
    if (!grouped.has(item.folder_id)) {
      grouped.set(item.folder_id, []);
    }
    grouped.get(item.folder_id).push(item.conversation_id);
  });
  return folders.map((folder) => ({
    id: folder.id,
    title: folder.title,
    color: folder.color,
    conversations: grouped.get(folder.id) || []
  }));
}

async function emitFoldersUpdate(userId) {
  const folders = await fetchFolders(userId);
  emitToUser(userId, 'folders:update', { folders });
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

function leaveCall(conversationId, socket) {
  const callState = activeCalls.get(conversationId);
  const userId = socket.data.user?.id;
  if (!callState || !userId) return;
  const entry = callState.get(userId);
  socket.leave(`call:${conversationId}`);
  socket.data.activeCalls?.delete(conversationId);
  if (!entry) {
    if (!callState.size) {
      activeCalls.delete(conversationId);
    }
    return;
  }
  entry.sockets.delete(socket.id);
  if (!entry.sockets.size) {
    callState.delete(userId);
    socket.to(`call:${conversationId}`).emit('call:user-left', { conversationId, userId });
  }
  if (!callState.size) {
    activeCalls.delete(conversationId);
  }
}

function forceLeaveCall(conversationId, userId) {
  const callState = activeCalls.get(conversationId);
  if (!callState) return;
  const entry = callState.get(userId);
  if (!entry) return;
  entry.sockets.forEach((socketId) => {
    const targetSocket = io.sockets.sockets.get(socketId);
    if (targetSocket) {
      targetSocket.leave(`call:${conversationId}`);
      targetSocket.data.activeCalls?.delete(conversationId);
    }
  });
  callState.delete(userId);
  io.to(`call:${conversationId}`).emit('call:user-left', { conversationId, userId });
  if (!callState.size) {
    activeCalls.delete(conversationId);
  }
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

function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
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
      const payloadFor = (userId) => {
        const member = membersList.find((m) => m.id === userId);
        return buildConversationPayload(conversation, membersList, {
          role: member?.role || (userId === req.auth.id ? 'owner' : 'member'),
          notifications_enabled: 1
        });
      };

      targets.forEach((userId) => {
        emitToUser(userId, 'conversation:created', {
          conversation: payloadFor(userId)
        });
      });

      return res.status(201).json({ conversation: payloadFor(req.auth.id) });
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

      const { payload } = await ensureDirectConversationBetween(req.auth.id, user);
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
      const membership = await ensureMembership(conversationId, req.auth.id);
      const payload = buildConversationPayload(conversation, membersList, membership);
      emitToUser(req.auth.id, 'conversation:created', { conversation: payload });
      return res.json({ conversation: payload });
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
    return res.json({
      conversation: buildConversationPayload(conversation, members, membership)
    });
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

app.put(
  '/api/conversations/:id',
  authGuard,
  param('id').isInt(),
  body('title').optional().isLength({ min: 3, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('avatarAttachmentId').optional().isLength({ min: 10, max: 64 }),
  body('removeAvatar').optional().isBoolean(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Недостаточно прав для изменения беседы' });
    }

    const fields = [];
    const params = [];

    if (typeof req.body.title === 'string') {
      const title = req.body.title.trim();
      if (title.length < 3) {
        return res.status(400).json({ message: 'Название должно быть не короче 3 символов' });
      }
      fields.push('title = ?');
      params.push(title);
    }

    if (typeof req.body.description === 'string') {
      const description = req.body.description.trim();
      fields.push('description = ?');
      params.push(description || null);
    }

    let avatarAttachmentId = undefined;
    let avatarUrl = undefined;
    const removeAvatar = typeof req.body.removeAvatar === 'boolean' ? req.body.removeAvatar : false;

    if (typeof req.body.avatarAttachmentId === 'string' && req.body.avatarAttachmentId.trim()) {
      const attachmentId = req.body.avatarAttachmentId.trim();
      const [attachmentRows] = await pool.query(
        'SELECT id, stored_name FROM attachments WHERE id = ? AND user_id = ? LIMIT 1',
        [attachmentId, req.auth.id]
      );
      if (!attachmentRows.length) {
        return res.status(400).json({ message: 'Файл для аватара не найден или не принадлежит вам' });
      }
      avatarAttachmentId = attachmentRows[0].id;
      avatarUrl = `/uploads/${attachmentRows[0].stored_name}`;
    } else if (removeAvatar) {
      avatarAttachmentId = null;
      avatarUrl = null;
    }

    if (avatarAttachmentId !== undefined) {
      fields.push('avatar_attachment_id = ?');
      params.push(avatarAttachmentId);
      fields.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    if (!fields.length) {
      return res.status(400).json({ message: 'Нет изменений для сохранения' });
    }

    params.push(conversationId);
    await pool.query(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, params);

    const conversation = await fetchConversationById(conversationId);
    const membersList = await fetchConversationMembers(conversationId);
    const broadcastPayload = { ...mapConversation(conversation), members: membersList };
    const responsePayload = buildConversationPayload(conversation, membersList, membership);

    await emitConversationUpdate(conversationId);
    io.to(`conversation:${conversationId}`).emit('conversation:updated', broadcastPayload);

    return res.json({ conversation: responsePayload });
  }
);

app.put(
  '/api/conversations/:id/notifications',
  authGuard,
  param('id').isInt(),
  body('enabled').isBoolean(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    const enabled = req.body.enabled ? 1 : 0;
    await pool.query(
      'UPDATE conversation_members SET notifications_enabled = ? WHERE conversation_id = ? AND user_id = ?',
      [enabled, conversationId, req.auth.id]
    );
    await emitConversationUpdate(conversationId, [req.auth.id]);
    return res.json({ enabled: Boolean(enabled) });
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
  forceLeaveCall(conversationId, targetUserId);
  leaveUserFromConversationSockets(targetUserId, conversationId);
    await pool.query(
      `DELETE fi FROM conversation_folder_items fi
       JOIN conversation_folders f ON f.id = fi.folder_id
       WHERE fi.conversation_id = ? AND f.user_id = ?`,
      [conversationId, targetUserId]
    );
    if (targetUserId === req.auth.id) {
      await emitFoldersUpdate(req.auth.id);
    }
    const members = await fetchConversationMembers(conversationId);
    await emitConversationUpdate(conversationId, members.map((m) => m.id));
    emitToUser(targetUserId, 'conversation:member-removed', { conversationId });
    return res.json({ members });
  }
);

app.post(
  '/api/conversations/:id/admins',
  authGuard,
  param('id').isInt(),
  body('userId').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const targetUserId = Number(req.body.userId);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ message: 'Только создатель беседы может назначать администраторов' });
    }
    const targetMembership = await ensureMembership(conversationId, targetUserId);
    if (!targetMembership) {
      return res.status(404).json({ message: 'Пользователь не состоит в беседе' });
    }
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ message: 'Создателя нельзя изменить' });
    }
    await pool.query(
      'UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?',
      ['admin', conversationId, targetUserId]
    );
    const members = await fetchConversationMembers(conversationId);
    await emitConversationUpdate(conversationId, members.map((m) => m.id));
    io.to(`conversation:${conversationId}`).emit('conversation:members', { conversationId, members });
    return res.json({ members });
  }
);

app.delete(
  '/api/conversations/:id/admins/:userId',
  authGuard,
  param('id').isInt(),
  param('userId').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ message: 'Только создатель беседы может снимать администраторов' });
    }
    const targetMembership = await ensureMembership(conversationId, targetUserId);
    if (!targetMembership) {
      return res.status(404).json({ message: 'Пользователь не состоит в беседе' });
    }
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ message: 'Создателя нельзя изменить' });
    }
    await pool.query(
      'UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?',
      ['member', conversationId, targetUserId]
    );
    const members = await fetchConversationMembers(conversationId);
    await emitConversationUpdate(conversationId, members.map((m) => m.id));
    io.to(`conversation:${conversationId}`).emit('conversation:members', { conversationId, members });
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
  body('parentId').optional().isInt({ min: 1 }),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const attachmentIds = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const parentId = req.body.parentId ? Number(req.body.parentId) : null;

    if (!content && !attachmentIds.length) {
      return res.status(400).json({ message: 'Сообщение не может быть пустым' });
    }

    const attachments = await attachFiles(req.auth.id, attachmentIds);

    let replySnapshot = null;
    if (parentId) {
      const [parentRows] = await pool.query(
        `SELECT m.id, m.conversation_id, m.content, m.attachments, u.id AS user_id, u.display_name, u.username, u.public_id
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = ?
         LIMIT 1`,
        [parentId]
      );
      if (!parentRows.length || parentRows[0].conversation_id !== conversationId) {
        return res.status(400).json({ message: 'Нельзя ответить на сообщение из другой беседы' });
      }
      const parent = parentRows[0];
      const parentAttachments = safeJsonParse(parent.attachments, []);
      replySnapshot = {
        id: parent.id,
        content: parent.content ? String(parent.content).slice(0, 400) : null,
        attachments: Array.isArray(parentAttachments)
          ? parentAttachments.slice(0, 3).map((item) => {
              const normalized = normalizeAttachment(item);
              return normalized
                ? {
                    kind: normalized.kind,
                    url: normalized.url,
                    originalName: normalized.originalName
                  }
                : null;
            }).filter(Boolean)
          : [],
        user: {
          id: parent.user_id,
          displayName: parent.display_name,
          username: parent.username,
          publicId: parent.public_id
        }
      };
    }

    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, user_id, content, attachments, parent_id, reply_snapshot) VALUES (?, ?, ?, ?, ?, ?)',
      [
        conversationId,
        req.auth.id,
        content || null,
        attachments.length ? JSON.stringify(attachments) : null,
        parentId || null,
        replySnapshot ? JSON.stringify(replySnapshot) : null
      ]
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

app.post(
  '/api/messages/:id/favorite',
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
      return res.status(403).json({ message: 'Добавлять в избранное можно только свои сообщения' });
    }
    await pool.query('INSERT IGNORE INTO message_favorites (user_id, message_id) VALUES (?, ?)', [req.auth.id, messageId]);
    const message = await fetchMessageById(messageId, req.auth.id);
    return res.status(201).json({ message });
  }
);

app.delete(
  '/api/messages/:id/favorite',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const [rows] = await pool.query('SELECT user_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    if (rows[0].user_id !== req.auth.id) {
      return res.status(403).json({ message: 'Можно убирать из избранного только свои сообщения' });
    }
    await pool.query('DELETE FROM message_favorites WHERE user_id = ? AND message_id = ?', [req.auth.id, messageId]);
    return res.json({ ok: true });
  }
);

app.get(
  '/api/favorites',
  authGuard,
  query('conversationId').optional().isInt({ min: 1 }),
  validationProblem,
  async (req, res) => {
    const conversationId = req.query.conversationId ? Number(req.query.conversationId) : null;
    const favorites = await fetchFavoriteMessages(req.auth.id);
    const filtered = conversationId ? favorites.filter((message) => message.conversationId === conversationId) : favorites;
    return res.json({ favorites: filtered });
  }
);

app.get(
  '/api/conversations/:id/pins',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const conversationId = Number(req.params.id);
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    const pins = await fetchPinnedMessages(conversationId, req.auth.id);
    return res.json({ pins });
  }
);

app.post(
  '/api/messages/:id/pin',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const [rows] = await pool.query('SELECT conversation_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    const conversationId = rows[0].conversation_id;
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Только администраторы могут закреплять сообщения' });
    }

    await pool.query(
      'INSERT IGNORE INTO conversation_pins (conversation_id, message_id, pinned_by) VALUES (?, ?, ?)',
      [conversationId, messageId, req.auth.id]
    );

    const [pinRows] = await pool.query(
      'SELECT id FROM conversation_pins WHERE conversation_id = ? ORDER BY pinned_at DESC',
      [conversationId]
    );
    if (pinRows.length > MAX_PINNED_MESSAGES) {
      const excess = pinRows.slice(MAX_PINNED_MESSAGES);
      const excessIds = excess.map((row) => row.id);
      await pool.query('DELETE FROM conversation_pins WHERE id IN (?)', [excessIds]);
    }

    await broadcastPinnedMessages(conversationId);
    const pins = await fetchPinnedMessages(conversationId, req.auth.id);
    return res.status(201).json({ pins });
  }
);

app.delete(
  '/api/messages/:id/pin',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const [rows] = await pool.query('SELECT conversation_id FROM messages WHERE id = ? LIMIT 1', [messageId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    const conversationId = rows[0].conversation_id;
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Только администраторы могут снимать закрепы' });
    }

    await pool.query('DELETE FROM conversation_pins WHERE conversation_id = ? AND message_id = ?', [conversationId, messageId]);
    await broadcastPinnedMessages(conversationId);
    const pins = await fetchPinnedMessages(conversationId, req.auth.id);
    return res.json({ pins });
  }
);

app.post(
  '/api/messages/:id/forward',
  authGuard,
  param('id').isInt(),
  body('conversationId').optional().isInt({ min: 1 }),
  body('username').optional().isString().isLength({ min: 3, max: 64 }),
  body('content').optional().isLength({ max: 4000 }),
  validationProblem,
  async (req, res) => {
    const messageId = Number(req.params.id);
    const targetConversationIdRaw = req.body.conversationId ? Number(req.body.conversationId) : null;
    const rawIdentifier = typeof req.body.username === 'string' ? req.body.username.trim() : '';

    if (!targetConversationIdRaw && !rawIdentifier) {
      return res.status(400).json({ message: 'Укажите беседу или собеседника для пересылки' });
    }

    const original = await fetchMessageById(messageId, req.auth.id);
    if (!original) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }

    const membership = await ensureMembership(original.conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    let targetConversationId = targetConversationIdRaw;
    let conversationPayload = null;

    if (rawIdentifier) {
      let user = await findUserByUsername(rawIdentifier.toLowerCase());
      if (!user && rawIdentifier.length >= 4) {
        user = await findUserByPublicId(rawIdentifier.toUpperCase());
      }
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      if (user.id === req.auth.id) {
        return res.status(400).json({ message: 'Нельзя переслать сообщение самому себе' });
      }
      const directResult = await ensureDirectConversationBetween(req.auth.id, user);
      targetConversationId = directResult.conversationId;
      conversationPayload = directResult.payload;
    }

    if (!targetConversationId) {
      return res.status(400).json({ message: 'Беседа для пересылки не найдена' });
    }

    const targetMembership = await ensureMembership(targetConversationId, req.auth.id);
    if (!targetMembership) {
      return res.status(403).json({ message: 'Вы не состоите в выбранной беседе' });
    }

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const attachmentsData = original.attachments?.length ? JSON.stringify(original.attachments) : null;
    const forwardMetadata = {
      messageId: original.id,
      conversationId: original.conversationId,
      user: original.user
        ? {
            id: original.user.id,
            displayName: original.user.displayName,
            username: original.user.username,
            publicId: original.user.publicId,
            avatarUrl: original.user.avatarUrl,
            avatarColor: original.user.avatarColor
          }
        : null,
      createdAt: original.createdAt
    };

    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, user_id, content, attachments, forwarded_from_message_id, forward_metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [
        targetConversationId,
        req.auth.id,
        content || null,
        attachmentsData,
        original.id,
        JSON.stringify(forwardMetadata)
      ]
    );

    const message = await fetchMessageById(result.insertId, req.auth.id);
    await updateConversationTimestamp(targetConversationId);
    await emitConversationUpdate(targetConversationId);
    io.to(`conversation:${targetConversationId}`).emit('message:created', message);

    return res.status(201).json({
      message,
      conversationId: targetConversationId,
      conversation: conversationPayload
    });
  }
);

app.get('/api/folders', authGuard, async (req, res) => {
  const folders = await fetchFolders(req.auth.id);
  return res.json({ folders });
});

app.post(
  '/api/folders',
  authGuard,
  body('title').isLength({ min: 2, max: 60 }),
  body('color').optional().isString(),
  validationProblem,
  async (req, res) => {
    const title = req.body.title.trim();
    const color = req.body.color && isValidHexColor(req.body.color) ? req.body.color.trim() : null;
    const [result] = await pool.query(
      'INSERT INTO conversation_folders (user_id, title, color) VALUES (?, ?, ?)',
      [req.auth.id, title, color]
    );
    await emitFoldersUpdate(req.auth.id);
    const folders = await fetchFolders(req.auth.id);
    const folder = folders.find((item) => item.id === result.insertId) || null;
    return res.status(201).json({ folder, folders });
  }
);

app.put(
  '/api/folders/:id',
  authGuard,
  param('id').isInt(),
  body('title').optional().isLength({ min: 2, max: 60 }),
  body('color').optional().isString(),
  validationProblem,
  async (req, res) => {
    const folderId = Number(req.params.id);
    const [rows] = await pool.query('SELECT user_id FROM conversation_folders WHERE id = ? LIMIT 1', [folderId]);
    if (!rows.length || rows[0].user_id !== req.auth.id) {
      return res.status(404).json({ message: 'Папка не найдена' });
    }

    const fields = [];
    const params = [];
    if (typeof req.body.title === 'string') {
      const title = req.body.title.trim();
      if (!title) {
        return res.status(400).json({ message: 'Название папки не может быть пустым' });
      }
      fields.push('title = ?');
      params.push(title);
    }
    if (req.body.color !== undefined) {
      const color = req.body.color && isValidHexColor(req.body.color) ? req.body.color.trim() : null;
      fields.push('color = ?');
      params.push(color);
    }
    if (!fields.length) {
      return res.status(400).json({ message: 'Нет изменений для сохранения' });
    }

    params.push(folderId);
    await pool.query(`UPDATE conversation_folders SET ${fields.join(', ')} WHERE id = ?`, params);
    await emitFoldersUpdate(req.auth.id);
    const folders = await fetchFolders(req.auth.id);
    const folder = folders.find((item) => item.id === folderId) || null;
    return res.json({ folder, folders });
  }
);

app.delete(
  '/api/folders/:id',
  authGuard,
  param('id').isInt(),
  validationProblem,
  async (req, res) => {
    const folderId = Number(req.params.id);
    const [rows] = await pool.query('SELECT user_id FROM conversation_folders WHERE id = ? LIMIT 1', [folderId]);
    if (!rows.length || rows[0].user_id !== req.auth.id) {
      return res.status(404).json({ message: 'Папка не найдена' });
    }
    await pool.query('DELETE FROM conversation_folders WHERE id = ?', [folderId]);
    await emitFoldersUpdate(req.auth.id);
    return res.status(204).send();
  }
);

app.post(
  '/api/folders/:id/conversations',
  authGuard,
  param('id').isInt(),
  body('conversationId').isInt(),
  validationProblem,
  async (req, res) => {
    const folderId = Number(req.params.id);
    const conversationId = Number(req.body.conversationId);
    const [rows] = await pool.query('SELECT user_id FROM conversation_folders WHERE id = ? LIMIT 1', [folderId]);
    if (!rows.length || rows[0].user_id !== req.auth.id) {
      return res.status(404).json({ message: 'Папка не найдена' });
    }
    const membership = await ensureMembership(conversationId, req.auth.id);
    if (!membership) {
      return res.status(403).json({ message: 'Вы не состоите в этой беседе' });
    }
    const position = Math.floor(Date.now() / 1000);
    await pool.query(
      `INSERT INTO conversation_folder_items (folder_id, conversation_id, position)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE position = VALUES(position)`,
      [folderId, conversationId, position]
    );
    await emitFoldersUpdate(req.auth.id);
    const folders = await fetchFolders(req.auth.id);
    return res.status(201).json({ folders });
  }
);

app.delete(
  '/api/folders/:id/conversations/:conversationId',
  authGuard,
  param('id').isInt(),
  param('conversationId').isInt(),
  validationProblem,
  async (req, res) => {
    const folderId = Number(req.params.id);
    const conversationId = Number(req.params.conversationId);
    const [rows] = await pool.query('SELECT user_id FROM conversation_folders WHERE id = ? LIMIT 1', [folderId]);
    if (!rows.length || rows[0].user_id !== req.auth.id) {
      return res.status(404).json({ message: 'Папка не найдена' });
    }
    await pool.query('DELETE FROM conversation_folder_items WHERE folder_id = ? AND conversation_id = ?', [folderId, conversationId]);
    await emitFoldersUpdate(req.auth.id);
    const folders = await fetchFolders(req.auth.id);
    return res.json({ folders });
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
const activeCalls = new Map(); // conversationId -> Map<userId, { sockets: Set<string>, user: object, muted: boolean, screenSharing: boolean }>

function getCallState(conversationId) {
  if (!activeCalls.has(conversationId)) {
    activeCalls.set(conversationId, new Map());
  }
  return activeCalls.get(conversationId);
}

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

  socket.data.activeCalls = new Set();

  let sockets = userSockets.get(user.id);
  if (!sockets) {
    sockets = new Set();
    socket.data.conversations?.delete(conversationId);
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

  socket.on('call:join', ({ conversationId }) => {
    const callId = Number(conversationId);
    if (!callId || !socket.data.conversations.has(callId)) return;
    socket.join(`call:${callId}`);
    socket.data.activeCalls.add(callId);
    const callState = getCallState(callId);
    let entry = callState.get(user.id);
    if (!entry) {
      entry = {
        sockets: new Set(),
        user: { ...user },
        muted: false,
        screenSharing: false
      };
      callState.set(user.id, entry);
    } else {
      entry.user = { ...entry.user, ...user };
    }
    entry.sockets.add(socket.id);
    const participants = Array.from(callState.values()).map((participant) => ({
      user: participant.user,
      muted: participant.muted,
      screenSharing: participant.screenSharing
    }));
    socket.emit('call:participants', { conversationId: callId, participants });
    socket.to(`call:${callId}`).emit('call:user-joined', { conversationId: callId, user: entry.user });
  });

  socket.on('call:signal', ({ conversationId, targetUserId, data }) => {
    const callId = Number(conversationId);
    const targetId = Number(targetUserId);
    if (!callId || !targetId || !socket.data.activeCalls.has(callId)) return;
    const callState = activeCalls.get(callId);
    const target = callState?.get(targetId);
    if (!target) return;
    target.sockets.forEach((socketId) => {
      io.to(socketId).emit('call:signal', {
        conversationId: callId,
        fromUserId: user.id,
        data
      });
    });
  });

  socket.on('call:state', ({ conversationId, muted, screenSharing }) => {
    const callId = Number(conversationId);
    if (!callId || !socket.data.activeCalls.has(callId)) return;
    const callState = activeCalls.get(callId);
    const entry = callState?.get(user.id);
    if (!entry) return;
    if (typeof muted === 'boolean') entry.muted = muted;
    if (typeof screenSharing === 'boolean') entry.screenSharing = screenSharing;
    socket.to(`call:${callId}`).emit('call:state', {
      conversationId: callId,
      userId: user.id,
      muted: entry.muted,
      screenSharing: entry.screenSharing
    });
  });

  socket.on('call:leave', ({ conversationId }) => {
    const callId = Number(conversationId);
    if (!callId || !socket.data.activeCalls.has(callId)) return;
    leaveCall(callId, socket);
  });

  socket.on('disconnect', async () => {
    const activeCallIds = Array.from(socket.data.activeCalls || []);
    activeCallIds.forEach((conversationId) => {
      leaveCall(conversationId, socket);
    });
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
