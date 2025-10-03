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
    toast: document.getElementById('toast')
  };

  const state = {
    token: localStorage.getItem('pink:token') || null,
    user: null,
    socket: null,
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
    profileDraft: {
      avatarAttachmentId: null,
      avatarUrl: null,
      removeAvatar: false
    }
  };

  const API_DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
  const ATTACHMENT_KIND_BY_MIME = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    audio: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'],
    video: ['video/webm', 'video/mp4', 'video/quicktime']
  };

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

  async function startDirectChatFromSearch(user) {
    try {
      const data = await apiRequest('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ username: user.publicId || user.username })
      });
      resetSearchInput();
      closeModal(elements.directModal);
      upsertConversations([data.conversation]);
      openConversation(data.conversation.id);
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

  function setAvatar(node, { url, color, text } = {}) {
    if (!node) return;
    if (url) {
      node.classList.add('avatar--image');
      node.style.backgroundImage = `url(${url})`;
      node.style.backgroundColor = 'transparent';
      node.style.background = 'transparent';
      node.textContent = '';
    } else {
      node.classList.remove('avatar--image');
      node.style.backgroundImage = '';
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
    }
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
    elements.profileStatus.textContent = user.statusMessage || 'Без статуса';
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
    modal.classList.add('hidden');
  }

  function closeAllModals() {
    [elements.profileModal, elements.groupModal, elements.directModal, elements.joinModal].forEach((modal) => {
      if (modal) modal.classList.add('hidden');
    });
  }

  document.querySelectorAll('.modal [data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.closest('.modal'));
    });
  });

  [elements.profileModal, elements.groupModal, elements.directModal, elements.joinModal].forEach((modal) => {
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
      const data = await apiRequest('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ username: identifier })
      });
      closeModal(elements.directModal);
      upsertConversations([data.conversation]);
      openConversation(data.conversation.id);
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

  function renderConversationList() {
    const filter = state.filter;
    elements.conversationList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.conversationOrder.forEach((conversationId) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return;
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
      fragment.append(item);
    });
    elements.memberList.append(fragment);
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
    reactBtn.textContent = '❤';
    actions.append(reactBtn);
    if (!message.deletedAt && isOwn) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'action-edit';
      editBtn.textContent = 'Изменить';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'action-delete';
      deleteBtn.textContent = 'Удалить';
      actions.append(editBtn, deleteBtn);
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
      return wrapper;
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
      return wrapper;
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
      return img;
    }
    const link = document.createElement('a');
    link.href = attachment.url;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.className = 'attachment-file';
    link.textContent = `${attachmentIcon(attachment)} ${attachment.originalName || 'Файл'}`;
    return link;
  }
  elements.messageList.addEventListener('click', (event) => {
    const messageElement = event.target.closest('.message');
    if (!messageElement) return;
    const messageId = Number(messageElement.dataset.messageId);
    const message = findMessage(messageId);
    if (!message) return;

    if (event.target.classList.contains('action-edit')) {
      const newContent = prompt('Изменить сообщение', message.content || '');
      if (newContent == null) return;
      apiRequest(`/api/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      }).catch((error) => showToast(error.message || 'Не удалось изменить сообщение', 'error'));
      return;
    }

    if (event.target.classList.contains('action-delete')) {
      if (!confirm('Удалить сообщение?')) return;
      apiRequest(`/api/messages/${messageId}`, { method: 'DELETE' }).catch((error) => showToast(error.message || 'Не удалось удалить сообщение', 'error'));
      return;
    }

    if (event.target.classList.contains('action-react')) {
      toggleReaction(message, '💩');
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

  function toggleDetails(force) {
    if (window.innerWidth <= 1180) {
      if (force === false) {
        elements.detailsPanel.classList.remove('visible');
        return;
      }
      elements.detailsPanel.classList.toggle('visible', force === undefined ? !elements.detailsPanel.classList.contains('visible') : force);
    } else {
      elements.detailsPanel.classList.toggle('hidden', force === undefined ? elements.detailsPanel.classList.contains('hidden') : !force);
    }
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
    state.currentConversationId = conversationId;
    const current = state.conversations.get(conversationId);
    if (current && current.unreadCount) {
      state.conversations.set(conversationId, { ...current, unreadCount: 0 });
      renderConversationList();
    }
    elements.chatPlaceholder.classList.add('hidden');
    elements.chatPane.classList.remove('hidden');

    document.querySelectorAll('.conversation-item').forEach((item) => {
      item.classList.toggle('active', Number(item.dataset.conversationId) === conversationId);
    });

    fetchMembers(conversationId).then(renderMembers);
    updateConversationHeader(conversationId);
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
      transports: ['websocket', 'polling']
    });

    socket.on('connect_error', (err) => {
      showToast(err.message || 'Не удалось подключиться', 'error');
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
