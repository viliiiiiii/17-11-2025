const onReady = (fn) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
};

const roomsCache = new Map();
const toastIds = new Set();

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') || '' : '';
}

function getCsrfName() {
  const body = document.body;
  return body ? body.dataset.csrfName || 'csrf_token' : 'csrf_token';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function sanitizeText(text) {
  return (text ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const now = new Date();
  const ts = new Date(isoString);
  if (Number.isNaN(ts.getTime())) return '';
  const diff = (ts.getTime() - now.getTime()) / 1000; // seconds
  const abs = Math.abs(diff);
  const units = [
    { step: 60, name: 'second' },
    { step: 60, name: 'minute' },
    { step: 24, name: 'hour' },
    { step: 7, name: 'day' },
    { step: 4.34524, name: 'week' },
    { step: 12, name: 'month' },
    { step: Infinity, name: 'year' },
  ];
  let delta = abs;
  let unit = 'second';
  for (const u of units) {
    if (delta < u.step) {
      unit = u.name;
      break;
    }
    delta /= u.step;
  }
  const value = Math.max(1, Math.round(delta));
  const label = value === 1 ? unit : `${unit}s`;
  return diff < 0 ? `${value} ${label} ago` : `in ${value} ${label}`;
}

function summarizeUserAgent(agent = '') {
  const raw = (agent || '').toString();
  const lower = raw.toLowerCase();
  if (!raw) return 'Unknown device';
  if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) {
    if (lower.includes('crios')) return 'Chrome on iOS';
    if (lower.includes('fxios')) return 'Firefox on iOS';
    return 'Safari on iOS';
  }
  if (lower.includes('android')) {
    if (lower.includes('firefox')) return 'Firefox on Android';
    if (lower.includes('edg')) return 'Edge on Android';
    if (lower.includes('chrome')) return 'Chrome on Android';
    return 'Android browser';
  }
  if (lower.includes('mac os') || lower.includes('macintosh')) {
    if (lower.includes('safari') && !lower.includes('chrome')) return 'Safari on macOS';
    if (lower.includes('firefox')) return 'Firefox on macOS';
    if (lower.includes('chrome')) return 'Chrome on macOS';
  }
  if (lower.includes('windows')) {
    if (lower.includes('edg')) return 'Microsoft Edge';
    if (lower.includes('firefox')) return 'Firefox on Windows';
    if (lower.includes('chrome')) return 'Chrome on Windows';
  }
  if (lower.includes('linux')) {
    if (lower.includes('firefox')) return 'Firefox on Linux';
    if (lower.includes('chrome')) return 'Chrome on Linux';
  }
  const firstParen = raw.split('(')[0].trim();
  if (firstParen) return firstParen.slice(0, 64);
  return raw.slice(0, 64);
}

function initNav() {
  const toggle = document.getElementById('navToggle');
  const sidebar = document.querySelector('[data-sidebar]');
  const backdrop = document.getElementById('sidebarBackdrop');
  const body = document.body;
  if (!toggle || !sidebar || !body) return;

  const mq = window.matchMedia('(max-width: 1024px)');
  const isMobile = () => mq.matches;

  const closeMobile = () => {
    body.classList.remove('sidebar-open');
    sidebar.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openMobile = () => {
    body.classList.add('sidebar-open');
    sidebar.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const toggleDesktop = () => {
    const collapsed = body.classList.toggle('sidebar-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  };

  const sync = () => {
    if (isMobile()) {
      body.classList.remove('sidebar-collapsed');
      toggle.setAttribute('aria-expanded', body.classList.contains('sidebar-open') ? 'true' : 'false');
    } else {
      body.classList.remove('sidebar-open');
      sidebar.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', body.classList.contains('sidebar-collapsed') ? 'false' : 'true');
    }
  };

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      if (body.classList.contains('sidebar-open')) {
        closeMobile();
      } else {
        openMobile();
      }
    } else {
      toggleDesktop();
    }
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeMobile);
  }

  document.querySelectorAll('[data-sidebar-close]').forEach((btn) => {
    btn.addEventListener('click', closeMobile);
  });

  document.addEventListener('click', (event) => {
    if (!isMobile()) return;
    if (!body.classList.contains('sidebar-open')) return;
    if (sidebar.contains(event.target) || toggle.contains(event.target)) return;
    closeMobile();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (isMobile() && body.classList.contains('sidebar-open')) {
        closeMobile();
      }
    }
  });

  sidebar.addEventListener('click', (event) => {
    if (!isMobile()) return;
    const link = event.target.closest('a');
    if (link) closeMobile();
  });

  const handleMatchChange = () => {
    sync();
  };

  if (mq.addEventListener) {
    mq.addEventListener('change', handleMatchChange);
  } else if (mq.addListener) {
    mq.addListener(handleMatchChange);
  }

  sync();
}

function initModalSystem() {
  const body = document.body;
  if (!body) return;
  const active = [];

  const resolveModal = (token) => {
    if (!token) return null;
    return document.getElementById(token) || document.querySelector(`.modal[data-modal="${token}"]`);
  };

  const focusFirstField = (modal) => {
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable) {
      setTimeout(() => focusable.focus(), 10);
    }
  };

  const openModal = (modal) => {
    if (!modal || !modal.hasAttribute('hidden')) {
      return;
    }
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.dataset.state = 'open';
    active.push(modal);
    body.classList.add('modal-open');
    focusFirstField(modal);
  };

  const closeModal = (modal) => {
    if (!modal) return;
    if (!active.includes(modal)) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.dataset.state = 'closed';
    setTimeout(() => {
      modal.setAttribute('hidden', '');
      const index = active.indexOf(modal);
      if (index !== -1) {
        active.splice(index, 1);
      }
      if (!active.length) {
        body.classList.remove('modal-open');
      }
    }, 150);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-open]');
    if (trigger) {
      const target = trigger.getAttribute('data-modal-open');
      const modal = resolveModal(target);
      if (modal && modal.hasAttribute('hidden')) {
        event.preventDefault();
        openModal(modal);
        return;
      }
    }

    const closer = event.target.closest('[data-modal-close]');
    if (closer) {
      const modal = closer.closest('.modal');
      if (modal && active.includes(modal)) {
        event.preventDefault();
        closeModal(modal);
      }
      return;
    }

    if (event.target.classList && event.target.classList.contains('modal') && active.includes(event.target)) {
      closeModal(event.target);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active.length) {
      const modal = active[active.length - 1];
      closeModal(modal);
    }
  });
}

async function fetchRoomsForBuilding(buildingId) {
  const key = String(buildingId || '');
  if (!key || key === '0') return [];
  if (roomsCache.has(key)) {
    return roomsCache.get(key);
  }
  try {
    const resp = await fetch(`/rooms.php?action=by_building&id=${encodeURIComponent(key)}`, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error('Failed to fetch rooms');
    const data = await resp.json();
    if (Array.isArray(data)) {
      roomsCache.set(key, data);
      return data;
    }
  } catch (err) {
    console.warn('Room lookup failed', err);
  }
  roomsCache.set(key, []);
  return [];
}

function initRooms() {
  const sources = document.querySelectorAll('[data-room-source]');
  if (!sources.length) return;

  const ensurePlaceholder = (target) => {
    if (!target || target.dataset.roomPlaceholder) return;
    const first = target.querySelector('option[value=""]');
    if (first) target.dataset.roomPlaceholder = first.textContent.trim();
  };

  const populateSelect = (target, rooms) => {
    if (!target) return;
    ensurePlaceholder(target);
    const placeholder = target.dataset.roomPlaceholder || 'Select room';
    const current = target.value;
    target.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder;
    target.appendChild(defaultOption);
    let found = false;
    rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = String(room.id);
      option.textContent = room.label || room.room_number || `Room ${room.id}`;
      if (String(room.id) === current) {
        option.selected = true;
        found = true;
      }
      target.appendChild(option);
    });
    if (!found) {
      target.value = '';
    }
  };

  const populateDatalist = (datalist, rooms) => {
    if (!datalist) return;
    datalist.innerHTML = '';
    rooms.forEach((room) => {
      const opt = document.createElement('option');
      opt.value = room.room_number || room.label || '';
      opt.label = room.label || opt.value;
      datalist.appendChild(opt);
    });
  };

  const validateInput = (input, rooms, buildingId) => {
    if (!input) return;
    const trimmed = input.value.trim();
    if (!buildingId) {
      input.setCustomValidity(trimmed ? 'Choose a building first.' : '');
      return;
    }
    if (!trimmed) {
      input.setCustomValidity('');
      return;
    }
    const exists = rooms.some((room) => {
      const number = (room.room_number || '').toLowerCase();
      return number && number === trimmed.toLowerCase();
    });
    input.setCustomValidity(exists ? '' : 'Room not found for this building.');
  };

  sources.forEach((select) => {
    const targetAttr = select.dataset.roomTarget || '';
    const targetIds = targetAttr.split(/\s+/).filter(Boolean);
    const inputId = select.dataset.roomInput;
    const datalistId = select.dataset.roomDatalist;
    const targets = targetIds.length
      ? targetIds.map((id) => document.getElementById(id)).filter(Boolean)
      : [];
    const target = targets[0] || null;
    const input = inputId ? document.getElementById(inputId) : null;
    const datalist = datalistId ? document.getElementById(datalistId) : null;

    targets.forEach((t) => ensurePlaceholder(t));
    if (!targets.length && target) ensurePlaceholder(target);

    const refresh = async () => {
      const buildingId = select.value;
      if (!buildingId) {
        targets.forEach((t) => {
          populateSelect(t, []);
          t.disabled = true;
        });
        if (!targets.length && target) {
          populateSelect(target, []);
          target.disabled = true;
        }
        if (datalist) datalist.innerHTML = '';
        if (input) input.setCustomValidity('');
        return;
      }
      const rooms = await fetchRoomsForBuilding(buildingId);
      targets.forEach((t) => {
        populateSelect(t, rooms);
        t.disabled = false;
      });
      if (!targets.length && target) {
        populateSelect(target, rooms);
        target.disabled = false;
      }
      populateDatalist(datalist, rooms);
      validateInput(input, rooms, buildingId);
    };

    select.addEventListener('change', refresh);

    if (input) {
      input.addEventListener('blur', async () => {
        const buildingId = select.value;
        if (!buildingId) {
          validateInput(input, [], '');
          return;
        }
        const rooms = await fetchRoomsForBuilding(buildingId);
        validateInput(input, rooms, buildingId);
      });
      input.addEventListener('input', () => {
        input.setCustomValidity('');
      });
    }

    if (select.value) {
      refresh();
    } else {
      targets.forEach((t) => {
        if (t) t.disabled = true;
      });
      if (!targets.length && target) target.disabled = true;
    }
  });
}

function createToast(item) {
  const stack = document.getElementById('toast-container');
  if (!stack) return null;

  const rawId = item && (item.id || item.toast_id || item.message_id);
  const id = `toast-${rawId || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  if (toastIds.has(id)) return null;
  toastIds.add(id);

  const variant = item.variant || item.type || 'info';
  const title = item.title ? sanitizeText(item.title) : '';
  const bodySource = item.body || item.message || '';
  const body = bodySource ? sanitizeText(bodySource).replace(/\n/g, '<br>') : '';
  const url = item.url ? sanitizeText(item.url) : '';

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.dataset.variant = variant;
  toast.dataset.toastId = id;

  toast.innerHTML = `
    <div class="toast-message__content">
      <div class="toast-message__body">
        ${title ? `<strong>${title}</strong>` : ''}
        ${body ? `<p>${body}</p>` : ''}
        ${!title && !body ? '<p>Update available.</p>' : ''}
        ${url ? `<p><a class="toast-link" href="${url}">View details</a></p>` : ''}
      </div>
      <button type="button" class="toast-dismiss" aria-label="Dismiss">&times;</button>
    </div>
  `;

  const dismissBtn = toast.querySelector('.toast-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => dismissToast(toast));
  }

  stack.appendChild(toast);
  requestAnimationFrame(() => {
    toast.dataset.state = 'visible';
  });
  setTimeout(() => dismissToast(toast), 7000);
  return toast;
}

function dismissToast(toast) {
  if (!toast) return;
  const id = toast.dataset.toastId;
  toast.dataset.state = 'hidden';
  setTimeout(() => {
    toast.remove();
    if (id) toastIds.delete(id);
  }, 220);
}

function flushSessionToasts() {
  const pending = Array.isArray(window.__SESSION_TOASTS) ? window.__SESSION_TOASTS : [];
  pending.forEach((toast) => {
    if (toast && typeof toast === 'object') {
      createToast(toast);
    }
  });
  if (Object.prototype.hasOwnProperty.call(window, '__SESSION_TOASTS')) {
    delete window.__SESSION_TOASTS;
  }
}

function initToasts() {
  flushSessionToasts();
  if (!window.showToast) {
    window.showToast = (message, type = 'info') => createToast({ message, type });
  }
}



function initCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('commandPaletteInput');
  const results = document.getElementById('commandPaletteResults');
  if (!palette || !input || !results) return;

  const openButtons = document.querySelectorAll('[data-command-open]');
  const body = document.body;
  let visibleCommands = [];
  let activeIndex = 0;

  const baseCommands = (() => {
    const commands = [];
    const navLinks = document.querySelectorAll('.nav a.nav__link');
    navLinks.forEach((link) => {
      const label = link.textContent.trim();
      if (!label) return;
      commands.push({
        label,
        url: link.getAttribute('href'),
        description: 'Navigate',
        group: 'Navigation',
      });
    });

    commands.push(
      { label: 'Create Task', url: '/task_new.php', description: 'Draft a new task', group: 'Actions', shortcut: 'N' },
      { label: 'View Tasks', url: '/tasks.php', description: 'Open task list', group: 'Actions' },
      { label: 'Rooms Directory', url: '/rooms.php', description: 'Manage rooms and buildings', group: 'Data' },
      { label: 'Inventory', url: '/inventory.php', description: 'Open inventory overview', group: 'Data' },
      { label: 'Profile', url: '/account/profile.php', description: 'Manage account settings', group: 'Account' },
    );

    return commands;
  })();

  const closePalette = () => {
    if (palette.hasAttribute('hidden')) return;
    palette.dataset.state = 'closed';
    palette.setAttribute('hidden', '');
    body.classList.remove('command-open');
    results.innerHTML = '';
    input.value = '';
    visibleCommands = [];
    activeIndex = 0;
  };

  const openPalette = () => {
    if (!palette.hasAttribute('hidden')) return;
    palette.removeAttribute('hidden');
    palette.dataset.state = 'open';
    body.classList.add('command-open');
    input.value = '';
    filterCommands('');
    setTimeout(() => input.focus(), 0);
  };

  const activateItem = (index) => {
    const items = results.querySelectorAll('.command-palette__item');
    items.forEach((item) => item.setAttribute('aria-selected', 'false'));
    if (!items.length) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const current = items[clamped];
    if (current) {
      current.setAttribute('aria-selected', 'true');
      current.scrollIntoView({ block: 'nearest' });
      activeIndex = clamped;
    }
  };

  const executeCommand = (command) => {
    if (!command) return;
    closePalette();
    if (command.action === 'open-task' && command.url) {
      window.location.href = command.url;
      return;
    }
    if (command.url) {
      window.location.href = command.url;
    }
    if (typeof command.handler === 'function') {
      command.handler();
    }
  };

  const renderCommands = (commands) => {
    visibleCommands = commands;
    results.innerHTML = '';
    if (!commands.length) {
      const empty = document.createElement('li');
      empty.className = 'command-palette__item';
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-disabled', 'true');
      empty.textContent = 'No matches found. Try broader terms or #ID.';
      results.appendChild(empty);
      activeIndex = 0;
      return;
    }

    let currentGroup = null;
    commands.forEach((cmd, idx) => {
      if (cmd.group && cmd.group !== currentGroup) {
        currentGroup = cmd.group;
        const groupLi = document.createElement('li');
        groupLi.className = 'command-palette__group';
        groupLi.textContent = currentGroup;
        groupLi.setAttribute('role', 'presentation');
        results.appendChild(groupLi);
      }
      const li = document.createElement('li');
      li.className = 'command-palette__item';
      li.setAttribute('role', 'option');
      li.dataset.index = String(idx);
      const metaParts = [];
      if (cmd.description) metaParts.push(`<span>${cmd.description}</span>`);
      if (cmd.shortcut) metaParts.push(`<span>${cmd.shortcut}</span>`);
      const meta = metaParts.length ? `<span class="command-palette__item-meta">${metaParts.join('')}</span>` : '';
      li.innerHTML = `
        <span class="command-palette__item-label">${cmd.label}</span>
        ${meta}
      `;
      li.addEventListener('click', () => {
        const position = Number(li.dataset.index);
        executeCommand(visibleCommands[position]);
      });
      results.appendChild(li);
    });

    activeIndex = 0;
    activateItem(activeIndex);
  };

  const buildSpecialCommands = (query) => {
    const specials = [];
    const trimmed = query.trim();
    const taskMatch = trimmed.match(/^#?(\d{1,8})$/);
    if (taskMatch) {
      const id = taskMatch[1];
      specials.push({
        label: `Open Task #${id}`,
        url: `/task_view.php?id=${id}`,
        description: 'Jump directly to task details',
        group: 'Shortcuts',
        action: 'open-task',
      });
    }
    return specials;
  };

  const filterCommands = (query) => {
    const normalized = query.trim().toLowerCase();
    const specials = buildSpecialCommands(normalized);
    if (!normalized) {
      renderCommands([...specials, ...baseCommands]);
      return;
    }
    const matches = baseCommands.filter((cmd) => {
      const haystack = [cmd.label, cmd.description, cmd.group]
        .filter(Boolean)
        .join(' ') 
        .toLowerCase();
      return haystack.includes(normalized);
    });
    renderCommands([...specials, ...matches]);
  };

  input.addEventListener('input', () => filterCommands(input.value));

  openButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openPalette();
    });
  });

  palette.addEventListener('click', (event) => {
    if (event.target.closest('[data-command-close]')) {
      closePalette();
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (palette.hasAttribute('hidden')) {
        openPalette();
      } else {
        closePalette();
      }
    }
  });

  input.addEventListener('keydown', (event) => {
    const items = results.querySelectorAll('.command-palette__item');
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activateItem(Math.min(activeIndex + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activateItem(Math.max(activeIndex - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const el = items[activeIndex];
      if (el) {
        const index = Number(el.dataset.index);
        executeCommand(visibleCommands[index]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePalette();
    }
  });
}

onReady(() => {
  initNav();
  initRooms();
  initToasts();
  initModalSystem();
  initCommandPalette();
});