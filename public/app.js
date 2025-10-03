(() => {
  const elements = {
    authScreen: document.getElementById('authScreen'),
    appShell: document.getElementById('appShell'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    authTabs: document.querySelectorAll('.tab'),
    authMessage: document.getElementById('authMessage'),
    profileAvatar: document.getElementById('profileAvatar'),
    profileName: document.getElementById('profileName'),
    profileStatus: document.getElementById('profileStatus'),
  profileBio: document.getElementById('profileBio'),
    profileCode: document.getElementById('profileCode'),
    profileEditBtn: document.getElementById('profileEditBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    newGroupBtn: document.getElementById('newGroupBtn'),
    newDirectBtn: document.getElementById('newDirectBtn'),
    joinByCodeBtn: document.getElementById('joinByCodeBtn'),
    conversationFilter: document.getElementById('conversationFilter'),
  searchResults: document.getElementById('searchResults'),
    conversationList: document.getElementById('conversationList'),
    chatPlaceholder: document.getElementById('chatPlaceholder'),
    chatPane: document.getElementById('chatPane'),
    conversationAvatar: document.getElementById('conversationAvatar'),
    conversationTitle: document.getElementById('conversationTitle'),
    conversationMeta: document.getElementById('conversationMeta'),
    conversationCode: document.getElementById('conversationCode'),
    addMemberBtn: document.getElementById('addMemberBtn'),
    detailsToggleBtn: document.getElementById('detailsToggleBtn'),
    detailsCloseBtn: document.getElementById('detailsCloseBtn'),
    detailsPanel: document.getElementById('detailsPanel'),
    memberList: document.getElementById('memberList'),
    typingIndicator: document.getElementById('typingIndicator'),
    messageScroller: document.getElementById('messageScroller'),
    messageList: document.getElementById('messageList'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('messageInput'),
    attachmentInput: document.getElementById('attachmentInput'),
    attachmentBar: document.getElementById('attachmentBar'),
  replyPreview: document.getElementById('replyPreview'),
  replyPreviewClose: document.getElementById('replyPreviewClose'),
  replyPreviewAuthor: document.getElementById('replyPreviewAuthor'),
  replyPreviewText: document.getElementById('replyPreviewText'),
  voiceRecordBtn: document.getElementById('voiceRecordBtn'),
  circleRecordBtn: document.getElementById('circleRecordBtn'),
  recordingIndicator: document.getElementById('recordingIndicator'),
  recordingStatus: document.getElementById('recordingStatus'),
  recordingType: document.getElementById('recordingType'),
  recordingStopBtn: document.getElementById('recordingStopBtn'),
  voiceFallbackInput: document.getElementById('voiceFallbackInput'),
  circleFallbackInput: document.getElementById('circleFallbackInput'),
    profileModal: document.getElementById('profileModal'),
    profileForm: document.getElementById('profileForm'),
  profileAvatarPreview: document.getElementById('profileAvatarPreview'),
  profileAvatarInput: document.getElementById('profileAvatarInput'),
  profileAvatarRemoveBtn: document.getElementById('profileAvatarRemoveBtn'),
    groupModal: document.getElementById('groupModal'),
    groupForm: document.getElementById('groupForm'),
    directModal: document.getElementById('directModal'),
    directForm: document.getElementById('directForm'),
    joinModal: document.getElementById('joinModal'),
    joinForm: document.getElementById('joinForm'),
    memberModal: document.getElementById('memberModal'),
    memberProfileAvatar: document.getElementById('memberProfileAvatar'),
    memberProfileName: document.getElementById('memberProfileName'),
    memberProfileStatus: document.getElementById('memberProfileStatus'),
    memberProfilePresence: document.getElementById('memberProfilePresence'),
    memberProfileBio: document.getElementById('memberProfileBio'),
    memberProfileMessageBtn: document.getElementById('memberProfileMessageBtn'),
    memberProfileCopyBtn: document.getElementById('memberProfileCopyBtn'),
    memberProfileInviteToggle: document.getElementById('memberProfileInviteToggle'),
    memberProfileInviteSection: document.getElementById('memberProfileInviteSection'),
    memberProfileInviteSelect: document.getElementById('memberProfileInviteSelect'),
    memberProfileInviteBtn: document.getElementById('memberProfileInviteBtn'),
    mediaViewer: document.getElementById('mediaViewer'),
    mediaViewerImage: document.getElementById('mediaViewerImage'),
    mediaViewerVideo: document.getElementById('mediaViewerVideo'),
    mediaViewerCaption: document.getElementById('mediaViewerCaption'),
    mediaViewerDownload: document.getElementById('mediaViewerDownload'),
    folderPanel: document.getElementById('folderPanel'),
    folderCreateBtn: document.getElementById('folderCreateBtn'),
    folderAllBtn: document.getElementById('folderAllBtn'),
    folderList: document.getElementById('folderList'),
    folderModal: document.getElementById('folderModal'),
    folderForm: document.getElementById('folderForm'),
    folderTitleInput: document.getElementById('folderTitleInput'),
    folderColorInput: document.getElementById('folderColorInput'),
    detailsFolders: document.getElementById('detailsFolders'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    favoritesModal: document.getElementById('favoritesModal'),
    favoritesList: document.getElementById('favoritesList'),
  forwardModal: document.getElementById('forwardModal'),
  forwardForm: document.getElementById('forwardForm'),
  forwardConversationSelect: document.getElementById('forwardConversationSelect'),
  forwardUserInput: document.getElementById('forwardUserInput'),
  forwardCommentInput: document.getElementById('forwardCommentInput'),
    conversationSettingsBtn: document.getElementById('conversationSettingsBtn'),
    conversationModal: document.getElementById('conversationModal'),
    conversationForm: document.getElementById('conversationForm'),
    conversationAvatarPreview: document.getElementById('conversationAvatarPreview'),
    conversationAvatarInput: document.getElementById('conversationAvatarInput'),
    conversationAvatarRemoveBtn: document.getElementById('conversationAvatarRemoveBtn'),
    conversationTitleInput: document.getElementById('conversationTitleInput'),
    conversationDescriptionInput: document.getElementById('conversationDescriptionInput'),
    conversationNotificationsToggle: document.getElementById('conversationNotificationsToggle'),
    reactionMenu: document.getElementById('reactionMenu'),
    callToggleBtn: document.getElementById('callToggleBtn'),
    callOverlay: document.getElementById('callOverlay'),
  callBody: document.getElementById('callBody'),
    callCloseBtn: document.getElementById('callCloseBtn'),
    callParticipants: document.getElementById('callParticipants'),
    callMedia: document.getElementById('callMedia'),
    callTitle: document.getElementById('callTitle'),
    callSubtitle: document.getElementById('callSubtitle'),
    callMicToggle: document.getElementById('callMicToggle'),
    callScreenToggle: document.getElementById('callScreenToggle'),
    callLeaveBtn: document.getElementById('callLeaveBtn'),
    toast: document.getElementById('toast'),
    pinnedBar: document.getElementById('pinnedBar'),
    messageContextMenu: document.getElementById('messageContextMenu')
  };

  const state = {
    token: localStorage.getItem('pink:token') || null,
    user: null,
    socket: null,
  socketErrorShown: false,
    conversations: new Map(),
    conversationOrder: [],
    membersCache: new Map(),
    messages: new Map(),
    hasMoreHistory: new Map(),
    typing: new Map(),
    typingTimers: new Map(),
    presence: new Map(),
    pendingAttachments: [],
    currentConversationId: null,
    sending: false,
    filter: '',
    searchResults: [],
    searchQuery: '',
    searchTimer: null,
    readTimer: null,
    recording: null,
    recordingTimer: null,
    supportsMediaRecording: false,
    activeMember: null,
    activeMediaAttachment: null,
    folders: [],
    activeFolderId: 'all',
    favorites: [],
    favoritesLoaded: false,
    profileDraft: {
      avatarAttachmentId: null,
      avatarUrl: null,
      removeAvatar: false
    },
    conversationDraft: {
      avatarAttachmentId: null,
      avatarUrl: null,
      removeAvatar: false
    },
    activeCircleVideo: null,
    call: null,
    jitsi: {
      domain: '',
      roomPrefix: 'pink',
      scriptPromise: null,
      api: null
    },
    reactionMenu: {
      messageId: null
    },
    replyTo: null,
    selectedMessages: new Set(),
    contextMenu: {
      messageId: null
    },
    pins: new Map()
  };

  const API_DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
  const ATTACHMENT_KIND_BY_MIME = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    audio: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'],
    video: ['video/webm', 'video/mp4', 'video/quicktime']
  };
  const REACTION_EMOJIS = ['❤️', '👍', '🔥', '👏', '🤣', '😍', '🥰', '🥹', '😮', '😢', '🤔', '🤩', '😡', '🎉', '💯'];

  state.supportsMediaRecording = (() => {
    if (typeof MediaRecorder === 'undefined' || typeof navigator === 'undefined') return false;
    const hasUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!hasUserMedia) return false;
    try {
      const voiceMime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mpeg'];
      const circleMime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const hasMime = [...voiceMime, ...circleMime].some((mime) => MediaRecorder.isTypeSupported?.(mime));
      return hasMime || typeof MediaRecorder.isTypeSupported !== 'function';
    } catch (error) {
      return true;
    }
  })();

  if (!state.supportsMediaRecording) {
    if (elements.voiceRecordBtn) {
      elements.voiceRecordBtn.classList.add('fallback');
    }
    if (elements.circleRecordBtn) {
      elements.circleRecordBtn.classList.add('fallback');
    }
  }

  function initials(text = '') {
    return text
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  function renderSearchResults() {
    if (!elements.searchResults) return;
    const container = elements.searchResults;
    container.innerHTML = '';
    if (state.searchQuery.length < 2) {
      container.classList.add('hidden');
      return;
    }
    if (!state.searchResults.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'Ничего не найдено';
      container.append(empty);
      container.classList.remove('hidden');
      return;
    }
    const fragment = document.createDocumentFragment();
    state.searchResults.forEach((user) => {
      const item = document.createElement('div');
      item.className = 'search-result';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      setAvatar(avatar, {
        url: user.avatarUrl,
        color: user.avatarColor,
        text: initials(user.displayName || user.username)
      });

      const info = document.createElement('div');
      info.className = 'search-result-info';
      const title = document.createElement('strong');
      title.textContent = user.displayName || user.username;
      const subtitle = document.createElement('span');
  subtitle.textContent = `@${user.username} • ID: ${user.publicId}`;
      info.append(title, subtitle);
      if (user.statusMessage) {
        const status = document.createElement('span');
        status.className = 'search-status';
        status.textContent = user.statusMessage;
        info.append(status);
      }
      if (user.bio) {
        const bio = document.createElement('span');
        bio.className = 'member-bio';
        bio.textContent = user.bio;
        info.append(bio);
      }

      const actions = document.createElement('div');
      actions.className = 'search-result-actions';
      const chatBtn = document.createElement('button');
      chatBtn.type = 'button';
      chatBtn.className = 'primary';
      chatBtn.textContent = 'Написать';
      chatBtn.addEventListener('click', () => startDirectChatFromSearch(user));

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'ghost tiny';
      copyBtn.textContent = 'ID';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(user.publicId).then(() => showToast('ID скопирован', 'success'));
        } else {
          showToast('Копирование недоступно', 'error');
        }
      });

      actions.append(chatBtn, copyBtn);
      item.append(avatar, info, actions);
      fragment.append(item);
    });
    container.append(fragment);
    container.classList.remove('hidden');
  }

  function handleSearchQuery(rawValue) {
    const query = rawValue.trim();
    state.searchQuery = query;
    state.searchResults = [];
    if (state.searchTimer) {
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
    }
    if (state.readTimer) {
      clearTimeout(state.readTimer);
      state.readTimer = null;
    }
    if (query.length < 2) {
      renderSearchResults();
      return;
    }
    state.searchTimer = setTimeout(() => performUserSearch(query), 250);
  }

  async function performUserSearch(query) {
    try {
      const data = await apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (state.searchQuery !== query) return;
      state.searchResults = data.users || [];
      renderSearchResults();
    } catch (error) {
      if (state.searchQuery === query) {
        state.searchResults = [];
        renderSearchResults();
      }
    }
  }

  function resetSearchInput() {
    state.searchQuery = '';
    state.searchResults = [];
    state.filter = '';
    if (elements.conversationFilter) {
      elements.conversationFilter.value = '';
    }
    renderConversationList();
    renderSearchResults();
  }

  async function openDirectChat(identifier, options = {}) {
    const value = typeof identifier === 'string' ? identifier.trim() : '';
    if (!value) throw new Error('Укажите логин или ID собеседника');
    const data = await apiRequest('/api/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ username: value })
    });
    if (data?.conversation) {
      upsertConversations([data.conversation]);
      if (options.activate !== false) {
        openConversation(data.conversation.id);
      }
      return data.conversation;
    }
    throw new Error('Не удалось открыть чат');
  }

  async function startDirectChatFromSearch(user) {
    try {
      await openDirectChat(user.publicId || user.username);
      resetSearchInput();
      closeModal(elements.directModal);
      showToast('Личный чат открыт', 'success');
    } catch (error) {
      showToast(error.message || 'Не удалось открыть чат', 'error');
    }
  }

  function formatTime(value) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function buildMessageExcerpt(message) {
    if (!message) return '';
    if (typeof message === 'string') {
      return message.trim().slice(0, 120);
    }
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (content) {
      return content.replace(/\s+/g, ' ').slice(0, 120);
    }
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length === 1) {
      const kind = detectAttachmentKind(attachments[0]);
      if (kind === 'image') return '🖼️ Изображение';
      if (kind === 'audio') return '🎙️ Голосовое сообщение';
      if (kind === 'video') return attachments[0].isCircle ? '📹 Кружок' : '🎬 Видео';
      return '📎 Вложение';
    }
    if (attachments.length > 1) {
      return `📎 ${attachments.length} вложения`;
    }
    return '';
  }

  function setAvatar(node, { url, color, text } = {}) {
    if (!node) return;
    const existingImg = node.querySelector('img[data-avatar-img]');
    if (url) {
      node.classList.add('avatar--image');
      node.style.background = 'transparent';
      node.style.backgroundImage = 'none';
      node.style.backgroundColor = 'transparent';
      node.textContent = '';
      const img = existingImg || document.createElement('img');
      img.dataset.avatarImg = 'true';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.alt = text || 'avatar';
      if (!img.isConnected) {
        node.append(img);
      }
      if (img.src !== url) {
        img.src = url;
      }
    } else {
      node.classList.remove('avatar--image');
      if (existingImg) {
        existingImg.remove();
      }
      node.style.backgroundImage = 'none';
      const bg = color || '#ff7aa2';
      node.style.backgroundColor = bg;
      node.style.background = bg;
      node.textContent = text || '';
    }
  }

  function updateProfileAvatarPreview() {
    if (!elements.profileAvatarPreview) return;
    const baseUser = state.user;
    const hasUpload = Boolean(state.profileDraft.avatarAttachmentId && state.profileDraft.avatarUrl);
    const hasExisting = Boolean(baseUser?.avatarUrl);
    const removePlanned = state.profileDraft.removeAvatar;
    const displayUrl = hasUpload ? state.profileDraft.avatarUrl : removePlanned ? null : baseUser?.avatarUrl;
    const displayName = baseUser?.displayName || baseUser?.username || '';
    setAvatar(elements.profileAvatarPreview, {
      url: displayUrl,
      color: baseUser?.avatarColor,
      text: initials(displayName)
    });
    if (elements.profileAvatarRemoveBtn) {
      elements.profileAvatarRemoveBtn.textContent = hasUpload || (removePlanned && hasExisting) ? 'Отменить' : 'Удалить фото';
      elements.profileAvatarRemoveBtn.disabled = !hasUpload && !hasExisting;
    }
  }

  function resetProfileDraft() {
    state.profileDraft = {
      avatarAttachmentId: null,
      avatarUrl: state.user?.avatarUrl || null,
      removeAvatar: false
    };
    if (elements.profileAvatarInput) {
      elements.profileAvatarInput.value = '';
    }
    updateProfileAvatarPreview();
  }

  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.dataset.type = type;
    elements.toast.classList.remove('hidden');
    elements.toast.style.opacity = '1';
    elements.toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.style.opacity = '0';
      elements.toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => elements.toast.classList.add('hidden'), 200);
    }, 3200);
  }

  function switchAuth(target) {
    elements.authTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.target === target));
    elements.loginForm.classList.toggle('active', target === 'login');
    elements.registerForm.classList.toggle('active', target === 'register');
    elements.authMessage.textContent = '';
  }

  elements.authTabs.forEach((tab) => tab.addEventListener('click', () => switchAuth(tab.dataset.target)));
  document.querySelectorAll('[data-switch]').forEach((node) => node.addEventListener('click', () => switchAuth(node.dataset.switch)));

  function setAuthMessage(text, type = 'error') {
    elements.authMessage.textContent = text;
    elements.authMessage.style.color = type === 'error' ? '#d91c74' : '#35243f';
  }

  function saveSession() {
    if (state.token) localStorage.setItem('pink:token', state.token);
    if (state.user) localStorage.setItem('pink:user', JSON.stringify(state.user));
  }

  function clearSession() {
    state.token = null;
    state.user = null;
    state.conversations.clear();
    state.conversationOrder = [];
    state.membersCache.clear();
    state.messages.clear();
    state.hasMoreHistory.clear();
    state.pendingAttachments = [];
    state.currentConversationId = null;
    state.searchResults = [];
    state.searchQuery = '';
    state.activeMember = null;
    state.activeMediaAttachment = null;
    state.folders = [];
    state.activeFolderId = 'all';
    state.favorites = [];
    state.favoritesLoaded = false;
    state.replyTo = null;
  state.selectedMessages = new Set();
  state.contextMenu = { messageId: null };
  state.pins = new Map();
    state.conversationDraft = {
      avatarAttachmentId: null,
      avatarUrl: null,
      removeAvatar: false
    };
    state.activeCircleVideo = null;
    state.call = null;
    state.jitsi.api = null;
    state.jitsi.scriptPromise = null;
    if (state.searchTimer) {
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
    }
    state.profileDraft = {
      avatarAttachmentId: null,
      avatarUrl: null,
      removeAvatar: false
    };
    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    state.socketErrorShown = false;
    }
    closeMediaViewer();
    localStorage.removeItem('pink:token');
    localStorage.removeItem('pink:user');
    if (elements.conversationFilter) {
      elements.conversationFilter.value = '';
    }
    if (elements.searchResults) {
      elements.searchResults.innerHTML = '';
      elements.searchResults.classList.add('hidden');
    }
    updateProfileAvatarPreview();
    closeCallOverlay();
    closeAllModals();
  }

  function handleUnauthorized() {
    showToast('Требуется авторизация', 'error');
    clearSession();
    showAuth();
  }

  async function apiRequest(path, options = {}) {
    const { skipAuthHandling = false, ...fetchOptions } = options;
    const headers = { ...API_DEFAULT_HEADERS, ...(fetchOptions.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...fetchOptions, headers });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }
    if (response.status === 401) {
      if (!skipAuthHandling) {
        handleUnauthorized();
      }
      throw new Error(data?.message || 'Требуется авторизация');
    }
    if (!response.ok) {
      throw new Error(data?.message || 'Произошла ошибка');
    }
    return data;
  }

  async function updateProfileField(field, value) {
    if (!state.user) {
      throw new Error('Сначала войдите в систему');
    }
    const body = { [field]: value };
    const { user } = await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    applyUser(user);
    saveSession();
    return user;
  }

  async function loadClientConfig() {
    try {
      const response = await fetch('/api/client-config', { credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.jitsi) {
        const domain = typeof data.jitsi.domain === 'string' ? data.jitsi.domain.trim() : '';
        const roomPrefix = typeof data.jitsi.roomPrefix === 'string' ? data.jitsi.roomPrefix.trim() : '';
        state.jitsi.domain = domain;
        state.jitsi.roomPrefix = roomPrefix || 'pink';
        if (elements.callToggleBtn) {
          const hasDomain = Boolean(domain);
          elements.callToggleBtn.title = hasDomain
            ? 'Созвон'
            : 'Добавьте JITSI_DOMAIN в .env, чтобы подключить свой SFU';
        }
      }
    } catch (error) {
      console.warn('Не удалось загрузить конфигурацию клиента', error);
    }
  }

  function tryParseJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }
  async function apiUpload(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.circle) {
      formData.append('circle', 'true');
    }
    if (typeof options.durationMs === 'number' && Number.isFinite(options.durationMs)) {
      formData.append('duration', String(Math.max(0, Math.round(options.durationMs))));
    }
    if (options.waveform) {
      const waveform = Array.isArray(options.waveform) ? options.waveform : tryParseJson(options.waveform);
      if (Array.isArray(waveform)) {
        formData.append('waveform', JSON.stringify(waveform.slice(0, 256)));
      }
    }
    if (options.fileType) {
      formData.append('type', options.fileType);
    }
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
      headers: state.token ? { Authorization: `Bearer ${state.token}` } : undefined
    });
    const data = await response.json();
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Требуется авторизация');
    }
    if (!response.ok) {
      throw new Error(data?.message || 'Не удалось загрузить файл');
    }
    return data.attachment;
  }

  function showAuth() {
    elements.authScreen.classList.remove('hidden');
    elements.appShell.classList.add('hidden');
  }

  function showApp() {
    elements.authScreen.classList.add('hidden');
    elements.appShell.classList.remove('hidden');
  }

  function applyUser(user) {
    state.user = user;
    const displayName = user.displayName || user.username;
    setAvatar(elements.profileAvatar, {
      url: user.avatarUrl,
      color: user.avatarColor,
      text: initials(displayName)
    });
    elements.profileName.textContent = displayName;
    const statusMessage = user.statusMessage || '';
    elements.profileStatus.textContent = statusMessage || 'Без статуса';
    elements.profileStatus.classList.toggle('muted', !statusMessage);
    if (elements.profileBio) {
      if (user.bio) {
        elements.profileBio.textContent = user.bio;
        elements.profileBio.classList.remove('muted');
      } else {
        elements.profileBio.textContent = 'Добавьте о себе пару слов';
        elements.profileBio.classList.add('muted');
      }
    }
    elements.profileCode.textContent = user.publicId || '—';
    resetProfileDraft();
  }

  function placeCaretAtEnd(node) {
    if (!node) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function setupInlineProfileEditor(node, options = {}) {
    if (!node) return;
    const {
      field,
      multiline = false,
      placeholder = '',
      emptyLabel = '',
      maxLength = 160,
      successMessage = 'Профиль обновлён'
    } = options;
    if (!field) return;
    node.classList.add('inline-editable');
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'textbox');
    node.dataset.placeholder = placeholder || emptyLabel || '';
    if (!node.getAttribute('title')) {
      node.setAttribute('title', 'Нажмите, чтобы отредактировать');
    }

    const normalizeValue = (text) => {
      if (!text) return '';
      let value = String(text).replace(/\u00a0/g, ' ');
      if (multiline) {
        value = value.replace(/\r\n/g, '\n');
        value = value
          .split('\n')
          .map((line) => line.replace(/\s+$/g, ''))
          .join('\n');
        value = value.replace(/\n{3,}/g, '\n\n').trim();
      } else {
        value = value.replace(/\s+/g, ' ').trim();
      }
      if (value.length > maxLength) {
        value = value.slice(0, maxLength);
      }
      return value;
    };

    const activateEditor = () => {
      if (!state.user || node.dataset.editing === 'true') return;
      const originalRaw = state.user?.[field] ?? '';
      const originalNormalized = normalizeValue(originalRaw);

      const applyDisplay = (value) => {
        const cleaned = normalizeValue(value);
        if (!cleaned) {
          node.textContent = emptyLabel || placeholder || '';
          node.classList.add('muted');
        } else {
          node.textContent = cleaned;
          node.classList.remove('muted');
        }
      };

      const removeEditingState = () => {
        node.removeEventListener('input', handleInput);
        node.removeEventListener('keydown', handleKeyDown);
        node.removeEventListener('blur', handleBlur);
        node.contentEditable = 'false';
        node.classList.remove('editing');
        node.dataset.editing = 'false';
      };

      const enforceLimit = () => {
        const text = multiline ? node.innerText : node.textContent;
        if (text.length > maxLength) {
          const trimmed = text.slice(0, maxLength);
          if (multiline) {
            node.innerText = trimmed;
          } else {
            node.textContent = trimmed;
          }
          placeCaretAtEnd(node);
        }
      };

      const handleInput = () => {
        enforceLimit();
      };

      const cancelEditing = () => {
        removeEditingState();
        applyDisplay(originalRaw);
        node.blur();
      };

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelEditing();
          return;
        }
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          node.blur();
          return;
        }
        if (multiline && event.key === 'Enter' && event.ctrlKey) {
          event.preventDefault();
          node.blur();
        }
      };

      const handleBlur = async () => {
        const raw = multiline ? node.innerText : node.textContent;
        const value = normalizeValue(raw);
        removeEditingState();
        applyDisplay(value);
        if (value === originalNormalized) {
          return;
        }
        node.classList.add('inline-saving');
        try {
          await updateProfileField(field, value);
          node.classList.remove('inline-saving');
          if (successMessage) {
            showToast(successMessage, 'success');
          }
        } catch (error) {
          node.classList.remove('inline-saving');
          showToast(error.message || 'Не удалось обновить профиль', 'error');
          applyDisplay(originalRaw);
        }
      };

      node.dataset.editing = 'true';
      node.classList.remove('muted');
      node.classList.add('editing');
      node.contentEditable = 'true';
      if (multiline) {
        node.innerText = originalRaw || '';
      } else {
        node.textContent = originalRaw || '';
      }
      node.focus();
      placeCaretAtEnd(node);

      node.addEventListener('input', handleInput);
      node.addEventListener('keydown', handleKeyDown);
      node.addEventListener('blur', handleBlur);
    };

    node.addEventListener('click', (event) => {
      event.preventDefault();
      activateEditor();
    });

    node.addEventListener('keydown', (event) => {
      if (node.dataset.editing === 'true') return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateEditor();
      }
    });
  }

  function serializeForm(form) {
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.loginForm);
      const data = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuthHandling: true
      });
      state.token = data.token;
      applyUser(data.user);
      saveSession();
      await loadProfile();
      showApp();
    } catch (error) {
      setAuthMessage(error.message || 'Не удалось войти');
    }
  });

  elements.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.registerForm);
      const data = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuthHandling: true
      });
      state.token = data.token;
      applyUser(data.user);
      saveSession();
      await loadProfile();
      showApp();
    } catch (error) {
      setAuthMessage(error.message || 'Не удалось создать аккаунт');
    }
  });

  elements.logoutBtn.addEventListener('click', () => {
    clearSession();
    showAuth();
  });

  function openModal(modal) {
    modal.classList.remove('hidden');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    if (modal === elements.memberModal) {
      state.activeMember = null;
    }
  }

  function closeAllModals() {
    [
      elements.profileModal,
      elements.groupModal,
      elements.directModal,
      elements.joinModal,
      elements.memberModal,
      elements.folderModal,
      elements.conversationModal,
      elements.favoritesModal
    ].forEach((modal) => {
      if (modal) modal.classList.add('hidden');
    });
  }

  document.querySelectorAll('.modal [data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.closest('.modal'));
    });
  });

  [
    elements.profileModal,
    elements.groupModal,
    elements.directModal,
    elements.joinModal,
    elements.memberModal,
    elements.folderModal,
    elements.conversationModal,
    elements.favoritesModal
  ].forEach((modal) => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  elements.profileEditBtn.addEventListener('click', () => {
    if (!state.user) return;
    elements.profileForm.displayName.value = state.user.displayName || state.user.username;
    elements.profileForm.statusMessage.value = state.user.statusMessage || '';
    if (elements.profileForm.bio) {
      elements.profileForm.bio.value = state.user.bio || '';
    }
    resetProfileDraft();
    openModal(elements.profileModal);
  });

  elements.profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.profileForm);
      const displayName = (payload.displayName || '').trim();
      if (displayName.length < 2) {
        showToast('Имя должно быть не короче 2 символов', 'error');
        return;
      }
      const statusMessage = typeof payload.statusMessage === 'string' ? payload.statusMessage.trim() : '';
      const bio = typeof payload.bio === 'string' ? payload.bio.trim() : '';
      const body = { displayName, statusMessage, bio };
      if (state.profileDraft.avatarAttachmentId) {
        body.avatarAttachmentId = state.profileDraft.avatarAttachmentId;
      } else if (state.profileDraft.removeAvatar && state.user?.avatarUrl) {
        body.removeAvatar = true;
      }
      const { user } = await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      applyUser(user);
      saveSession();
      closeModal(elements.profileModal);
      showToast('Профиль обновлён', 'success');
    } catch (error) {
      showToast(error.message || 'Не удалось обновить профиль', 'error');
    }
  });

  setupInlineProfileEditor(elements.profileStatus, {
    field: 'statusMessage',
    placeholder: 'Расскажите, чем занимаетесь',
    emptyLabel: 'Без статуса',
    maxLength: 160,
    successMessage: 'Статус обновлён'
  });

  setupInlineProfileEditor(elements.profileBio, {
    field: 'bio',
    multiline: true,
    placeholder: 'Добавьте пару слов о себе',
    emptyLabel: 'Добавьте о себе пару слов',
    maxLength: 500,
    successMessage: 'Описание обновлено'
  });

  if (elements.profileAvatarPreview && elements.profileAvatarInput) {
    elements.profileAvatarPreview.setAttribute('title', 'Загрузить новое фото');
    elements.profileAvatarPreview.addEventListener('click', () => {
      elements.profileAvatarInput.click();
    });

    elements.profileAvatarInput.addEventListener('change', async (event) => {
      const [file] = event.target.files || [];
      if (!file) return;
      try {
  const attachment = await apiUpload(file, { fileType: 'avatar' });
        state.profileDraft.avatarAttachmentId = attachment.id;
        state.profileDraft.avatarUrl = attachment.url;
        state.profileDraft.removeAvatar = false;
        updateProfileAvatarPreview();
        showToast('Фото загружено. Не забудьте сохранить профиль', 'success');
      } catch (error) {
        showToast(error.message || 'Не удалось загрузить фото', 'error');
      } finally {
        event.target.value = '';
      }
    });
  }

  if (elements.profileAvatarRemoveBtn) {
    elements.profileAvatarRemoveBtn.addEventListener('click', () => {
      if (state.profileDraft.avatarAttachmentId) {
        state.profileDraft.avatarAttachmentId = null;
        state.profileDraft.avatarUrl = null;
        state.profileDraft.removeAvatar = false;
        updateProfileAvatarPreview();
        showToast('Предпросмотр удалён', 'info');
        return;
      }
      if (!state.user?.avatarUrl) {
        showToast('Фото пока нет', 'info');
        return;
      }
      state.profileDraft.removeAvatar = !state.profileDraft.removeAvatar;
      updateProfileAvatarPreview();
      showToast(state.profileDraft.removeAvatar ? 'Фото будет удалено после сохранения' : 'Удаление отменено', 'info');
    });
  }

  elements.newGroupBtn.addEventListener('click', () => {
    elements.groupForm.reset();
    openModal(elements.groupModal);
  });

  elements.groupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.groupForm);
      const members = (payload.members || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const body = {
        title: payload.title,
        description: payload.description,
        isPrivate: Boolean(payload.isPrivate),
        members
      };
      const data = await apiRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      closeModal(elements.groupModal);
      showToast('Беседа создана', 'success');
      upsertConversations([data.conversation]);
      openConversation(data.conversation.id);
    } catch (error) {
      showToast(error.message || 'Не удалось создать беседу', 'error');
    }
  });

  elements.newDirectBtn.addEventListener('click', () => {
    elements.directForm.reset();
    openModal(elements.directModal);
  });

  elements.directForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.directForm);
      const identifier = (payload.username || '').trim();
      if (!identifier) {
        showToast('Укажите логин или ID собеседника', 'error');
        return;
      }
      const conversation = await openDirectChat(identifier);
      closeModal(elements.directModal);
      if (conversation) {
        showToast('Личный чат открыт', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Не удалось открыть чат', 'error');
    }
  });

  elements.joinByCodeBtn.addEventListener('click', () => {
    elements.joinForm.reset();
    openModal(elements.joinModal);
  });

  elements.joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = serializeForm(elements.joinForm);
      const data = await apiRequest('/api/conversations/join', {
        method: 'POST',
        body: JSON.stringify({ code: payload.code })
      });
      closeModal(elements.joinModal);
      showToast('Вы присоединились к беседе', 'success');
      upsertConversations([data.conversation]);
      openConversation(data.conversation.id);
    } catch (error) {
      showToast(error.message || 'Не удалось присоединиться', 'error');
    }
  });

  if (elements.memberProfileMessageBtn) {
    elements.memberProfileMessageBtn.addEventListener('click', async () => {
      const member = state.activeMember;
      if (!member || member.id === state.user?.id) return;
      try {
        await openDirectChat(member.publicId || member.username);
        closeModal(elements.memberModal);
        showToast('Личный чат открыт', 'success');
      } catch (error) {
        showToast(error.message || 'Не удалось открыть чат', 'error');
      }
    });
  }

  if (elements.memberProfileCopyBtn) {
    elements.memberProfileCopyBtn.addEventListener('click', () => {
      const value = elements.memberProfileCopyBtn.dataset.copyValue || '';
      if (!value) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(value)
          .then(() => showToast('ID скопирован', 'success'))
          .catch(() => showToast('Не удалось скопировать', 'error'));
      } else {
        showToast('Копирование недоступно', 'error');
      }
    });
  }

  if (elements.mediaViewer) {
    const mediaContent = elements.mediaViewer.querySelector('.media-viewer-content');
    elements.mediaViewer.addEventListener('click', (event) => {
      if (event.target === elements.mediaViewer || event.target.dataset.mediaClose !== undefined) {
        closeMediaViewer();
      }
    });
    mediaContent?.addEventListener('click', (event) => {
      if (event.target.dataset.mediaClose) return;
      event.stopPropagation();
    });
  }

  document.querySelectorAll('[data-media-close]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      closeMediaViewer();
    });
  });

  elements.conversationFilter.addEventListener('input', (event) => {
    const value = event.target.value;
    state.filter = value.toLowerCase();
    renderConversationList();
    handleSearchQuery(value);
  });

  elements.conversationFilter.addEventListener('focus', () => {
    if (state.searchQuery.length >= 2 && state.searchResults.length) {
      renderSearchResults();
    }
  });

  if (elements.folderAllBtn) {
    elements.folderAllBtn.addEventListener('click', () => setActiveFolder('all'));
  }

  if (elements.folderCreateBtn && elements.folderModal && elements.folderForm) {
    elements.folderCreateBtn.addEventListener('click', () => {
      elements.folderForm.reset();
      if (elements.folderColorInput) {
        elements.folderColorInput.value = '#ffacd8';
      }
      openModal(elements.folderModal);
    });

    elements.folderForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const title = elements.folderTitleInput?.value.trim();
        const color = elements.folderColorInput?.value || null;
        if (!title || title.length < 2) {
          showToast('Название папки слишком короткое', 'error');
          return;
        }
        const body = { title };
        if (color) body.color = color;
        const data = await apiRequest('/api/folders', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        if (data?.folders) {
          setFolders(data.folders);
        }
        closeModal(elements.folderModal);
        showToast('Папка создана', 'success');
      } catch (error) {
        showToast(error.message || 'Не удалось создать папку', 'error');
      }
    });
  }

  if (elements.favoritesBtn && elements.favoritesModal) {
    elements.favoritesBtn.addEventListener('click', async () => {
      try {
        await loadFavorites();
        openModal(elements.favoritesModal);
      } catch (error) {
        // Ошибка уже показана в loadFavorites
      }
    });
  }

  if (elements.callToggleBtn) {
    elements.callToggleBtn.addEventListener('click', () => openCallForCurrentConversation());
  }

  if (elements.callCloseBtn) {
    elements.callCloseBtn.addEventListener('click', () => closeCallOverlay({ hangup: true }));
  }

  if (elements.callLeaveBtn) {
    elements.callLeaveBtn.addEventListener('click', () => closeCallOverlay({ hangup: true }));
  }

  if (elements.callMicToggle) {
    elements.callMicToggle.addEventListener('click', () => {
      if (!state.jitsi?.api) {
        showToast('Созвон ещё не запущен', 'error');
        return;
      }
      try {
        state.jitsi.api.executeCommand('toggleAudio');
      } catch (error) {
        console.error('Не удалось переключить микрофон', error);
        showToast('Не удалось переключить микрофон', 'error');
      }
    });
  }

  if (elements.callScreenToggle) {
    elements.callScreenToggle.addEventListener('click', () => {
      if (!state.jitsi?.api) {
        showToast('Созвон ещё не запущен', 'error');
        return;
      }
      try {
        state.jitsi.api.executeCommand('toggleShareScreen');
      } catch (error) {
        console.error('Не удалось переключить демонстрацию экрана', error);
        showToast('Не удалось переключить демонстрацию экрана', 'error');
      }
    });
  }

  document.querySelectorAll('[data-call-close]').forEach((node) => {
    node.addEventListener('click', () => closeCallOverlay({ hangup: true }));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.callOverlay?.classList.contains('hidden')) {
      closeCallOverlay({ hangup: true });
    }
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const targetId = btn.getAttribute('data-copy');
    btn.addEventListener('click', async () => {
      const value = document.getElementById(targetId)?.textContent;
      if (!value) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = value;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          document.body.append(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
        }
        showToast('Скопировано', 'success');
      } catch (error) {
        showToast('Не удалось скопировать', 'error');
      }
    });
  });
  function ensureConversationOrder() {
    const list = Array.from(state.conversations.values());
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    state.conversationOrder = list.map((item) => item.id);
  }

  function upsertConversations(conversations = []) {
    let changed = false;
    conversations.forEach((conversation) => {
      if (!conversation || !conversation.id) return;
      const merged = { ...state.conversations.get(conversation.id), ...conversation };
      state.conversations.set(conversation.id, merged);
      if (conversation.members) {
        state.membersCache.set(conversation.id, conversation.members);
      }
      changed = true;
    });
    if (changed) {
      ensureConversationOrder();
      renderConversationList();
      if (state.currentConversationId && state.conversations.has(state.currentConversationId)) {
        updateConversationHeader(state.currentConversationId);
      }
    }
  }

  function conversationDisplay(conversation) {
    const members = state.membersCache.get(conversation.id) || [];
    let title = conversation.title;
    let subtitle = '';
    let avatarColor = '#ff82c3';
    let avatarText = initials(title);
    let avatarUrl = conversation.avatarUrl || null;

    if (conversation.type === 'direct') {
      const other = members.find((member) => member.id !== state.user?.id);
      if (other) {
        title = other.displayName || other.username;
        subtitle = buildPresence(other);
        avatarColor = other.avatarColor || avatarColor;
        avatarText = initials(title);
        avatarUrl = other.avatarUrl || avatarUrl;
      }
    } else {
      subtitle = `${members.length} участников • код ${conversation.shareCode}`;
    }

    if (conversation.lastMessage) {
      const author = conversation.lastMessage.user?.displayName || conversation.lastMessage.user?.username || '—';
      const fragment = (conversation.lastMessage.content || '').slice(0, 60);
      subtitle = `${author}: ${fragment || '[вложение]'}`;
    }

    return { title, subtitle, avatarColor, avatarText, avatarUrl };
  }

  function buildPresence(member) {
    const presence = state.presence.get(member.id);
    if (presence?.status === 'online') return 'Онлайн';
    const lastSeen = presence?.lastSeen || member.lastSeen;
    if (lastSeen) return `Был в сети ${formatDate(lastSeen)}`;
    return member.statusMessage || 'Не в сети';
  }

  function openMemberProfile(member) {
    if (!member || !elements.memberModal) return;
    state.activeMember = member;
    const name = member.displayName || member.username || 'Участник';
    const status = member.statusMessage || `@${member.username || 'неизвестно'}`;
    const presenceText = buildPresence(member);
    const bio = typeof member.bio === 'string' ? member.bio.trim() : '';

    if (elements.memberProfileAvatar) {
      setAvatar(elements.memberProfileAvatar, {
        url: member.avatarUrl,
        color: member.avatarColor,
        text: initials(name)
      });
    }

    if (elements.memberProfileName) {
      elements.memberProfileName.textContent = name;
    }
    if (elements.memberProfileStatus) {
      elements.memberProfileStatus.textContent = status;
      elements.memberProfileStatus.classList.toggle('muted', !member.statusMessage);
    }
    if (elements.memberProfilePresence) {
      elements.memberProfilePresence.textContent = presenceText;
    }
    if (elements.memberProfileBio) {
      elements.memberProfileBio.textContent = bio || 'У этого участника пока нет описания.';
      elements.memberProfileBio.classList.toggle('muted', !bio);
    }

    const isSelf = member.id === state.user?.id;
    if (elements.memberProfileMessageBtn) {
      elements.memberProfileMessageBtn.disabled = isSelf;
      elements.memberProfileMessageBtn.textContent = isSelf ? 'Это вы' : 'Написать';
      elements.memberProfileMessageBtn.title = isSelf ? 'Нельзя написать самому себе' : 'Открыть личный чат';
    }

    if (elements.memberProfileCopyBtn) {
      const copyValue = member.publicId || member.username || '';
      elements.memberProfileCopyBtn.dataset.copyValue = copyValue;
      elements.memberProfileCopyBtn.disabled = !copyValue;
      elements.memberProfileCopyBtn.title = copyValue ? 'Скопировать публичный ID участника' : 'ID недоступен';
    }

    openModal(elements.memberModal);
  }

  function getActiveFolder() {
    if (state.activeFolderId === 'all') return null;
    const idNum = Number(state.activeFolderId);
    return state.folders.find((folder) => Number(folder.id) === idNum) || null;
  }

  function setFolders(folders = []) {
    const normalized = Array.isArray(folders)
      ? folders.map((folder) => ({
          id: folder.id,
          title: folder.title,
          color: folder.color || null,
          conversations: Array.isArray(folder.conversations)
            ? folder.conversations.map((value) => Number(value))
            : []
        }))
      : [];
    state.folders = normalized;
    const activeFolder = getActiveFolder();
    if (!activeFolder && state.activeFolderId !== 'all') {
      state.activeFolderId = 'all';
    }
    renderFolderChips();
    if (state.currentConversationId) {
      renderConversationFolders(state.currentConversationId);
    }
    renderConversationList();
  }

  async function loadFolders() {
    try {
      const data = await apiRequest('/api/folders');
      setFolders(data?.folders || []);
    } catch (error) {
      console.warn('Не удалось загрузить папки', error);
    }
  }

  function renderFolderChips() {
    if (!elements.folderList) return;
    elements.folderList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    state.folders.forEach((folder) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.dataset.folderId = String(folder.id);
      button.textContent = folder.title;
      if (folder.color) {
        button.style.borderColor = folder.color;
        button.style.color = folder.color;
      }
      if (String(state.activeFolderId) === String(folder.id)) {
        button.classList.add('active');
      }
      button.addEventListener('click', () => setActiveFolder(folder.id));
      fragment.append(button);
    });
    elements.folderList.append(fragment);
    if (elements.folderAllBtn) {
      elements.folderAllBtn.classList.toggle('active', state.activeFolderId === 'all');
    }
  }

  function setActiveFolder(folderId) {
    const resolved = folderId == null ? 'all' : folderId;
    state.activeFolderId = resolved === 'all' ? 'all' : Number(resolved);
    renderFolderChips();
    renderConversationList();
  }

  function renderConversationList() {
    const filter = state.filter;
    elements.conversationList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const activeFolder = getActiveFolder();
    const allowed = activeFolder ? new Set(activeFolder.conversations) : null;

    state.conversationOrder.forEach((conversationId) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return;
      if (allowed && !allowed.has(conversation.id)) return;
      const display = conversationDisplay(conversation);
      const haystack = `${display.title} ${display.subtitle}`.toLowerCase();
      if (filter && !haystack.includes(filter)) return;

      const item = document.createElement('div');
      item.className = 'conversation-item';
      if (state.currentConversationId === conversation.id) item.classList.add('active');
      item.dataset.conversationId = conversation.id;

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      setAvatar(avatar, {
        url: display.avatarUrl,
        color: display.avatarColor,
        text: display.avatarText
      });

      const meta = document.createElement('div');
      meta.className = 'conversation-meta';
      const title = document.createElement('h4');
      title.textContent = display.title;
      const subtitle = document.createElement('p');
      subtitle.textContent = display.subtitle;
      meta.append(title, subtitle);

      const unreadCount = Number(conversation.unreadCount || 0);
      if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        item.append(avatar, meta, badge);
      } else {
        item.append(avatar, meta);
      }

      fragment.append(item);
    });

    if (!fragment.children.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'form-helper';
      placeholder.textContent = state.filter ? 'Нет результатов' : 'Беседы появятся здесь, как только вы создадите новую или присоединитесь по коду.';
      elements.conversationList.append(placeholder);
    } else {
      elements.conversationList.append(fragment);
    }
  }

  elements.conversationList.addEventListener('click', (event) => {
    const item = event.target.closest('.conversation-item');
    if (!item) return;
    openConversation(Number(item.dataset.conversationId));
  });

  async function fetchMembers(conversationId) {
    if (state.membersCache.has(conversationId)) {
      return state.membersCache.get(conversationId);
    }
    const data = await apiRequest(`/api/conversations/${conversationId}`);
    if (data?.conversation) {
      upsertConversations([data.conversation]);
      state.membersCache.set(conversationId, data.conversation.members || []);
    }
    return state.membersCache.get(conversationId) || [];
  }

  async function loadMessages(conversationId, { before } = {}) {
    const params = new URLSearchParams();
    const limit = before ? 60 : 30;
    params.append('limit', String(limit));
    if (before) params.append('before', before);
    const data = await apiRequest(`/api/conversations/${conversationId}/messages?${params.toString()}`);
    const list = data?.messages || [];
    const current = state.messages.get(conversationId) || [];
    if (before) {
      state.messages.set(conversationId, [...list, ...current]);
    } else {
      state.messages.set(conversationId, list);
    }
    state.hasMoreHistory.set(conversationId, list.length >= limit);
    return list;
  }

  function renderMembers(conversationId) {
    const members = state.membersCache.get(conversationId) || [];
    elements.memberList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    members.forEach((member) => {
      const item = document.createElement('li');
      item.className = 'member-item';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      setAvatar(avatar, {
        url: member.avatarUrl,
        color: member.avatarColor || '#ffacd8',
        text: initials(member.displayName || member.username)
      });
      const info = document.createElement('div');
      info.className = 'member-info';
      const name = document.createElement('strong');
      name.textContent = member.displayName || member.username;
      info.append(name);
      if (member.bio) {
        const bio = document.createElement('div');
        bio.className = 'member-bio';
        bio.textContent = member.bio;
        info.append(bio);
      }
      const presence = document.createElement('small');
      presence.textContent = buildPresence(member);
      info.append(presence);
      item.append(avatar, info);
      item.dataset.memberId = member.id;
      item.tabIndex = 0;
  item.setAttribute('role', 'button');
      item.addEventListener('click', () => openMemberProfile(member));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMemberProfile(member);
        }
      });
      fragment.append(item);
    });
    elements.memberList.append(fragment);
  }

  async function toggleConversationFolder(folderId, conversationId, shouldHave, button) {
    if (!folderId || !conversationId) return;
    if (button) {
      button.disabled = true;
      button.classList.add('loading');
    }
    try {
      if (shouldHave) {
        const data = await apiRequest(`/api/folders/${folderId}/conversations`, {
          method: 'POST',
          body: JSON.stringify({ conversationId })
        });
        if (data?.folders) {
          setFolders(data.folders);
        }
        showToast('Добавлено в папку', 'success');
      } else {
        const data = await apiRequest(`/api/folders/${folderId}/conversations/${conversationId}`, {
          method: 'DELETE'
        });
        if (data?.folders) {
          setFolders(data.folders);
        }
        showToast('Удалено из папки', 'info');
      }
    } catch (error) {
      showToast(error.message || 'Не удалось обновить папку', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('loading');
      }
    }
  }

  function renderConversationFolders(conversationId) {
    if (!elements.detailsFolders) return;
    const folders = state.folders;
    if (!folders.length) {
      elements.detailsFolders.classList.add('hidden');
      elements.detailsFolders.innerHTML = '';
      return;
    }
    const active = new Set(
      folders
        .filter((folder) => folder.conversations.includes(conversationId))
        .map((folder) => folder.id)
    );
    elements.detailsFolders.classList.remove('hidden');
    elements.detailsFolders.innerHTML = '';
    const title = document.createElement('h4');
    title.className = 'details-section-title';
    title.textContent = 'Папки';
    const list = document.createElement('div');
    list.className = 'details-folders-list';
    folders.forEach((folder) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip folder-chip';
      button.textContent = folder.title;
      button.dataset.folderId = String(folder.id);
      if (folder.color) {
        button.style.borderColor = folder.color;
        button.style.color = folder.color;
      }
      if (active.has(folder.id)) {
        button.classList.add('active');
      }
      button.addEventListener('click', () => {
        const shouldHave = !active.has(folder.id);
        toggleConversationFolder(folder.id, conversationId, shouldHave, button);
      });
      list.append(button);
    });
    elements.detailsFolders.append(title, list);
  }

  async function loadFavorites(force = false) {
    if (state.favoritesLoaded && !force) {
      renderFavorites();
      return state.favorites;
    }
    try {
      const data = await apiRequest('/api/favorites');
      state.favorites = Array.isArray(data?.favorites) ? data.favorites : [];
      state.favoritesLoaded = true;
      renderFavorites();
      return state.favorites;
    } catch (error) {
      showToast(error.message || 'Не удалось загрузить избранное', 'error');
      throw error;
    }
  }

  function renderFavorites() {
    if (!elements.favoritesList) return;
    const favorites = state.favorites;
    elements.favoritesList.innerHTML = '';
    if (!favorites.length) {
      const empty = document.createElement('div');
      empty.className = 'favorites-empty';
      empty.textContent = 'Пока что здесь пусто. Добавьте сообщение в избранное, чтобы увидеть его здесь.';
      elements.favoritesList.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    favorites.forEach((message) => {
      const item = document.createElement('article');
      item.className = 'favorites-item';
      const header = document.createElement('div');
      header.className = 'favorite-meta';
      const conversation = state.conversations.get(message.conversationId);
      const title = conversation ? conversationDisplay(conversation).title : 'Беседа';
      const author = message.user?.displayName || message.user?.username || 'Вы';
      header.innerHTML = `<span>${title}</span><span>${author} • ${formatDate(message.createdAt)}</span>`;
      item.append(header);

      if (message.content) {
        const text = document.createElement('div');
        text.className = 'favorite-text';
        text.textContent = message.content;
        item.append(text);
      }

      const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, 7) : [];
      if (attachments.length) {
        const gallery = document.createElement('div');
        gallery.className = 'favorites-gallery';
        attachments.forEach((attachment) => {
          const node = renderAttachmentNode(attachment);
          if (node) {
            node.classList.add('favorite-media');
            gallery.append(node);
          }
        });
        item.append(gallery);
      }

      fragment.append(item);
    });
    elements.favoritesList.append(fragment);
  }

  function updateConversationHeader(conversationId) {
    const conversation = state.conversations.get(conversationId);
    if (!conversation) return;
    const display = conversationDisplay(conversation);
    setAvatar(elements.conversationAvatar, {
      url: display.avatarUrl,
      color: display.avatarColor,
      text: display.avatarText
    });
    elements.conversationTitle.textContent = display.title;
    elements.conversationMeta.textContent = display.subtitle;
    elements.conversationCode.textContent = conversation.shareCode || '—';
  }

  function renderMessages(conversationId) {
    const messages = state.messages.get(conversationId) || [];
    elements.messageList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
      fragment.append(renderMessage(message));
    });
    elements.messageList.append(fragment);
    const hasMore = state.hasMoreHistory.get(conversationId);
    elements.loadMoreBtn.classList.toggle('hidden', !hasMore);
  }
  function renderMessage(message) {
    const isOwn = message.user?.id === state.user?.id;
    const item = document.createElement('article');
    item.className = 'message';
    if (isOwn) item.classList.add('own');
    item.dataset.messageId = message.id;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    setAvatar(avatar, {
      url: message.user?.avatarUrl,
      color: message.user?.avatarColor,
      text: initials(message.user?.displayName || message.user?.username)
    });

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const author = document.createElement('span');
    author.textContent = message.user?.displayName || message.user?.username || '—';
    const time = document.createElement('span');
    time.textContent = formatTime(message.createdAt);
    meta.append(author, time);
    bubble.append(meta);

    if (message.deletedAt) {
      const deleted = document.createElement('div');
      deleted.className = 'text';
      deleted.style.fontStyle = 'italic';
      deleted.style.opacity = '0.6';
      deleted.textContent = 'Сообщение удалено';
      bubble.append(deleted);
    } else {
      if (message.replyTo) {
        const replySnippet = document.createElement('button');
        replySnippet.type = 'button';
        replySnippet.className = 'reply-snippet';
        replySnippet.dataset.replyId = message.replyTo.id ? String(message.replyTo.id) : '';
        const author = document.createElement('strong');
        author.textContent = message.replyTo.user?.displayName || message.replyTo.user?.username || 'Сообщение';
        const preview = document.createElement('span');
        preview.textContent = buildMessageExcerpt(message.replyTo) || 'Предпросмотр недоступен';
        replySnippet.append(author, preview);
        replySnippet.addEventListener('click', () => {
          if (message.replyTo?.id) {
            focusMessage(message.replyTo.id);
          }
        });
        bubble.append(replySnippet);
      }
      if (message.content) {
        const text = document.createElement('div');
        text.className = 'text';
        text.innerHTML = escapeHtml(message.content).replace(/\n/g, '<br>');
        bubble.append(text);
      }
      if (message.attachments?.length) {
        const bar = document.createElement('div');
        bar.className = 'attachments';
        message.attachments.forEach((attachment) => {
          const node = renderAttachmentNode(attachment);
          if (node) bar.append(node);
        });
        bubble.append(bar);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const reactBtn = document.createElement('button');
    reactBtn.type = 'button';
    reactBtn.className = 'action-react';
    reactBtn.dataset.messageId = String(message.id);
    reactBtn.setAttribute('aria-label', 'Реакции на сообщение');
    reactBtn.title = 'Добавить реакцию';
    reactBtn.innerHTML = REACTION_EMOJIS.slice(0, 6)
      .map((emoji) => `<span>${emoji}</span>`)
      .join('');
    actions.append(reactBtn);
    if (!message.deletedAt && isOwn) {
      const favoriteBtn = document.createElement('button');
      favoriteBtn.type = 'button';
      favoriteBtn.className = 'action-favorite';
      favoriteBtn.textContent = message.isFavorite ? '★' : '☆';
      if (message.isFavorite) {
        favoriteBtn.classList.add('active');
      }
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'action-edit';
      editBtn.textContent = 'Изменить';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'action-delete';
      deleteBtn.textContent = 'Удалить';
      actions.append(favoriteBtn, editBtn, deleteBtn);
    }
    bubble.append(actions);

    if (message.reactions?.length) {
      const bar = document.createElement('div');
      bar.className = 'reaction-bar';
      message.reactions.forEach((reaction) => {
        const chip = document.createElement('span');
        chip.className = 'reaction-chip';
        if (reaction.reacted) chip.classList.add('active');
        chip.textContent = `${reaction.emoji} ${reaction.count}`;
        bar.append(chip);
      });
      bubble.append(bar);
    }

    if (isOwn) {
      item.append(bubble, avatar);
    } else {
      item.append(avatar, bubble);
    }

    return item;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusMessage(messageId) {
    if (!messageId || !elements.messageList) return;
    const node = elements.messageList.querySelector(`[data-message-id="${messageId}"]`);
    if (!node) return;
    node.classList.add('focus');
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      node.classList.remove('focus');
    }, 1200);
  }

  function scrollToBottom(force = false) {
    if (!elements.messageScroller) return;
    if (force) {
      elements.messageScroller.scrollTop = elements.messageScroller.scrollHeight;
      return;
    }
    const threshold = elements.messageScroller.scrollHeight - elements.messageScroller.clientHeight - 120;
    if (elements.messageScroller.scrollTop > threshold) {
      elements.messageScroller.scrollTop = elements.messageScroller.scrollHeight;
    }
  }

  elements.loadMoreBtn.addEventListener('click', async () => {
    const conversationId = state.currentConversationId;
    if (!conversationId) return;
    const list = state.messages.get(conversationId) || [];
    const oldest = list[0];
    if (!oldest) return;
    const previousHeight = elements.messageScroller.scrollHeight;
    await loadMessages(conversationId, { before: oldest.id });
    renderMessages(conversationId);
    const diff = elements.messageScroller.scrollHeight - previousHeight;
    elements.messageScroller.scrollTop = diff + elements.messageScroller.scrollTop;
  });

  elements.messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.sending) return;
    const conversationId = state.currentConversationId;
    if (!conversationId) return;
    const content = elements.messageInput.value.trim();
    const attachments = state.pendingAttachments.map((file) => file.id);
    if (!content && !attachments.length) return;

    state.sending = true;
    state.socket?.emit('typing:stop', { conversationId });

    state.socket?.emit('message:create', { conversationId, content, attachments }, (response) => {
      state.sending = false;
      if (!response?.ok) {
        showToast(response?.message || 'Не удалось отправить сообщение', 'error');
        return;
      }
      elements.messageInput.value = '';
      state.pendingAttachments = [];
      renderAttachmentBar();
      scrollToBottom(true);
    });
  });

  elements.attachmentInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      for (const file of files.slice(0, 5)) {
        const attachment = await apiUpload(file, { fileType: 'message' });
        state.pendingAttachments.push(attachment);
      }
      renderAttachmentBar();
    } catch (error) {
      showToast(error.message || 'Не удалось загрузить файл', 'error');
    } finally {
      elements.attachmentInput.value = '';
    }
  });

  if (elements.voiceFallbackInput) {
    elements.voiceFallbackInput.addEventListener('change', (event) => handleFallbackSelection(event, 'voice'));
  }

  if (elements.circleFallbackInput) {
    elements.circleFallbackInput.addEventListener('change', (event) => handleFallbackSelection(event, 'circle'));
  }

  if (elements.voiceRecordBtn) {
    elements.voiceRecordBtn.addEventListener('click', async () => {
      if (!state.supportsMediaRecording) {
        triggerFallbackRecording('voice');
        setRecordingButtonState(null);
        return;
      }
      if (state.recording?.type === 'voice') {
        await stopRecording();
      } else {
        await startRecording('voice');
      }
    });
  }

  if (elements.circleRecordBtn) {
    elements.circleRecordBtn.addEventListener('click', async () => {
      if (!state.supportsMediaRecording) {
        triggerFallbackRecording('circle');
        setRecordingButtonState(null);
        return;
      }
      if (state.recording?.type === 'circle') {
        await stopRecording();
      } else {
        await startRecording('circle');
      }
    });
  }

  if (elements.recordingStopBtn) {
    elements.recordingStopBtn.addEventListener('click', () => {
      stopRecording();
    });
  }

  function renderAttachmentBar() {
    if (!state.pendingAttachments.length) {
      elements.attachmentBar.classList.add('hidden');
      elements.attachmentBar.innerHTML = '';
      return;
    }
    elements.attachmentBar.classList.remove('hidden');
    elements.attachmentBar.innerHTML = '';
    state.pendingAttachments.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.innerHTML = `<span>${attachmentIcon(file)} ${file.originalName || 'Файл'}</span>`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        state.pendingAttachments.splice(index, 1);
        renderAttachmentBar();
      });
      chip.append(remove);
      elements.attachmentBar.append(chip);
    });
  }

  function setRecordingButtonState(activeType) {
    if (activeType && !state.supportsMediaRecording) {
      activeType = null;
    }
    if (elements.voiceRecordBtn) {
      elements.voiceRecordBtn.classList.toggle('active', activeType === 'voice');
    }
    if (elements.circleRecordBtn) {
      elements.circleRecordBtn.classList.toggle('active', activeType === 'circle');
    }
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function updateRecordingIndicator() {
    if (!elements.recordingIndicator) return;
    const recording = state.recording;
    if (!recording) {
      elements.recordingIndicator.classList.add('hidden');
      if (elements.recordingStatus) elements.recordingStatus.textContent = '00:00';
      if (elements.recordingType) elements.recordingType.textContent = '';
      return;
    }
    elements.recordingIndicator.classList.remove('hidden');
    if (elements.recordingStatus) {
      const elapsed = Date.now() - recording.startedAt;
      elements.recordingStatus.textContent = formatDuration(elapsed);
    }
    if (elements.recordingType) {
      elements.recordingType.textContent = recording.type === 'voice' ? 'Голос' : 'Кружок';
    }
  }

  function triggerFallbackRecording(type) {
    const input = type === 'voice' ? elements.voiceFallbackInput : elements.circleFallbackInput;
    if (input) {
      input.click();
    } else {
      showToast('Запись не поддерживается в этом браузере', 'error');
    }
  }

  function extractMediaDuration(file) {
    return new Promise((resolve) => {
      if (!file || typeof URL === 'undefined') {
        resolve(null);
        return;
      }
      const type = file.type || '';
      if (!type.startsWith('audio') && !type.startsWith('video')) {
        resolve(null);
        return;
      }
      const element = document.createElement(type.startsWith('video') ? 'video' : 'audio');
      let settled = false;
      const cleanup = () => {
        if (element.src) {
          URL.revokeObjectURL(element.src);
        }
      };
      element.preload = 'metadata';
      element.muted = true;
      element.onloadedmetadata = () => {
        if (settled) return;
        settled = true;
        const duration = Number.isFinite(element.duration) && element.duration > 0 ? Math.round(element.duration * 1000) : null;
        cleanup();
        resolve(duration);
      };
      element.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(null);
      };
      element.src = URL.createObjectURL(file);
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 5000);
    });
  }

  async function handleFallbackSelection(event, type) {
    const input = event.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const file = files[0];
    try {
      const kind = (file.type || '').split('/')[0];
      if (type === 'voice' && kind !== 'audio') {
        showToast('Выберите аудиофайл', 'error');
        return;
      }
      if (type === 'circle' && kind !== 'video') {
        showToast('Выберите видеофайл', 'error');
        return;
      }
      const durationMs = await extractMediaDuration(file);
      const uploadOptions = { fileType: type, durationMs };
      if (type === 'circle') uploadOptions.circle = true;
      const attachment = await apiUpload(file, uploadOptions);
      state.pendingAttachments.push(attachment);
      renderAttachmentBar();
      showToast(type === 'voice' ? 'Голосовое добавлено' : 'Кружок добавлен', 'success');
    } catch (error) {
      console.error('Fallback upload failed', error);
      showToast(error.message || 'Не удалось загрузить файл', 'error');
    } finally {
      input.value = '';
    }
  }

  function getRecorderMimeType(type) {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
    const candidates = type === 'voice'
      ? ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || null;
  }

  async function startRecording(type) {
    if (!state.supportsMediaRecording) {
      triggerFallbackRecording(type);
      return;
    }
    if (state.recording) {
      await stopRecording({ cancel: true });
    }
    try {
      const constraints = type === 'voice'
        ? { audio: true }
        : { audio: true, video: { facingMode: 'user' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mimeType = getRecorderMimeType(type);
  const options = mimeType ? { mimeType } : undefined;
  const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      const chunks = [];
      const recording = {
        type,
        recorder,
        stream,
        chunks,
        startedAt: Date.now(),
        canceled: false,
        resolve: null,
        timeoutId: null
      };
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => finalizeRecording(recording);
      recorder.start();
      state.recording = recording;
      setRecordingButtonState(type);
      updateRecordingIndicator();
      if (state.recordingTimer) clearInterval(state.recordingTimer);
      state.recordingTimer = setInterval(updateRecordingIndicator, 200);
  const maxDuration = 60000;
      recording.timeoutId = setTimeout(() => {
        stopRecording();
        showToast('Время записи истекло', 'info');
      }, maxDuration);
      showToast(type === 'voice' ? 'Запись голосового...' : 'Запись кружка...', 'info');
    } catch (error) {
      console.error('Запуск записи не удался', error);
      showToast('Нужно разрешить доступ к микрофону/камере', 'error');
      triggerFallbackRecording(type);
      setRecordingButtonState(null);
      state.recording = null;
      updateRecordingIndicator();
    }
  }

  function stopRecording({ cancel = false } = {}) {
    return new Promise((resolve) => {
      const recording = state.recording;
      if (!recording) {
        resolve();
        return;
      }
      recording.canceled = cancel;
      recording.resolve = resolve;
      if (state.recordingTimer) {
        clearInterval(state.recordingTimer);
        state.recordingTimer = null;
      }
      if (recording.timeoutId) {
        clearTimeout(recording.timeoutId);
        recording.timeoutId = null;
      }
      if (recording.recorder.state !== 'inactive') {
        recording.recorder.stop();
      } else {
        finalizeRecording(recording);
      }
    });
  }

  async function finalizeRecording(recording) {
    try {
      recording.stream?.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn('Не удалось остановить дорожку медиа', error);
    }
    setRecordingButtonState(null);
    if (state.recording === recording) {
      state.recording = null;
    }
    updateRecordingIndicator();

    if (recording.canceled) {
      recording.resolve?.();
      return;
    }

    const mimeType = recording.recorder.mimeType || (recording.type === 'voice' ? 'audio/webm' : 'video/webm');
    const blob = new Blob(recording.chunks, { type: mimeType });
    if (!blob.size) {
      showToast('Запись пуста', 'error');
      recording.resolve?.();
      return;
    }

    const fileName = recording.type === 'voice'
      ? `voice-${Date.now()}.webm`
      : `circle-${Date.now()}.webm`;
    const file = new File([blob], fileName, { type: blob.type || mimeType });
    const durationMs = Math.max(0, Date.now() - recording.startedAt);
    const uploadOptions = { fileType: recording.type, durationMs };
    if (recording.type === 'circle') {
      uploadOptions.circle = true;
    }

    try {
      const attachment = await apiUpload(file, uploadOptions);
      state.pendingAttachments.push(attachment);
      renderAttachmentBar();
      showToast(recording.type === 'voice' ? 'Голосовое готово' : 'Кружок готов', 'success');
    } catch (error) {
      console.error('Не удалось загрузить запись', error);
      showToast(error.message || 'Не удалось сохранить запись', 'error');
    }

    recording.resolve?.();
  }

  function detectAttachmentKind(attachment) {
    if (attachment?.kind) return attachment.kind;
    const mime = (attachment?.mimeType || '').split(';')[0];
    if (!mime) return 'file';
    if (ATTACHMENT_KIND_BY_MIME.image.includes(mime)) return 'image';
    if (ATTACHMENT_KIND_BY_MIME.audio.includes(mime)) return 'audio';
    if (ATTACHMENT_KIND_BY_MIME.video.includes(mime)) return 'video';
    return 'file';
  }

  function attachmentIcon(attachment) {
    const kind = detectAttachmentKind(attachment);
    if (kind === 'image') return '🖼️';
    if (kind === 'audio') return '🎙️';
    if (kind === 'video') return '🎬';
    return '📎';
  }

  function decorateMediaPreview(node, attachment, kind) {
    if (!node || !attachment?.url) return node;
    const mediaKind = kind || detectAttachmentKind(attachment);
    if (mediaKind !== 'image' && !attachment.isCircle) return node;
    if (attachment.id) {
      node.dataset.attachmentId = String(attachment.id);
    }
    node.dataset.attachmentUrl = attachment.url;
    if (attachment.originalName) {
      node.dataset.attachmentName = attachment.originalName;
    }
    node.dataset.attachmentKind = mediaKind;
    if (attachment.isCircle) {
      node.dataset.attachmentCircle = 'true';
    }
    node.classList.add('media-preview');
    return node;
  }

  function findAttachmentByNode(message, node) {
    if (!message?.attachments?.length || !node) return null;
    const { attachmentId, attachmentUrl } = node.dataset;
    return message.attachments.find((item) => {
      if (attachmentId && String(item.id) === attachmentId) return true;
      if (attachmentUrl && item.url === attachmentUrl) return true;
      return false;
    }) || null;
  }

  function openMediaViewer(attachment) {
    if (!attachment?.url || !elements.mediaViewer) return;
    state.activeMediaAttachment = attachment;
    const viewer = elements.mediaViewer;
    const kind = detectAttachmentKind(attachment);
    const caption = attachment.originalName || (kind === 'image' ? 'Изображение' : 'Вложение');

    if (elements.mediaViewerImage) {
      elements.mediaViewerImage.classList.add('hidden');
      elements.mediaViewerImage.src = '';
      elements.mediaViewerImage.alt = '';
    }
    if (elements.mediaViewerVideo) {
      elements.mediaViewerVideo.pause();
      elements.mediaViewerVideo.classList.add('hidden');
      elements.mediaViewerVideo.removeAttribute('src');
      elements.mediaViewerVideo.removeAttribute('muted');
      elements.mediaViewerVideo.removeAttribute('playsinline');
      elements.mediaViewerVideo.loop = false;
      elements.mediaViewerVideo.load();
    }

    const isVideo = kind === 'video';
    if (isVideo && elements.mediaViewerVideo) {
      elements.mediaViewerVideo.src = attachment.url;
      if (attachment.isCircle) {
        elements.mediaViewerVideo.setAttribute('playsinline', 'true');
        elements.mediaViewerVideo.setAttribute('muted', 'true');
        elements.mediaViewerVideo.loop = true;
      } else {
        elements.mediaViewerVideo.removeAttribute('muted');
        elements.mediaViewerVideo.removeAttribute('playsinline');
        elements.mediaViewerVideo.loop = false;
      }
      elements.mediaViewerVideo.classList.remove('hidden');
      elements.mediaViewerVideo.load();
    } else if (elements.mediaViewerImage) {
      elements.mediaViewerImage.src = attachment.url;
      elements.mediaViewerImage.alt = caption;
      elements.mediaViewerImage.classList.remove('hidden');
    }

    if (elements.mediaViewerCaption) {
      elements.mediaViewerCaption.textContent = caption;
    }
    if (elements.mediaViewerDownload) {
      elements.mediaViewerDownload.href = attachment.url;
      if (attachment.originalName) {
        elements.mediaViewerDownload.setAttribute('download', attachment.originalName);
      } else {
        elements.mediaViewerDownload.setAttribute('download', 'media');
      }
    }

    document.body.classList.add('media-viewer-open');
    viewer.classList.remove('hidden');
  }

  function closeMediaViewer() {
    if (!elements.mediaViewer) return;
    if (elements.mediaViewerVideo) {
      elements.mediaViewerVideo.pause();
      elements.mediaViewerVideo.classList.add('hidden');
      elements.mediaViewerVideo.removeAttribute('src');
      elements.mediaViewerVideo.load();
    }
    if (elements.mediaViewerImage) {
      elements.mediaViewerImage.classList.add('hidden');
      elements.mediaViewerImage.src = '';
      elements.mediaViewerImage.alt = '';
    }
    if (elements.mediaViewerCaption) {
      elements.mediaViewerCaption.textContent = '';
    }
    if (elements.mediaViewerDownload) {
      elements.mediaViewerDownload.removeAttribute('href');
      elements.mediaViewerDownload.removeAttribute('download');
    }
    state.activeMediaAttachment = null;
    elements.mediaViewer.classList.add('hidden');
    document.body.classList.remove('media-viewer-open');
  }

  function renderAttachmentNode(attachment) {
    if (!attachment) return null;
    if (!attachment.url) {
      const placeholder = document.createElement('span');
      placeholder.className = 'attachment-file';
      placeholder.textContent = `${attachmentIcon(attachment)} ${attachment.originalName || 'Вложение'}`;
      return placeholder;
    }
    const kind = detectAttachmentKind(attachment);
    if (attachment.isCircle && kind === 'image') {
      const wrapper = document.createElement('div');
      wrapper.className = 'attachment-circle';
      const img = document.createElement('img');
      img.src = attachment.url;
      img.alt = attachment.originalName || 'История';
      img.loading = 'lazy';
      wrapper.append(img);
      return decorateMediaPreview(wrapper, attachment, kind);
    }
    if (attachment.isCircle || kind === 'video') {
      const wrapper = document.createElement('div');
      wrapper.className = 'attachment-video';
      if (attachment.isCircle) wrapper.classList.add('attachment-circle');
      const video = document.createElement('video');
      video.src = attachment.url;
      video.controls = true;
      video.preload = 'metadata';
      if (attachment.isCircle) {
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.loop = true;
      }
      wrapper.append(video);
      return attachment.isCircle ? decorateMediaPreview(wrapper, attachment, kind) : wrapper;
    }
    if (kind === 'audio') {
      const audio = document.createElement('audio');
      audio.src = attachment.url;
      audio.controls = true;
      audio.preload = 'metadata';
      audio.className = 'attachment-audio';
      if (attachment.durationMs) {
        audio.dataset.duration = String(Math.round(attachment.durationMs / 1000));
      }
      return audio;
    }
    if (kind === 'image') {
      const img = document.createElement('img');
      img.src = attachment.url;
      img.alt = attachment.originalName || 'Изображение';
      img.loading = 'lazy';
      if (attachment.isCircle) {
        img.classList.add('attachment-circle');
      }
      return decorateMediaPreview(img, attachment, kind);
    }
    const link = document.createElement('a');
    link.href = attachment.url;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.className = 'attachment-file';
    link.textContent = `${attachmentIcon(attachment)} ${attachment.originalName || 'Файл'}`;
    return link;
  }

  function getJitsiHost() {
    const domain = (state.jitsi?.domain || '').trim();
    if (!domain) return '';
    const withoutScheme = domain.replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
    const [host] = withoutScheme.split('/');
    return host || '';
  }

  function getJitsiBaseUrl() {
    const domain = (state.jitsi?.domain || '').trim();
    if (!domain) return '';
    const schemeMatch = domain.match(/^https?:\/\//i);
    const scheme = schemeMatch ? schemeMatch[0] : 'https://';
    const host = getJitsiHost();
    if (!host) return '';
    return `${scheme}${host}`;
  }

  function setCallButtonState(button, isActive) {
    if (!button) return;
    button.dataset.active = isActive ? 'true' : 'false';
  }

  function resetCallButtons() {
    setCallButtonState(elements.callMicToggle, true);
    setCallButtonState(elements.callScreenToggle, false);
  }

  function buildJitsiRoomName(conversation) {
    const prefix = (state.jitsi?.roomPrefix || 'pink').replace(/[^A-Za-z0-9]/g, '');
    const base = conversation?.shareCode || conversation?.id || `room${Date.now()}`;
    const slug = String(base).replace(/[^A-Za-z0-9]/g, '');
    const safePrefix = prefix || 'PinkRoom';
    const safeSlug = slug || `call${Date.now()}`;
    return `${safePrefix}-${safeSlug}`;
  }

  function updateCallHeader(conversation) {
    if (!conversation) return;
    if (elements.callTitle) {
      const display = conversationDisplay(conversation);
      elements.callTitle.textContent = `Созвон • ${display.title}`;
    }
    if (elements.callSubtitle) {
      const room = buildJitsiRoomName(conversation);
      const host = getJitsiHost();
      elements.callSubtitle.textContent = host ? `Комната ${room} • ${host}` : `Комната ${room}`;
    }
  }

  function prepareCallOverlay(conversation) {
    if (!elements.callOverlay || !elements.callMedia) return;
    updateCallHeader(conversation);
    elements.callOverlay.classList.remove('hidden');
    document.body.classList.add('call-open');
    if (elements.callBody) {
      elements.callBody.classList.add('full');
    }
    if (elements.callParticipants) {
      elements.callParticipants.classList.add('hidden');
    }
    elements.callMedia.classList.add('jitsi-active');
    elements.callMedia.innerHTML = '<div class="call-media-loading">Подключаемся к комнате…</div>';
  }

  function disposeJitsiCall() {
    if (state.jitsi?.api) {
      try {
        state.jitsi.api.dispose?.();
      } catch (error) {
        console.warn('Не удалось корректно завершить созвон', error);
      }
      state.jitsi.api = null;
    }
  }

  function closeCallOverlay({ hangup = false } = {}) {
    if (hangup && state.jitsi?.api) {
      try {
        state.jitsi.api.executeCommand('hangup');
      } catch (error) {
        console.warn('Команда завершения созвона не выполнена', error);
      }
    }
    disposeJitsiCall();
    state.call = null;
    resetCallButtons();
    if (elements.callMedia) {
      elements.callMedia.innerHTML = '';
      elements.callMedia.classList.remove('jitsi-active');
    }
    if (elements.callParticipants) {
      elements.callParticipants.classList.remove('hidden');
    }
    if (elements.callBody) {
      elements.callBody.classList.remove('full');
    }
    if (elements.callOverlay) {
      elements.callOverlay.classList.add('hidden');
    }
    document.body.classList.remove('call-open');
    if (elements.callSubtitle) {
      elements.callSubtitle.textContent = 'Ожидание участников...';
    }
  }

  async function ensureJitsiScriptLoaded() {
    if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) return;
    const baseUrl = getJitsiBaseUrl();
    if (!baseUrl) {
      throw new Error('Адрес Jitsi SFU не настроен');
    }
    if (state.jitsi.scriptPromise) {
      await state.jitsi.scriptPromise;
      return;
    }
    state.jitsi.scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'jitsi-external-api';
      script.async = true;
      script.src = `${baseUrl}/external_api.js`;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        reject(new Error('Не удалось загрузить Jitsi API'));
      };
      document.head.append(script);
    });
    try {
      await state.jitsi.scriptPromise;
    } finally {
      state.jitsi.scriptPromise = null;
    }
  }

  async function startJitsiCall(conversation) {
    prepareCallOverlay(conversation);
    try {
      await ensureJitsiScriptLoaded();
      if (typeof window === 'undefined' || !window.JitsiMeetExternalAPI) {
        throw new Error('Jitsi API недоступен');
      }
      const host = getJitsiHost();
      if (!host) {
        throw new Error('Адрес Jitsi SFU не настроен');
      }
      const roomName = buildJitsiRoomName(conversation);
      if (!elements.callMedia) {
        throw new Error('Контейнер для созвона не найден');
      }
      elements.callMedia.innerHTML = '';
      const api = new window.JitsiMeetExternalAPI(host, {
        roomName,
        parentNode: elements.callMedia,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: state.user?.displayName || state.user?.username || 'Участник'
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          HIDE_DEEP_LINKING_LOGO: true
        }
      });
      state.jitsi.api = api;
      state.call = { conversationId: conversation.id, roomName };
      resetCallButtons();
      api.addEventListener('readyToClose', () => closeCallOverlay());
      api.addEventListener('audioMuteStatusChanged', ({ muted }) => setCallButtonState(elements.callMicToggle, !muted));
      api.addEventListener('screenSharingStatusChanged', ({ on }) => setCallButtonState(elements.callScreenToggle, !!on));
    } catch (error) {
      closeCallOverlay();
      throw error;
    }
  }

  async function openCallForCurrentConversation() {
    if (state.jitsi?.api) {
      if (state.call?.conversationId) {
        const activeConversation = state.conversations.get(state.call.conversationId);
        if (activeConversation) {
          updateCallHeader(activeConversation);
        }
      }
      if (elements.callOverlay) {
        elements.callOverlay.classList.remove('hidden');
      }
      document.body.classList.add('call-open');
      return;
    }
    const conversationId = state.currentConversationId;
    if (!conversationId) {
      showToast('Сначала выберите беседу', 'error');
      return;
    }
    const conversation = state.conversations.get(conversationId);
    if (!conversation) {
      showToast('Не удалось найти беседу', 'error');
      return;
    }
    if (!getJitsiHost()) {
      showToast('Адрес SFU не настроен. Добавьте JITSI_DOMAIN в .env', 'error');
      return;
    }
    try {
      await startJitsiCall(conversation);
    } catch (error) {
      console.error('Ошибка запуска созвона', error);
      showToast(error.message || 'Не удалось запустить созвон', 'error');
    }
  }
  elements.messageList.addEventListener('click', (event) => {
    const messageElement = event.target.closest('.message');
    if (!messageElement) return;
    const messageId = Number(messageElement.dataset.messageId);
    const message = findMessage(messageId);
    if (!message) return;

    const mediaNode = event.target.closest('.media-preview');
    if (mediaNode) {
      const attachment = findAttachmentByNode(message, mediaNode);
      if (attachment) {
        event.preventDefault();
        openMediaViewer(attachment);
        return;
      }
    }

    const reactButton = event.target.closest('.action-react');
    if (reactButton) {
      event.preventDefault();
      openReactionMenu(message.id, reactButton);
      return;
    }

    const editButton = event.target.closest('.action-edit');
    if (editButton) {
      const newContent = prompt('Изменить сообщение', message.content || '');
      if (newContent == null) return;
      apiRequest(`/api/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      }).catch((error) => showToast(error.message || 'Не удалось изменить сообщение', 'error'));
      return;
    }

    const deleteButton = event.target.closest('.action-delete');
    if (deleteButton) {
      if (!confirm('Удалить сообщение?')) return;
      apiRequest(`/api/messages/${messageId}`, { method: 'DELETE' }).catch((error) => showToast(error.message || 'Не удалось удалить сообщение', 'error'));
      return;
    }

    const favoriteButton = event.target.closest('.action-favorite');
    if (favoriteButton) {
      toggleFavorite(message);
      return;
    }
  });

  function toggleReaction(message, emoji) {
    const reacted = message.reactions?.some((reaction) => reaction.emoji === emoji && reaction.reacted);
    const action = reacted ? 'remove' : 'add';
    apiRequest(`/api/messages/${message.id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji, action })
    }).catch((error) => showToast(error.message || 'Не удалось отправить реакцию', 'error'));
    state.socket?.emit('message:reaction', { messageId: message.id, emoji, action });
  }

  function hasSelfReaction(message, emoji) {
    return Boolean(message?.reactions?.some((reaction) => reaction.emoji === emoji && reaction.reacted));
  }

  function openReactionMenu(messageId, anchor) {
    if (!elements.reactionMenu || !anchor) return;
    const message = findMessage(messageId);
    if (!message) return;
    const menu = elements.reactionMenu;
    menu.innerHTML = '';
    const fragment = document.createDocumentFragment();
    REACTION_EMOJIS.forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reaction-option';
      button.dataset.emoji = emoji;
      button.textContent = emoji;
      if (hasSelfReaction(message, emoji)) {
        button.classList.add('active');
      }
      fragment.append(button);
    });
    menu.append(fragment);
    const rect = anchor.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const left = rect.left + rect.width / 2 + scrollX;
    const top = rect.top + scrollY - 12;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    state.reactionMenu.messageId = messageId;
    menu.dataset.messageId = String(messageId);
    menu.classList.remove('hidden');
    requestAnimationFrame(() => menu.classList.add('visible'));
  }

  function closeReactionMenu() {
    if (!elements.reactionMenu) return;
    if (state.reactionMenu.messageId === null) return;
    elements.reactionMenu.classList.remove('visible');
    state.reactionMenu.messageId = null;
    elements.reactionMenu.dataset.messageId = '';
    elements.reactionMenu.style.left = '';
    elements.reactionMenu.style.top = '';
    setTimeout(() => {
      if (state.reactionMenu.messageId === null) {
        elements.reactionMenu.classList.add('hidden');
        elements.reactionMenu.innerHTML = '';
      }
    }, 150);
  }

  if (elements.reactionMenu) {
    elements.reactionMenu.addEventListener('click', (event) => {
      const target = event.target.closest('[data-emoji]');
      if (!target) return;
      const emoji = target.dataset.emoji;
      const messageId = Number(elements.reactionMenu.dataset.messageId || '0');
      const message = messageId ? findMessage(messageId) : null;
      if (message && emoji) {
        toggleReaction(message, emoji);
      }
      closeReactionMenu();
    });
  }

  document.addEventListener('click', (event) => {
    if (state.reactionMenu.messageId === null) return;
    if (elements.reactionMenu?.contains(event.target)) return;
    if (event.target.closest('.action-react')) return;
    closeReactionMenu();
  });

  if (elements.messageScroller) {
    elements.messageScroller.addEventListener('scroll', () => {
      if (state.reactionMenu.messageId !== null) {
        closeReactionMenu();
      }
    });
  }

  async function toggleFavorite(message) {
    if (!message || message.user?.id !== state.user?.id) {
      showToast('В избранное можно добавлять только свои сообщения', 'error');
      return;
    }
    const currently = Boolean(message.isFavorite);
    try {
      if (currently) {
        await apiRequest(`/api/messages/${message.id}/favorite`, { method: 'DELETE' });
        addMessage({ ...message, isFavorite: false });
        showToast('Удалено из избранного', 'info');
      } else {
        const data = await apiRequest(`/api/messages/${message.id}/favorite`, { method: 'POST' });
        if (data?.message) {
          addMessage(data.message);
        } else {
          addMessage({ ...message, isFavorite: true });
        }
        showToast('Добавлено в избранное', 'success');
      }
      if (state.favoritesLoaded) {
        await loadFavorites(true);
      }
    } catch (error) {
      showToast(error.message || 'Не удалось обновить избранное', 'error');
    }
  }

  function findMessage(messageId) {
    for (const list of state.messages.values()) {
      const message = list.find((item) => item.id === messageId);
      if (message) return message;
    }
    return null;
  }

  let typingTimer = null;
  elements.messageInput.addEventListener('input', () => {
    const conversationId = state.currentConversationId;
    if (!conversationId || !state.socket) return;
    clearTimeout(typingTimer);
    state.socket.emit('typing:start', { conversationId });
    typingTimer = setTimeout(() => {
      state.socket?.emit('typing:stop', { conversationId });
    }, 2500);
  });

  elements.messageInput.addEventListener('blur', () => {
    const conversationId = state.currentConversationId;
    if (conversationId && state.socket) {
      state.socket.emit('typing:stop', { conversationId });
    }
  });

  elements.addMemberBtn.addEventListener('click', async () => {
    const conversationId = state.currentConversationId;
    if (!conversationId) return;
    const username = prompt('Введите логин для приглашения');
    if (!username) return;
    try {
      await apiRequest(`/api/conversations/${conversationId}/members`, {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      showToast('Участник приглашён', 'success');
    } catch (error) {
      showToast(error.message || 'Не удалось пригласить', 'error');
    }
  });

  elements.detailsToggleBtn.addEventListener('click', () => toggleDetails());
  elements.detailsCloseBtn.addEventListener('click', () => toggleDetails(false));

  window.addEventListener('resize', () => syncDetailsPanel());

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape') return;
    if (state.reactionMenu.messageId !== null) {
      closeReactionMenu();
      return;
    }
    if (elements.mediaViewer && !elements.mediaViewer.classList.contains('hidden')) {
      closeMediaViewer();
      return;
    }
    const activeModal = [
      elements.memberModal,
      elements.profileModal,
      elements.groupModal,
      elements.directModal,
      elements.joinModal
    ].find((modal) => modal && !modal.classList.contains('hidden'));
    if (activeModal) {
      closeModal(activeModal);
    }
  });

  function desiredPanelState(force) {
    if (typeof force === 'boolean') return force;
    const isMobile = window.innerWidth <= 1180;
    if (isMobile) {
      return !elements.detailsPanel.classList.contains('visible');
    }
    return elements.detailsPanel.classList.contains('hidden');
  }

  function syncDetailsPanel() {
    const isMobile = window.innerWidth <= 1180;
    const shouldShow = isMobile
      ? elements.detailsPanel.classList.contains('visible')
      : !elements.detailsPanel.classList.contains('hidden');
    if (isMobile) {
      elements.detailsPanel.classList.remove('hidden');
      elements.detailsPanel.classList.toggle('visible', shouldShow);
    } else {
      elements.detailsPanel.classList.remove('visible');
      elements.detailsPanel.classList.toggle('hidden', !shouldShow);
    }
  }

  function toggleDetails(force) {
    const isMobile = window.innerWidth <= 1180;
    const shouldShow = desiredPanelState(force);
    if (isMobile) {
      elements.detailsPanel.classList.toggle('visible', shouldShow);
    } else {
      elements.detailsPanel.classList.toggle('hidden', !shouldShow);
    }
    if (shouldShow && state.currentConversationId) {
      fetchMembers(state.currentConversationId).then(() => renderMembers(state.currentConversationId));
    }
    syncDetailsPanel();
  }

  function updateTyping(conversationId) {
    if (conversationId !== state.currentConversationId) return;
    const set = state.typing.get(conversationId) || new Set();
    if (!set.size) {
      elements.typingIndicator.classList.add('hidden');
      elements.typingIndicator.textContent = '';
      return;
    }
    const names = Array.from(set)
      .map((userId) => (state.membersCache.get(conversationId) || []).find((member) => member.id === userId))
      .filter(Boolean)
      .map((member) => member.displayName || member.username);
    elements.typingIndicator.textContent = `${names.join(', ')} печатает...`;
    elements.typingIndicator.classList.remove('hidden');
  }

  function setTyping(conversationId, userId, isTyping) {
    if (!state.typing.has(conversationId)) state.typing.set(conversationId, new Set());
    const set = state.typing.get(conversationId);
    if (isTyping) {
      set.add(userId);
      clearTimeout(state.typingTimers.get(`${conversationId}:${userId}`));
      const timer = setTimeout(() => {
        set.delete(userId);
        updateTyping(conversationId);
      }, 4000);
      state.typingTimers.set(`${conversationId}:${userId}`, timer);
    } else {
      set.delete(userId);
    }
    updateTyping(conversationId);
  }

  function openConversation(conversationId) {
    if (!state.conversations.has(conversationId)) return;
    if (state.readTimer) {
      clearTimeout(state.readTimer);
      state.readTimer = null;
    }
    closeReactionMenu();
    if (state.recording) {
      stopRecording({ cancel: true });
    }
    state.currentConversationId = conversationId;
    const current = state.conversations.get(conversationId);
    if (current && current.unreadCount) {
      state.conversations.set(conversationId, { ...current, unreadCount: 0 });
    }
    renderConversationList();
    elements.chatPlaceholder.classList.add('hidden');
    elements.chatPane.classList.remove('hidden');

    document.querySelectorAll('.conversation-item').forEach((item) => {
      item.classList.toggle('active', Number(item.dataset.conversationId) === conversationId);
    });

  fetchMembers(conversationId).then(renderMembers);
  updateConversationHeader(conversationId);
  renderConversationFolders(conversationId);
    loadMessages(conversationId)
      .then(() => {
        renderMessages(conversationId);
        scrollToBottom(true);
        scheduleConversationRead();
      })
      .catch(() => {
        scheduleConversationRead();
      });

  }

  function applyPresenceUpdate({ userId, status, lastSeen }) {
    state.presence.set(userId, { status, lastSeen });
    if (state.activeMember?.id === userId) {
      state.activeMember = { ...state.activeMember, lastSeen };
      if (elements.memberProfilePresence) {
        elements.memberProfilePresence.textContent = buildPresence(state.activeMember);
      }
    }
    if (state.currentConversationId) {
      updateConversationHeader(state.currentConversationId);
      renderMembers(state.currentConversationId);
    }
    renderConversationList();
  }

  function addMessage(message) {
    if (!message) return;
    const list = state.messages.get(message.conversationId) || [];
    const index = list.findIndex((item) => item.id === message.id);
    if (index >= 0) {
      list[index] = message;
    } else {
      list.push(message);
    }
    list.sort((a, b) => a.id - b.id);
    state.messages.set(message.conversationId, list);
    if (state.currentConversationId === message.conversationId) {
      renderMessages(message.conversationId);
      scrollToBottom(message.user?.id === state.user?.id);
      if (message.user?.id !== state.user?.id) {
        scheduleConversationRead();
      }
    }
  }

  function removeMessage(message) {
    if (!message) return;
    const list = state.messages.get(message.conversationId) || [];
    const index = list.findIndex((item) => item.id === message.id);
    if (index >= 0) {
      list[index] = message;
      state.messages.set(message.conversationId, list);
      if (state.currentConversationId === message.conversationId) {
        renderMessages(message.conversationId);
      }
    }
  }
  function setupSocket() {
    if (!state.token) return;
    const socket = io({
      auth: { token: state.token },
      transports: ['polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000
    });

    socket.on('connect', () => {
      if (state.socketErrorShown) {
        showToast('Соединение восстановлено', 'success');
      }
      state.socketErrorShown = false;
    });

    socket.on('connect_error', (err) => {
      if (!state.socketErrorShown) {
        showToast(err?.message || 'Не удалось подключиться', 'error');
        state.socketErrorShown = true;
      }
    });

    socket.on('disconnect', () => {
      state.socketErrorShown = true;
    });

    socket.on('conversation:list', (list) => upsertConversations(list));
    socket.on('conversation:created', (payload) => {
      if (payload?.conversation) upsertConversations([payload.conversation]);
    });
    socket.on('conversation:member-added', ({ conversationId, members }) => {
      if (members) state.membersCache.set(conversationId, members);
      refreshAfterSocket(conversationId);
    });
    socket.on('conversation:member-removed', ({ conversationId }) => {
      state.membersCache.delete(conversationId);
      refreshAfterSocket(conversationId);
      if (state.currentConversationId === conversationId) {
        openConversation(conversationId);
      }
    });

    socket.on('message:created', (message) => addMessage(message));
    socket.on('message:updated', (message) => addMessage(message));
    socket.on('message:deleted', (message) => removeMessage(message));

    socket.on('typing:update', ({ conversationId, userId, isTyping }) => {
      if (userId === state.user?.id) return;
      setTyping(conversationId, userId, isTyping);
    });

    socket.on('presence:update', applyPresenceUpdate);
    socket.on('profile:update', (user) => {
      applyUser(user);
      saveSession();
    });

    state.socket = socket;
  }

  function refreshAfterSocket(conversationId) {
    fetchMembers(conversationId).then((members) => {
      state.membersCache.set(conversationId, members);
      if (state.currentConversationId === conversationId) {
        renderMembers(conversationId);
        updateConversationHeader(conversationId);
      }
      renderConversationList();
    });
  }

  async function loadProfile() {
    try {
      const data = await apiRequest('/api/profile');
      applyUser(data.user);
      upsertConversations(data.conversations || []);
      await loadFolders();
      renderConversationList();
      if (!state.socket) {
        setupSocket();
      }
    } catch (error) {
      showToast(error.message || 'Не удалось загрузить профиль', 'error');
      clearSession();
      showAuth();
    }
  }

  async function bootstrap() {
    try {
      await loadClientConfig();
      if (state.token && localStorage.getItem('pink:user')) {
        try {
          applyUser(JSON.parse(localStorage.getItem('pink:user')));
        } catch (error) {
          clearSession();
        }
      }
      if (state.token) {
        await loadProfile();
        showApp();
      } else {
        showAuth();
      }
    } catch (error) {
      showAuth();
    }
  }

  window.addEventListener('focus', () => {
    scheduleConversationRead();
  });

  syncDetailsPanel();

  function markConversationAsRead(conversationId) {
    if (!conversationId) return;
    if (state.socket) {
      state.socket.emit('conversation:read', { conversationId });
    }
    apiRequest(`/api/conversations/${conversationId}/read`, {
      method: 'POST'
    }).catch(() => {});
  }

  function scheduleConversationRead() {
    if (!state.currentConversationId) return;
    if (state.readTimer) {
      clearTimeout(state.readTimer);
    }
    state.readTimer = setTimeout(() => {
      state.readTimer = null;
      markConversationAsRead(state.currentConversationId);
    }, 400);
  }

  bootstrap();
})();
