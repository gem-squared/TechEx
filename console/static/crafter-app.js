// GEM²-Crafter frontend — session-scoped

// ── Auth Gate ──────────────────────────────────────────────────────
function getAccessKey() { return sessionStorage.getItem('aio-key') || ''; }

function authHeaders(extra) {
  const h = extra ? { ...extra } : {};
  const key = getAccessKey();
  if (key) h['X-Access-Key'] = key;
  return h;
}

function apiFetch(input, init) {
  init = init || {};
  init.headers = authHeaders(init.headers || {});
  return fetch(input, init);
}

function showGate() {
  const g = document.getElementById('gate-cover');
  if (g) g.classList.remove('hidden');
}
function hideGate() {
  const g = document.getElementById('gate-cover');
  if (g) g.classList.add('hidden');
}

async function tryAuth(key) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (res.ok) {
      sessionStorage.setItem('aio-key', key);
      // Mirror to localStorage so CE wrapper pages opened in new tabs can
      // read the key. Cleared by the lock button alongside sessionStorage.
      localStorage.setItem('aio-key', key);
      hideGate();
      return true;
    }
  } catch (e) {}
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  const cover = document.getElementById('gate-cover');
  if (!cover) return;
  const keyInput = document.getElementById('gate-key');
  const submitBtn = document.getElementById('gate-submit');
  const errorMsg = document.getElementById('gate-error');

  const saved = getAccessKey();
  if (saved) {
    tryAuth(saved).then(ok => {
      if (!ok) {
        sessionStorage.removeItem('aio-key');
        localStorage.removeItem('aio-key');
        showGate();
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
      errorMsg.classList.add('hidden');
      const ok = await tryAuth(key);
      if (!ok) {
        errorMsg.classList.remove('hidden');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enter Console';
    });
  }

  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && submitBtn) submitBtn.click();
    });
  }

  const lockBtn = document.getElementById('lock-btn');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      sessionStorage.removeItem('aio-key');
      localStorage.removeItem('aio-key');
      if (keyInput) keyInput.value = '';
      if (errorMsg) errorMsg.classList.add('hidden');
      showGate();
    });
  }
});

(function() {
  let sessionId = localStorage.getItem('gem2_session_id') || '';

  document.addEventListener('DOMContentLoaded', () => {
    initCrafterUI();
    loadSessions().then(() => {
      if (!sessionId) {
        createNewSession();
      } else {
        switchSession(sessionId);
      }
    });
    loadSkills();
  });

  function initCrafterUI() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
        // Toggle a body-level class so CSS can drop the main 1200px cap
        // for the canvas tab (iframe wants full viewport width).
        document.body.classList.toggle('wf-canvas-fullwidth', tab.dataset.tab === 'workflow-canvas');
        if (tab.dataset.tab === 'crafter') {
          const msgs = document.getElementById('chat-messages');
          msgs.scrollTop = msgs.scrollHeight;
        }
        if (tab.dataset.tab === 'explorer') initExplorer();
        if (tab.dataset.tab === 'workflow-canvas') initWorkflowCanvas();
      });
    });

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send');
    const newSessBtn = document.getElementById('btn-new-session');

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (newSessBtn) {
      newSessBtn.addEventListener('click', () => createNewSession());
    }

    // WP-AO-53 U1 — one-click demo bootstrap
    const loadDemoBtn = document.getElementById('btn-load-demo');
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', async () => {
        const key = sessionStorage.getItem('aio-key') || localStorage.getItem('aio-key') || '';
        if (!key) {
          alert('Auth key missing. Re-authenticate via the lock screen.');
          return;
        }
        const original = loadDemoBtn.textContent;
        loadDemoBtn.disabled = true;
        loadDemoBtn.textContent = '⏳ Loading demo…';
        try {
          const r = await fetch('/api/crafter/bootstrap-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Access-Key': key },
            body: JSON.stringify({})
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
          const ceCount = data.ce_count || 0;
          const skipped = (data.skipped || []).length;
          const errs = (data.errors || []).length;
          loadDemoBtn.textContent = `✓ ${ceCount} CEs ready` + (skipped ? ` (${skipped} skipped)` : '') + (errs ? ` [${errs} errors]` : '');
          loadSessions();
        } catch (e) {
          alert('Demo bootstrap failed: ' + e.message);
          loadDemoBtn.textContent = original;
        } finally {
          setTimeout(() => {
            loadDemoBtn.disabled = false;
            loadDemoBtn.textContent = original;
          }, 4000);
        }
      });
    }

    document.getElementById('chat-messages').addEventListener('click', (e) => {
      if (e.target.tagName === 'LI' && e.target.closest('.chat-welcome')) {
        document.getElementById('chat-input').value = e.target.textContent;
        sendMessage();
      }
      if (e.target.classList.contains('chat-suggestion')) {
        document.getElementById('chat-input').value = e.target.textContent;
        sendMessage();
      }
    });

    document.getElementById('skill-catalog').addEventListener('click', (e) => {
      if (e.target.classList.contains('skill-tag')) {
        document.getElementById('chat-input').value = '/' + e.target.dataset.skill;
        document.getElementById('chat-input').focus();
      }
    });

    // Slash command autocomplete
    input.addEventListener('input', () => handleSlashAutocomplete(input));
    input.addEventListener('keydown', (e) => {
      const dropdown = document.getElementById('slash-dropdown');
      if (!dropdown || dropdown.classList.contains('hidden')) return;
      const items = dropdown.querySelectorAll('.slash-item');
      const active = dropdown.querySelector('.slash-item.active');
      let idx = Array.from(items).indexOf(active);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < items.length - 1) idx++; else idx = 0;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
        items[idx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) idx--; else idx = items.length - 1;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
        items[idx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Tab' || (e.key === 'Enter' && active)) {
        if (active) {
          e.preventDefault();
          e.stopPropagation();
          selectSlashItem(active.dataset.skill, input);
        }
      } else if (e.key === 'Escape') {
        hideSlashDropdown();
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chat-input-area')) hideSlashDropdown();
    });
  }

  let cachedSkillList = [];

  function handleSlashAutocomplete(input) {
    const val = input.value;
    if (!val.startsWith('/')) {
      hideSlashDropdown();
      return;
    }
    const query = val.slice(1).toLowerCase();
    const matches = cachedSkillList.filter(s =>
      s.name.toLowerCase().includes(query)
    );
    if (matches.length === 0) {
      hideSlashDropdown();
      return;
    }
    showSlashDropdown(matches, input);
  }

  function showSlashDropdown(skills, input) {
    let dropdown = document.getElementById('slash-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'slash-dropdown';
      dropdown.className = 'slash-dropdown';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(dropdown);
    }
    dropdown.classList.remove('hidden');
    dropdown.innerHTML = skills.map((s, i) =>
      `<div class="slash-item${i === 0 ? ' active' : ''}" data-skill="${escHtml(s.name)}" onclick="window._selectSlash('${escHtml(s.name)}')">
        <span class="slash-cmd">/${escHtml(s.name)}</span>
        <span class="slash-desc">${escHtml(s.description).substring(0, 60)}</span>
      </div>`
    ).join('');
  }

  function hideSlashDropdown() {
    const d = document.getElementById('slash-dropdown');
    if (d) d.classList.add('hidden');
  }

  function selectSlashItem(skillName, input) {
    if (!input) input = document.getElementById('chat-input');
    const skill = cachedSkillList.find(s => s.name === skillName);
    input.value = '/' + skillName + ' ';
    input.focus();
    hideSlashDropdown();
  }

  window._selectSlash = function(name) {
    selectSlashItem(name);
  };

  // Session management
  function loadSessions() {
    return apiFetch('/api/sessions').then(r => r.json()).then(list => {
      renderSessionList(list);
    }).catch(() => {});
  }

  function createNewSession() {
    apiFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    }).then(r => r.json()).then(data => {
      sessionId = data.id;
      localStorage.setItem('gem2_session_id', sessionId);
      clearChat();
      loadSessions();
      loadState();
      loadHistory();
      sendGreeting();
    });
  }

  function sendGreeting() {
    if (!sessionId) return;
    const typingEl = showTyping();
    activeAbortController = new AbortController();

    const modelSelect = document.getElementById('llm-model');
    const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.5-pro';
    const agentSelect = document.getElementById('agent-model');
    const selectedAgent = agentSelect ? agentSelect.value : 'vultr/DeepSeek-V3.2-NVFP4';

    apiFetch('/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__init__', session_id: sessionId, model: selectedModel, agent_model: selectedAgent }),
      signal: activeAbortController.signal
    }).then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      function pump() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            if (typingEl.parentNode) typingEl.remove();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data, typingEl);
              } catch(e) {}
              eventType = '';
            }
          }
          return pump();
        });
      }
      return pump();
    }).catch(err => {
      if (typingEl.parentNode) typingEl.remove();
    });
  }

  function switchSession(sid) {
    sessionId = sid;
    localStorage.setItem('gem2_session_id', sessionId);
    clearChat();
    loadState();
    loadHistory();
    loadChatHistory();
    renderActiveSession();
  }

  function deleteSession(sid) {
    apiFetch('/api/sessions/' + sid, { method: 'DELETE' }).then(() => {
      if (sid === sessionId) {
        createNewSession();
      }
      loadSessions();
    });
  }

  function clearChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
  }

  function loadChatHistory() {
    if (!sessionId) return;
    apiFetch('/api/crafter/chat-history?session_id=' + encodeURIComponent(sessionId))
      .then(r => r.json())
      .then(turns => {
        if (!turns || !turns.length) return;
        const container = document.getElementById('chat-messages');
        turns.forEach(t => {
          const div = document.createElement('div');
          if (t.role === 'user') {
            div.className = 'chat-msg user';
            div.textContent = t.content;
          } else {
            div.className = 'chat-msg assistant';
            div.innerHTML = formatContent(t.content);
          }
          container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
      })
      .catch(() => {});
  }

  function renderSessionList(list) {
    const el = document.getElementById('session-list');
    if (!el) return;
    if (!list || list.length === 0) {
      el.innerHTML = '<p class="muted">No sessions.</p>';
      return;
    }
    // Sort by created_at descending
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    el.innerHTML = list.map(s => {
      const active = s.id === sessionId ? ' sess-active' : '';
      return `<div class="sess-card${active}" data-sid="${escHtml(s.id)}">
        <div class="sess-info" onclick="window._switchSession('${escHtml(s.id)}')">
          <div class="sess-name">${escHtml(s.name)}</div>
          <div class="sess-meta">${s.wp_count} WPs</div>
        </div>
        <button class="sess-delete" onclick="event.stopPropagation();window._deleteSession('${escHtml(s.id)}')" title="Delete">&times;</button>
      </div>`;
    }).join('');
  }

  function renderActiveSession() {
    document.querySelectorAll('.sess-card').forEach(el => {
      el.classList.toggle('sess-active', el.dataset.sid === sessionId);
    });
  }

  // Expose for inline onclick
  window._switchSession = switchSession;
  window._deleteSession = deleteSession;

  let activeAbortController = null;
  let chainTotal = 0;
  let fileQueue = [];
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

  function initDragDrop() {
    const area = document.getElementById('chat-input-area');
    let dragCounter = 0;

    area.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; area.classList.remove('drag-over'); }
    });
    area.addEventListener('dragover', (e) => { e.preventDefault(); });
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      area.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      addFilesToQueue(files);
    });
  }

  function addFilesToQueue(files) {
    const currentTotal = fileQueue.reduce((s, f) => s + f.size, 0);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showFileError(file.name + ' exceeds 2MB limit');
        continue;
      }
      if (currentTotal + file.size > MAX_TOTAL_SIZE) {
        showFileError('Total upload would exceed 20MB');
        break;
      }
      if (fileQueue.some(f => f.name === file.name && f.size === file.size)) continue;
      fileQueue.push(file);
    }
    renderFileChips();
  }

  function removeFileFromQueue(idx) {
    fileQueue.splice(idx, 1);
    renderFileChips();
  }

  function renderFileChips() {
    const container = document.getElementById('file-chips');
    container.innerHTML = '';
    fileQueue.forEach((file, idx) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';

      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const img = document.createElement('img');
        img.className = 'file-chip-thumb';
        img.src = URL.createObjectURL(file);
        chip.appendChild(img);
      } else {
        const icon = document.createElement('div');
        icon.className = 'file-chip-icon';
        const ext = file.name.split('.').pop().toUpperCase();
        icon.textContent = ext.substring(0, 4);
        chip.appendChild(icon);
      }

      const info = document.createElement('div');
      info.className = 'file-chip-info';
      info.innerHTML = '<div class="file-chip-name">' + escHtml(file.name) + '</div>'
        + '<div class="file-chip-size">' + formatSize(file.size) + '</div>';
      chip.appendChild(info);

      const btn = document.createElement('button');
      btn.className = 'file-chip-remove';
      btn.innerHTML = '&times;';
      btn.title = 'Remove';
      btn.addEventListener('click', () => removeFileFromQueue(idx));
      chip.appendChild(btn);

      container.appendChild(chip);
    });
  }

  function showFileError(msg) {
    const container = document.getElementById('file-chips');
    const chip = document.createElement('div');
    chip.className = 'file-chip file-chip-error';
    chip.textContent = msg;
    container.appendChild(chip);
    setTimeout(() => { if (chip.parentNode) chip.remove(); }, 3000);
  }

  function uploadFiles() {
    if (fileQueue.length === 0) return Promise.resolve([]);
    const form = new FormData();
    form.append('session_id', sessionId);
    fileQueue.forEach(f => form.append('files', f));
    return apiFetch('/api/upload', { method: 'POST', body: form })
      .then(r => r.json())
      .then(data => {
        fileQueue = [];
        renderFileChips();
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach(e => appendMessage('system', 'Upload error: ' + e));
        }
        return data.uploaded || [];
      })
      .catch(err => {
        appendMessage('system', 'Upload failed: ' + err.message);
        return [];
      });
  }

  initDragDrop();

  function setPipelineProgress(pct, label) {
    const el = document.getElementById('pipeline-progress');
    const fill = document.getElementById('pipeline-progress-fill');
    const lbl = document.getElementById('pipeline-progress-label');
    if (pct < 0) {
      el.classList.remove('active');
      fill.style.width = '0%';
      lbl.textContent = '';
      return;
    }
    el.classList.add('active');
    fill.style.width = Math.min(100, pct) + '%';
    lbl.textContent = label || '';
  }

  function setProcessingUI(processing) {
    const sendBtn = document.getElementById('btn-send');
    const cancelBtn = document.getElementById('btn-cancel');
    if (processing) {
      sendBtn.disabled = true;
      sendBtn.style.display = 'none';
      cancelBtn.style.display = '';
      setPipelineProgress(2, 'Starting...');
    } else {
      sendBtn.disabled = false;
      sendBtn.style.display = '';
      cancelBtn.style.display = 'none';
      activeAbortController = null;
      setTimeout(() => setPipelineProgress(-1, ''), 1500);
    }
  }

  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (!sessionId) return;
    apiFetch('/api/sessions/' + encodeURIComponent(sessionId) + '/cancel', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.cancelled) {
          if (activeAbortController) activeAbortController.abort();
        }
      })
      .catch(() => {});
  });

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg && fileQueue.length === 0) return;
    if (!sessionId) return;

    input.value = '';
    const hasFiles = fileQueue.length > 0;
    const fileNames = fileQueue.map(f => f.name);

    activeAbortController = new AbortController();
    setProcessingUI(true);

    const doSend = (uploadedFiles) => {
      let finalMsg = msg;
      if (uploadedFiles && uploadedFiles.length > 0) {
        const fileList = uploadedFiles.map(f => f.name).join(', ');
        if (finalMsg) {
          finalMsg += '\n\n[Uploaded files: ' + fileList + ']';
        } else {
          finalMsg = '[Uploaded files: ' + fileList + ']';
        }
        appendMessage('system', 'Uploaded: ' + fileList);
      }

      appendMessage('user', msg || '(files uploaded)');
      const typingEl = showTyping();

      const modelSelect = document.getElementById('llm-model');
      const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.5-pro';
      const agentSelect = document.getElementById('agent-model');
      const selectedAgent = agentSelect ? agentSelect.value : 'vultr/DeepSeek-V3.2-NVFP4';

      apiFetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMsg, session_id: sessionId, model: selectedModel, agent_model: selectedAgent }),
        signal: activeAbortController.signal
      }).then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function pump() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              setProcessingUI(false);
              if (typingEl.parentNode) typingEl.remove();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            let eventType = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ') && eventType) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleSSEEvent(eventType, data, typingEl);
                } catch(e) {}
                eventType = '';
              }
            }
            return pump();
          });
        }
        return pump();
      }).catch(err => {
        if (typingEl.parentNode) typingEl.remove();
        if (err.name !== 'AbortError') {
          appendMessage('system', 'Error: ' + err.message);
        }
        setProcessingUI(false);
      });
    };

    if (hasFiles) {
      uploadFiles().then(uploaded => doSend(uploaded));
    } else {
      doSend(null);
    }
  }

  function handleSSEEvent(event, data, typingEl) {
    switch (event) {
      case 'thinking':
        updateTyping(typingEl, data.status || 'Thinking...');
        setPipelineProgress(5, 'Analyzing...');
        break;
      case 'chain_start':
        chainTotal = data.segments || 1;
        setPipelineProgress(5, 'Chain: 0/' + chainTotal + ' steps');
        break;
      case 'chain_step': {
        const step = data.step || 1;
        const total = data.total || chainTotal || 1;
        const pct = Math.round((step - 1) / total * 80) + 10;
        const action = data.raw || '';
        setPipelineProgress(pct, 'Step ' + step + '/' + total + ': ' + action.substring(0, 50));
        highlightPipelineStageForAction(action, step, total);
        appendChainStepMarker(step, total, action);
        break;
      }
      case 'skill_selected':
        updateTyping(typingEl, 'Selected: /' + data.skill);
        highlightPipelineStage(data.skill);
        break;
      case 'executing':
        updateTyping(typingEl, data.status || 'Executing...');
        break;
      case 'unit_progress': {
        const unit = data.unit || 1;
        const total = data.total || 1;
        const basePct = chainTotal > 1 ? 70 : 10;
        const unitPct = basePct + Math.round((unit / total) * (90 - basePct));
        const label = data.status === 'executing'
          ? 'Unit ' + unit + '/' + total + ': executing...'
          : 'Unit ' + unit + '/' + total + ': ' + (data.verify_state || 'done');
        setPipelineProgress(unitPct, label);
        highlightPipelineStage('proceed-work');
        if (data.status === 'completed') {
          loadState();
        }
        break;
      }
      case 'state_updated':
        loadState();
        loadSessions();
        break;
      case 'response':
        if (typingEl.parentNode) typingEl.remove();
        appendAssistantMessage(data);
        loadState();
        loadHistory();
        loadSessions();
        break;
      case 'error':
        if (typingEl.parentNode) typingEl.remove();
        appendMessage('system', 'Error: ' + (data.error || 'unknown'));
        break;
      case 'done':
        if (typingEl.parentNode) typingEl.remove();
        setPipelineProgress(100, 'Complete');
        setProcessingUI(false);
        if (chainTotal > 0) {
          document.querySelectorAll('.tpmn-stage').forEach(el => {
            el.classList.remove('active');
            el.classList.add('done');
          });
          chainTotal = 0;
        }
        break;
      case 'chain_cancelled':
        if (typingEl.parentNode) typingEl.remove();
        appendMessage('system', data.message || 'Chain cancelled');
        setPipelineProgress(100, 'Cancelled');
        setProcessingUI(false);
        loadState();
        break;
      case 'unit_cancelled':
        if (typingEl.parentNode) typingEl.remove();
        appendMessage('system', data.message || 'Auto-proceed cancelled');
        setPipelineProgress(100, 'Cancelled');
        setProcessingUI(false);
        loadState();
        break;
    }
  }

  function appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const welcome = container.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function appendAssistantMessage(data) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';

    let html = '';
    if (data.skill) {
      html += '<span class="skill-badge">/' + escHtml(data.skill) + '</span><br>';
    }
    html += formatContent(data.content || '');
    if (data.duration_ms) {
      html += '<div class="chat-meta">' + data.duration_ms + 'ms';
      if (data.files_modified && data.files_modified.length) {
        html += ' | ' + data.files_modified.length + ' file(s)';
      }
      html += '</div>';
    }
    if (data.suggestion) {
      html += '<div class="chat-suggestion">' + escHtml(data.suggestion) + '</div>';
    }
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg system';
    div.innerHTML = '<span class="typing-text">Thinking...</span> <span class="typing-dots"><span></span><span></span><span></span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function updateTyping(el, text) {
    const span = el.querySelector('.typing-text');
    if (span) span.textContent = text;
  }

  function formatContent(text) {
    let html = escHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    // Stash rich tokens behind sentinels BEFORE the bare-URL auto-link runs,
    // so the auto-linker cannot re-match URLs inside their hrefs and produce
    // nested malformed HTML. Order matters: token replacement → auto-link →
    // sentinel restore.
    const _tokens = [];
    function stash(html_) {
      const idx = _tokens.length;
      _tokens.push(html_);
      return '\x01TOK' + idx + '\x01';
    }
    // [[CE_VIEWER_BUTTON|url]] → animated amber call-to-action button.
    html = html.replace(/\[\[CE_VIEWER_BUTTON\|([^\]]+)\]\]/g, (_, url) =>
      stash('<a class="ce-viewer-cta" href="' + url + '" target="_blank" rel="noopener">▶ Open CE Viewer</a>'));
    // Markdown link [label](url) → normal <a>.
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
      stash('<a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>'));
    // Bare-URL auto-link — only sees URLs that weren't stashed.
    html = html.replace(/(https?:\/\/[^\s<"')\]]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Restore stashed tokens.
    html = html.replace(/\x01TOK(\d+)\x01/g, (_, i) => _tokens[parseInt(i, 10)]);
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // State panel — session scoped
  function loadState() {
    if (!sessionId) return;
    apiFetch('/api/crafter/state?session_id=' + sessionId).then(r => r.json()).then(data => {
      document.getElementById('cnt-pending').textContent = data.alarm?.pending || 0;
      document.getElementById('cnt-inprog').textContent = data.alarm?.in_progress || 0;
      document.getElementById('cnt-done').textContent = data.alarm?.completed || 0;
      document.getElementById('cnt-abort').textContent = data.alarm?.aborted || 0;
      const label = document.getElementById('explorer-root-label');
      if (label && data.active_project) label.textContent = data.active_project + '/';

      const wpList = document.getElementById('workplan-list');
      if (!data.work_plans || data.work_plans.length === 0) {
        wpList.innerHTML = '<p class="muted">No work plans yet.</p>';
        return;
      }
      wpList.innerHTML = data.work_plans.map(wp => {
        const pct = wp.unit_count > 0 ? Math.round((wp.completed / wp.unit_count) * 100) : 0;
        const statusClass = (wp.status || '').toLowerCase().replace(/ /g, '_');
        return `<div class="wp-card status-${statusClass}" onclick="viewWorkPlan('${escHtml(wp.id)}')">
          <div class="wp-id">${escHtml(wp.id)}</div>
          <div class="wp-title">${escHtml(wp.title)}</div>
          <div class="wp-progress">${wp.completed}/${wp.unit_count} units | ${wp.status}</div>
          <div class="wp-progress-bar"><div class="wp-progress-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
    }).catch(() => {});
  }

  function loadSkills() {
    apiFetch('/api/crafter/skills').then(r => r.json()).then(skills => {
      cachedSkillList = skills || [];
      const el = document.getElementById('skill-catalog');
      if (!skills || !skills.length) {
        el.innerHTML = '<p class="muted">No skills loaded.</p>';
        return;
      }
      el.innerHTML = skills.map(s =>
        `<span class="skill-tag" data-skill="${escHtml(s.name)}" title="${escHtml(s.description)}">/${escHtml(s.name)}</span>`
      ).join('');
    }).catch(() => {});
  }

  function loadHistory() {
    if (!sessionId) return;
    apiFetch('/api/crafter/history?session_id=' + sessionId).then(r => r.json()).then(entries => {
      const el = document.getElementById('exec-log');
      if (!entries || !entries.length) {
        el.innerHTML = '<p class="muted">No executions yet.</p>';
        return;
      }
      el.innerHTML = entries.reverse().slice(0, 10).map(e => {
        const statusClass = e.success ? 'log-ok' : 'log-fail';
        const icon = e.success ? '&#x2713;' : '&#x2717;';
        return `<div class="log-entry">
          <span class="log-skill">/${escHtml(e.skill)}</span>
          <span class="log-summary">${escHtml(e.summary)}</span>
          <span class="log-time ${statusClass}">${icon} ${e.duration_ms}ms</span>
        </div>`;
      }).join('');
    }).catch(() => {});
  }

  function appendChainStepMarker(step, total, action) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg chain-step';
    div.innerHTML = '⟶ Step ' + step + '/' + total + ': <strong>' + escHtml(action) + '</strong>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function highlightPipelineStageForAction(action, step, total) {
    const actionToSkill = {
      'create-project': 'init-session',
      'plan-work': 'plan-work',
      'proceed-work': 'proceed-work',
      'verify-work': 'verify-work',
      'deploy-work': 'deploy',
    };
    // Mark previous stages as done
    const stageOrder = ['stage-init', 'stage-plan', 'stage-proceed', 'stage-verify', 'stage-deploy'];
    const actionOrder = ['create-project', 'plan-work', 'proceed-work', 'verify-work', 'deploy-work'];
    const currentIdx = actionOrder.indexOf(action);
    if (currentIdx >= 0) {
      stageOrder.forEach((sid, i) => {
        const el = document.getElementById(sid);
        if (!el) return;
        el.classList.remove('active', 'done');
        if (i < currentIdx) el.classList.add('done');
        else if (i === currentIdx) el.classList.add('active');
      });
    } else {
      const skill = actionToSkill[action];
      if (skill) highlightPipelineStage(skill);
    }
  }

  function highlightPipelineStage(skillName) {
    const stageMap = {
      'init-session': 'stage-init',
      'create-project': 'stage-init',
      'plan-work': 'stage-plan',
      'proceed-work': 'stage-proceed',
      'auto-proceed': 'stage-proceed',
      'verify-work': 'stage-verify',
      'archive-work': 'stage-deploy',
      'deploy': 'stage-deploy',
      'deploy-work': 'stage-deploy',
      'check-session': 'stage-plan',
      'update-work-plan': 'stage-plan',
      // WP-AO-45: /create-ce is now dispatched INSIDE proceed-work as the
      // unit's action (atomic-skill fast-path). It belongs to the Execute
      // stage, not Deploy. The proceed-work wrapper handles the rest of the
      // canonical chain (verify-work, deploy-work) which advance V and D
      // legitimately through chain_step events as each fires.
      'create-ce': 'stage-proceed',
    };
    const id = stageMap[skillName];
    if (!id) return;
    const stageOrder = ['stage-init', 'stage-plan', 'stage-proceed', 'stage-verify', 'stage-deploy'];
    const currentIdx = stageOrder.indexOf(id);
    stageOrder.forEach((sid, i) => {
      const el = document.getElementById(sid);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i < currentIdx) el.classList.add('done');
      else if (i === currentIdx) el.classList.add('active');
    });
  }

  window.viewWorkPlan = function(id) {
    apiFetch('/api/crafter/workplan/' + encodeURIComponent(id) + '?session_id=' + sessionId)
      .then(r => r.json())
      .then(data => {
        appendMessage('system', '--- ' + id + ' ---');
        appendAssistantMessage({ content: data.content, skill: 'work-plan' });
      })
      .catch(err => appendMessage('system', 'Failed to load: ' + err.message));
  };

  // === Explorer ===
  let explorerLoaded = false;

  function initExplorer() {
    explorerLoaded = true;
    const refreshBtn = document.getElementById('btn-refresh-tree');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadFileTree('.'));
    loadFileTree('.');
  }

  // === Workflow Canvas (WP-AO-38, embedded via iframe) ===
  function initWorkflowCanvas() {
    const frame = document.getElementById('wf-canvas-frame');
    if (!frame) return;
    const key = getAccessKey();
    const want = '/workflow-canvas.html?key=' + encodeURIComponent(key);
    // Only (re)load the iframe when src is missing or the auth key changed —
    // avoid wiping the user's in-progress canvas state on every tab switch.
    if (!frame.getAttribute('src') || frame.getAttribute('src') !== want) {
      frame.src = want;
    } else {
      // WP-AO-49 Unit 3: iframe already loaded — postMessage to refresh the
      // CE palette so freshly-created CEs from the Crafter tab appear
      // without a full page reload.
      try {
        frame.contentWindow?.postMessage({ type: 'reload-registry' }, '*');
      } catch (e) { /* iframe not ready yet — harmless */ }
    }
  }

  function loadFileTree(path) {
    const treeEl = document.getElementById('file-tree');
    treeEl.innerHTML = '<p class="muted">Loading...</p>';
    const sid = sessionId ? '&session_id=' + encodeURIComponent(sessionId) : '';
    apiFetch('/api/explorer/list?path=' + encodeURIComponent(path) + sid)
      .then(r => r.json())
      .then(entries => {
        if (!entries || entries.length === 0) {
          treeEl.innerHTML = '<p class="muted">Empty directory.</p>';
          return;
        }
        renderTree(treeEl, entries, path);
      })
      .catch(() => {
        treeEl.innerHTML = '<p class="muted">Failed to load.</p>';
      });
  }

  function renderTree(container, entries, parentPath) {
    container.innerHTML = '';
    if (parentPath && parentPath !== '.') {
      const back = document.createElement('div');
      back.className = 'tree-item dir';
      back.textContent = '.. (up)';
      back.addEventListener('click', () => {
        const parent = parentPath.includes('/') ? parentPath.substring(0, parentPath.lastIndexOf('/')) : '.';
        loadFileTree(parent);
      });
      container.appendChild(back);
    }
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'tree-item' + (entry.is_dir ? ' dir' : '');
      const icon = entry.is_dir ? '\u{1F4C1} ' : '\u{1F4C4} ';
      const sizeStr = entry.is_dir ? '' : ' (' + formatSize(entry.size) + ')';
      item.textContent = icon + entry.name + sizeStr;
      item.addEventListener('click', () => {
        if (entry.is_dir) {
          loadFileTree(entry.path);
        } else {
          loadFileContent(entry.path);
          document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        }
      });
      container.appendChild(item);
    });
  }

  function loadFileContent(path) {
    const headerEl = document.getElementById('viewer-header');
    const contentEl = document.getElementById('viewer-content');
    headerEl.innerHTML = '<span class="viewer-path">Loading ' + escHtml(path) + '...</span>';
    contentEl.textContent = '';
    const sid = sessionId ? '&session_id=' + encodeURIComponent(sessionId) : '';
    apiFetch('/api/explorer/read?path=' + encodeURIComponent(path) + sid)
      .then(r => r.json())
      .then(data => {
        headerEl.innerHTML = '<span class="viewer-path">' + escHtml(data.path) + '</span><span class="viewer-size">' + formatSize(data.size) + '</span>';
        contentEl.textContent = data.content;
      })
      .catch(() => {
        headerEl.innerHTML = '<span class="viewer-path">Error loading file</span>';
        contentEl.textContent = 'Failed to read file.';
      });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

})();
