// ==UserScript==
// @name         Text Snippets Pro (Side Panel + Drag & Drop)
// @namespace    https://local.text-snippets/
// @version      1.0.0
// @description  Insert plain or rich text snippets into any web form with instant sync, Drag & Drop organization, Quick Picker (Alt+S), and JSON Import/Export.
// @author       Text Snippets
// @match        *://*/*
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const STORAGE_KEY_TEXTS = "ts_texts_v1";
  const STORAGE_KEY_ID = "ts_textId_v1";
  const STORAGE_KEY_SETTINGS = "ts_settings_v1";

  // --- Track last focused editable target across the page ---
  let lastTarget = null;
  let lastRange = null;

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "textarea") return !el.readOnly && !el.disabled;
    if (tag === "input") {
      const type = (el.type || "text").toLowerCase();
      const nonText = ["button", "submit", "reset", "checkbox", "radio", "file", "image", "hidden", "range", "color"];
      return !nonText.includes(type) && !el.readOnly && !el.disabled;
    }
    return false;
  }

  function resolveDeepActiveElement() {
    let doc = document;
    let win = window;
    let active = doc.activeElement;
    let depth = 0;
    while (active && depth < 30) {
      depth++;
      if (active.tagName === "IFRAME") {
        try {
          if (active.contentDocument) {
            doc = active.contentDocument;
            win = active.contentWindow || win;
            active = doc.activeElement;
            continue;
          }
        } catch {
          break;
        }
      }
      if (active.shadowRoot && active.shadowRoot.activeElement) {
        active = active.shadowRoot.activeElement;
        continue;
      }
      break;
    }
    return { active, doc, win };
  }

  function captureActiveTarget() {
    const { active, doc, win } = resolveDeepActiveElement();
    // Ignore our own Shadow DOM host
    if (active && active.id === "ts-userscript-host") return;
    if (isEditable(active) || doc.designMode === "on") {
      lastTarget = { active, doc, win };
      if (active && active.isContentEditable) {
        try {
          const sel = win.getSelection();
          if (sel && sel.rangeCount > 0) {
            lastRange = sel.getRangeAt(0).cloneRange();
          }
        } catch {
          lastRange = null;
        }
      } else {
        lastRange = null;
      }
    }
  }

  document.addEventListener("focusin", captureActiveTarget, true);
  document.addEventListener("mouseup", captureActiveTarget, true);
  document.addEventListener("keyup", captureActiveTarget, true);

  // --- Lightweight HTML Sanitizer ---
  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const blockedTags = new Set(["SCRIPT", "IFRAME", "OBJECT", "EMBED", "STYLE", "LINK", "META", "BASE"]);
    const walk = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (blockedTags.has(child.tagName)) {
            child.remove();
            continue;
          }
          for (const attr of Array.from(child.attributes)) {
            const name = attr.name.toLowerCase();
            const val = (attr.value || "").trim().toLowerCase();
            if (name.startsWith("on") || ((name === "href" || name === "src") && val.startsWith("javascript:"))) {
              child.removeAttribute(attr.name);
            }
          }
          walk(child);
        }
      }
    };
    walk(template.content);
    return template.innerHTML;
  }

  // --- Snippet Insertion ---
  function insertTextIntoPage(text, isHtml) {
    let targetInfo = lastTarget;
    const current = resolveDeepActiveElement();
    if (current.active && current.active.id !== "ts-userscript-host" && (isEditable(current.active) || current.doc.designMode === "on")) {
      targetInfo = current;
    }

    if (!targetInfo || !targetInfo.active) {
      return { ok: false, reason: "Click an editable field on the page first" };
    }

    const { active, doc, win } = targetInfo;
    try {
      active.focus({ preventScroll: true });
    } catch {}

    if (doc.designMode === "on") {
      const htmlContent = isHtml ? sanitizeHtml(text) : text.replace(/\r\n|\r|\n/g, "<br/>");
      doc.execCommand("insertHTML", false, htmlContent);
      return { ok: true };
    }

    const tag = active.tagName ? active.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") {
      const start = typeof active.selectionStart === "number" ? active.selectionStart : active.value.length;
      const end = typeof active.selectionEnd === "number" ? active.selectionEnd : active.value.length;
      const nextVal = active.value.slice(0, start) + text + active.value.slice(end);

      const proto = tag === "textarea" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(active, nextVal);
      } else {
        active.value = nextVal;
      }

      try {
        active.setSelectionRange(start + text.length, start + text.length);
      } catch {}
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }

    if (active.isContentEditable) {
      const sel = win.getSelection();
      if (!sel) return { ok: false, reason: "No selection available" };

      if (lastRange && sel.rangeCount === 0) {
        sel.removeAllRanges();
        sel.addRange(lastRange);
      } else if (lastRange && active.contains(lastRange.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(lastRange);
      }

      let range;
      if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
      } else {
        range = doc.createRange();
        range.selectNodeContents(active);
        range.collapse(false);
      }

      range.deleteContents();
      const frag = doc.createDocumentFragment();
      if (isHtml) {
        const div = doc.createElement("div");
        div.innerHTML = sanitizeHtml(text);
        while (div.firstChild) frag.appendChild(div.firstChild);
      } else {
        const lines = text.split(/\r\n|\r|\n/);
        lines.forEach((line, idx) => {
          if (idx > 0) frag.appendChild(doc.createElement("br"));
          if (line.length > 0) frag.appendChild(doc.createTextNode(line));
        });
      }

      const lastNode = frag.lastChild;
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        lastRange = range.cloneRange();
      }
      active.dispatchEvent(new Event("input", { bubbles: true }));
      return { ok: true };
    }

    return { ok: false, reason: "Target element is not editable" };
  }

  // --- Shared Tree & Storage Helpers ---
  function loadTexts() {
    const raw = GM_getValue(STORAGE_KEY_TEXTS, []);
    return Array.isArray(raw) ? raw : [];
  }

  function saveTexts(texts) {
    recomputeLevels(texts);
    GM_setValue(STORAGE_KEY_TEXTS, JSON.parse(JSON.stringify(texts)));
  }

  function nextId() {
    const cur = Number(GM_getValue(STORAGE_KEY_ID, 0)) + 1;
    GM_setValue(STORAGE_KEY_ID, cur);
    return cur;
  }

  function loadSettings() {
    return GM_getValue(STORAGE_KEY_SETTINGS, { defaultRichText: false });
  }

  function saveSettings(settings) {
    GM_setValue(STORAGE_KEY_SETTINGS, { ...settings });
  }

  function findNodeContext(nodes, id, parent = null) {
    const targetId = Number(id);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (Number(node.id) === targetId) {
        return { node, parent, list: nodes, index: i };
      }
      if (node.type === "folder" && Array.isArray(node.items) && node.items.length > 0) {
        const found = findNodeContext(node.items, targetId, node);
        if (found) return found;
      }
    }
    return null;
  }

  function isDescendant(node, potentialDescendantId) {
    if (!node || node.type !== "folder" || !Array.isArray(node.items)) return false;
    const targetId = Number(potentialDescendantId);
    for (const child of node.items) {
      if (Number(child.id) === targetId) return true;
      if (child.type === "folder" && isDescendant(child, targetId)) return true;
    }
    return false;
  }

  function recomputeLevels(nodes, parentId = 0, level = 0) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      node.parent = parentId;
      node.level = level;
      if (node.type === "folder") {
        if (!Array.isArray(node.items)) node.items = [];
        recomputeLevels(node.items, node.id, level + 1);
      }
    }
  }

  function flattenFolders(nodes, excludeId = null, out = []) {
    if (!Array.isArray(nodes)) return out;
    for (const node of nodes) {
      if (node.type === "folder") {
        if (excludeId !== null && Number(node.id) === Number(excludeId)) continue;
        out.push(node);
        if (Array.isArray(node.items) && node.items.length > 0) {
          flattenFolders(node.items, excludeId, out);
        }
      }
    }
    return out;
  }

  function moveNode(texts, sourceId, targetId, position) {
    const srcId = Number(sourceId);
    const tgtId = targetId != null ? Number(targetId) : null;
    if (position !== "root" && srcId === tgtId) return false;

    const srcCtx = findNodeContext(texts, srcId);
    if (!srcCtx) return false;

    if (position !== "root" && tgtId !== null) {
      if (srcCtx.node.type === "folder" && isDescendant(srcCtx.node, tgtId)) {
        return false;
      }
    }

    const [moved] = srcCtx.list.splice(srcCtx.index, 1);

    if (position === "root") {
      texts.push(moved);
      recomputeLevels(texts);
      return true;
    }

    const tgtCtx = findNodeContext(texts, tgtId);
    if (!tgtCtx) {
      srcCtx.list.splice(srcCtx.index, 0, moved);
      return false;
    }

    if (position === "inside" && tgtCtx.node.type === "folder") {
      if (!Array.isArray(tgtCtx.node.items)) tgtCtx.node.items = [];
      tgtCtx.node.items.push(moved);
    } else if (position === "before") {
      tgtCtx.list.splice(tgtCtx.index, 0, moved);
    } else if (position === "after") {
      tgtCtx.list.splice(tgtCtx.index + 1, 0, moved);
    } else {
      srcCtx.list.splice(srcCtx.index, 0, moved);
      return false;
    }

    recomputeLevels(texts);
    return true;
  }

  function validateImportData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id !== "undefined" &&
        item.id !== "" &&
        (item.type === "text" || item.type === "folder") &&
        (item.type !== "folder" || !item.items || validateImportData(item.items))
    );
  }

  function assignNewIds(nodes, nextIdFn, parentId = 0, level = 0) {
    for (const node of nodes) {
      node.id = nextIdFn();
      node.parent = parentId;
      node.level = level;
      node.html = Boolean(node.html === true || node.html === "true");
      if (node.type === "folder") {
        if (!Array.isArray(node.items)) node.items = [];
        assignNewIds(node.items, nextIdFn, node.id, level + 1);
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --- UI State & Shadow DOM ---
  const state = {
    texts: loadTexts(),
    settings: loadSettings(),
    drawerOpen: false,
    managerOpen: false,
    managerTab: "manage", // manage | import | export | settings
    searchQuery: "",
    collapsedFolders: new Set(),
    selectedId: null,
    draft: null,
    dirty: false,
    htmlSourceMode: false,
    dragSourceId: null,
    dropTargetId: null,
    dropPosition: null,
  };

  let host = null;
  let shadow = null;

  function ensureUI() {
    if (host && document.body.contains(host)) return;
    host = document.createElement("div");
    host.id = "ts-userscript-host";
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647;";
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${STYLES}</style><div id="ts-root"></div>`;
    document.body.appendChild(host);
  }

  function showToast(msg, type = "success") {
    ensureUI();
    const root = shadow.getElementById("ts-root");
    const el = document.createElement("div");
    el.className = `ts-toast ${type}`;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function nodeMatches(node, q) {
    if (!q) return true;
    const lower = q.toLowerCase();
    if ((node.name || "").toLowerCase().includes(lower)) return true;
    if (node.type === "text" && (node.text || "").toLowerCase().includes(lower)) return true;
    if (node.type === "folder" && Array.isArray(node.items)) {
      return node.items.some((c) => nodeMatches(c, q));
    }
    return false;
  }

  function syncDraft() {
    if (state.selectedId == null) {
      state.draft = null;
      state.dirty = false;
      return;
    }
    const ctx = findNodeContext(state.texts, state.selectedId);
    if (!ctx) {
      state.selectedId = null;
      state.draft = null;
      state.dirty = false;
      return;
    }
    const n = ctx.node;
    state.draft = {
      id: n.id,
      type: n.type,
      name: n.name || "",
      parent: Number(n.parent) || 0,
      html: Boolean(n.html === true || n.html === "true"),
      text: n.text || "",
      level: n.level || 0,
    };
    state.dirty = false;
  }

  // --- Drawer (Quick Picker) ---
  function renderDrawerRows(nodes, depth = 0) {
    let html = "";
    const q = state.searchQuery.trim();
    for (const node of nodes) {
      if (q && !nodeMatches(node, q)) continue;
      const isFolder = node.type === "folder";
      const isCollapsed = !q && state.collapsedFolders.has(node.id);
      const isRich = !isFolder && (node.html === true || node.html === "true");
      const indent = depth * 14 + 10;

      html += `
        <div class="ts-drawer-row ${isFolder ? "folder" : "snippet"}" data-id="${node.id}" style="padding-left:${indent}px" title="${escapeHtml(node.name || "(Untitled)")}">
          <span>${isFolder ? (isCollapsed ? "▸ 📁" : "▾ 📂") : "📄"}</span>
          <span class="ts-row-label">${escapeHtml(node.name || "(Untitled)")}</span>
          ${isRich ? `<span class="ts-badge">Rich</span>` : ""}
          ${!isFolder ? `<button class="ts-mini-btn" data-copy="${node.id}">Copy</button>` : ""}
        </div>
      `;
      if (isFolder && !isCollapsed && Array.isArray(node.items) && node.items.length > 0) {
        html += renderDrawerRows(node.items, depth + 1);
      }
    }
    return html;
  }

  // --- Manager Tree ---
  function renderManagerTreeRows(nodes, depth = 0) {
    let html = "";
    const q = state.searchQuery.trim();
    for (const node of nodes) {
      if (q && !nodeMatches(node, q)) continue;
      const isFolder = node.type === "folder";
      const isSelected = Number(state.selectedId) === Number(node.id);
      const isCollapsed = !q && state.collapsedFolders.has(node.id);
      const isRich = !isFolder && (node.html === true || node.html === "true");
      const indent = depth * 16 + 8;

      html += `
        <div class="ts-tree-row ${isSelected ? "selected" : ""}" draggable="true" data-id="${node.id}" data-type="${node.type}" style="padding-left:${indent}px">
          <span class="ts-drag-handle">⋮⋮</span>
          ${isFolder ? `<button class="ts-folder-toggle" data-toggle="${node.id}">${isCollapsed ? "▸" : "▾"}</button>` : `<span style="width:16px;flex-shrink:0"></span>`}
          <span>${isFolder ? (isCollapsed ? "📁" : "📂") : "📄"}</span>
          <span class="ts-row-label">${escapeHtml(node.name || "(Untitled)")}</span>
          ${isRich ? `<span class="ts-badge">Rich</span>` : ""}
          ${isFolder ? `<span class="ts-count">${(node.items || []).length}</span>` : ""}
        </div>
      `;
      if (isFolder && !isCollapsed && Array.isArray(node.items) && node.items.length > 0) {
        html += renderManagerTreeRows(node.items, depth + 1);
      }
    }
    return html;
  }

  function render() {
    ensureUI();
    const root = shadow.getElementById("ts-root");

    const fabHtml = `
      <button class="ts-fab" id="ts-fab" title="Text Snippets (Alt+S)">
        📝
      </button>
    `;

    let drawerHtml = "";
    if (state.drawerOpen) {
      const rows = state.texts.length
        ? renderDrawerRows(state.texts, 0) || `<div class="ts-empty">No matching snippets.</div>`
        : `<div class="ts-empty">No snippets yet. Click <b>Manage</b> to add one.</div>`;
      drawerHtml = `
        <div class="ts-drawer" id="ts-drawer">
          <div class="ts-drawer-header">
            <span style="font-weight:700;">📝 Text Snippets</span>
            <div style="display:flex;gap:6px;">
              <button class="ts-btn ts-btn-sm" id="ts-open-manager">Manage</button>
              <button class="ts-btn ts-btn-sm" id="ts-close-drawer">✕</button>
            </div>
          </div>
          <div class="ts-drawer-search">
            <input id="ts-drawer-search" class="ts-input" type="text" placeholder="Search snippets... (Alt+S)" value="${escapeHtml(state.searchQuery)}" />
          </div>
          <div class="ts-drawer-list" id="ts-drawer-list">${rows}</div>
        </div>
      `;
    }

    let managerHtml = "";
    if (state.managerOpen) {
      managerHtml = renderManagerModal();
    }

    root.innerHTML = fabHtml + drawerHtml + managerHtml;
    bindEvents();
  }

  function renderManagerModal() {
    let bodyHtml = "";
    if (state.managerTab === "manage") {
      const folders = flattenFolders(
        state.texts,
        state.draft && state.draft.type === "folder" ? state.draft.id : null
      );
      const treeRows = state.texts.length
        ? (renderManagerTreeRows(state.texts, 0) || `<div class="ts-empty">No matching snippets.</div>`) +
          `<div id="ts-root-drop" class="ts-root-drop" style="display:none;">Drop here to move to Root</div>`
        : `<div class="ts-empty">No snippets yet. Click <b>+ Snippet</b> above.</div>`;

      let editorHtml = "";
      if (!state.draft) {
        editorHtml = `
          <div class="ts-editor-empty">
            <div style="font-size:32px;margin-bottom:8px;">✨</div>
            <h3 style="margin:0 0 6px 0;">Select or Create a Snippet</h3>
            <p style="margin:0 0 16px 0;color:#64748b;">Drag &amp; drop items on the left to reorder or nest into folders. All changes sync across every tab instantly.</p>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="ts-btn ts-btn-primary" id="ts-empty-add-text">+ New Snippet</button>
              <button class="ts-btn" id="ts-empty-add-folder">+ New Folder</button>
            </div>
          </div>
        `;
      } else {
        const d = state.draft;
        const isFolder = d.type === "folder";
        const folderOpts = [
          `<option value="0" ${d.parent === 0 ? "selected" : ""}>Root (No Folder)</option>`,
          ...folders.map(
            (f) =>
              `<option value="${f.id}" ${d.parent === f.id ? "selected" : ""}>${"&nbsp;&nbsp;".repeat(f.level || 0)}${escapeHtml(f.name)}</option>`
          ),
        ].join("");

        editorHtml = `
          <div class="ts-editor-card">
            <div class="ts-editor-top">
              <div style="display:flex;align-items:center;gap:8px;font-weight:600;">
                <span>${isFolder ? "📂 Edit Folder" : "📄 Edit Snippet"}</span>
                ${state.dirty ? `<span class="ts-pill warn">● Unsaved</span>` : `<span class="ts-pill ok">✓ Synced</span>`}
              </div>
              <div style="display:flex;gap:6px;">
                ${
                  isFolder
                    ? `<button class="ts-btn ts-btn-sm" id="ts-add-in-folder">+ Snippet Inside</button>`
                    : `<button class="ts-btn ts-btn-sm" id="ts-dup-btn">Duplicate</button>`
                }
              </div>
            </div>

            <div class="ts-editor-fields">
              <div class="ts-grid-2">
                <div class="ts-field">
                  <label>Name</label>
                  <input id="ts-ed-name" class="ts-input" type="text" value="${escapeHtml(d.name)}" />
                </div>
                <div class="ts-field">
                  <label>Parent Folder</label>
                  <select id="ts-ed-parent" class="ts-select">${folderOpts}</select>
                </div>
              </div>

              ${
                !isFolder
                  ? `
                <div class="ts-field">
                  <label>Format</label>
                  <div class="ts-seg">
                    <button type="button" id="ts-fmt-plain" class="${!d.html ? "active" : ""}">Plain Text</button>
                    <button type="button" id="ts-fmt-rich" class="${d.html ? "active" : ""}">Rich Text (HTML)</button>
                  </div>
                </div>
                <div class="ts-field" style="flex:1;display:flex;flex-direction:column;min-height:180px;">
                  <label>Content</label>
                  ${
                    !d.html
                      ? `<textarea id="ts-ed-plain" class="ts-textarea" placeholder="Type snippet text...">${escapeHtml(d.text)}</textarea>`
                      : state.htmlSourceMode
                      ? `<div class="ts-rte">
                           <div class="ts-rte-bar"><button type="button" class="ts-rte-btn active" id="ts-rte-src">&lt;/&gt; Visual</button></div>
                           <textarea id="ts-ed-src" class="ts-textarea" style="border:none;font-family:monospace;font-size:12px;">${escapeHtml(d.text)}</textarea>
                         </div>`
                      : `<div class="ts-rte">
                           <div class="ts-rte-bar">
                             <button type="button" class="ts-rte-btn" data-cmd="bold"><b>B</b></button>
                             <button type="button" class="ts-rte-btn" data-cmd="italic"><i>I</i></button>
                             <button type="button" class="ts-rte-btn" data-cmd="underline"><u>U</u></button>
                             <button type="button" class="ts-rte-btn" data-cmd="strikeThrough"><s>S</s></button>
                             <button type="button" class="ts-rte-btn" data-cmd="insertUnorderedList">• List</button>
                             <button type="button" class="ts-rte-btn" data-cmd="insertOrderedList">1. List</button>
                             <button type="button" class="ts-rte-btn" id="ts-rte-link">🔗 Link</button>
                             <button type="button" class="ts-rte-btn" data-cmd="removeFormat">✕ Clear</button>
                             <button type="button" class="ts-rte-btn" id="ts-rte-src">&lt;/&gt; HTML</button>
                           </div>
                           <div id="ts-rte-surface" class="ts-rte-surface" contenteditable="true"></div>
                         </div>`
                  }
                </div>
              `
                  : `<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#64748b;">Drag &amp; drop snippets onto this folder in the tree to organize them.</div>`
              }
            </div>

            <div class="ts-editor-footer">
              <div style="display:flex;gap:8px;">
                <button class="ts-btn ts-btn-primary" id="ts-save-btn">Save (Ctrl+S)</button>
                ${!isFolder ? `<button class="ts-btn" id="ts-copy-btn">Copy</button>` : ""}
              </div>
              <button class="ts-btn ts-btn-danger" id="ts-del-btn">Delete</button>
            </div>
          </div>
        `;
      }

      bodyHtml = `
        <div class="ts-mgr-split">
          <div class="ts-mgr-tree">
            <div class="ts-mgr-tree-bar">
              <div style="display:flex;gap:6px;">
                <button class="ts-btn ts-btn-primary ts-btn-sm" id="ts-add-text" style="flex:1">+ Snippet</button>
                <button class="ts-btn ts-btn-sm" id="ts-add-folder" style="flex:1">+ Folder</button>
              </div>
              <input id="ts-mgr-search" class="ts-input" type="text" placeholder="Search..." value="${escapeHtml(state.searchQuery)}" />
            </div>
            <div class="ts-mgr-tree-list" id="ts-mgr-tree-list">${treeRows}</div>
          </div>
          <div class="ts-mgr-editor">${editorHtml}</div>
        </div>
      `;
    } else if (state.managerTab === "import") {
      bodyHtml = `
        <div class="ts-pad">
          <h3 style="margin:0 0 8px 0;">Import Snippets (JSON)</h3>
          <p style="margin:0 0 12px 0;color:#64748b;">Paste exported JSON from the Chrome extension or load a backup file.</p>
          <div class="ts-grid-2" style="margin-bottom:12px;">
            <div class="ts-field">
              <label>Mode</label>
              <select id="ts-imp-mode" class="ts-select">
                <option value="Append">Append (Keep existing)</option>
                <option value="Overwrite">Overwrite (Replace all)</option>
              </select>
            </div>
            <div class="ts-field">
              <label>File</label>
              <input id="ts-imp-file" class="ts-input" type="file" accept=".json,.txt" />
            </div>
          </div>
          <textarea id="ts-imp-json" class="ts-textarea" style="min-height:220px;font-family:monospace;font-size:12px;" placeholder="Paste JSON here..."></textarea>
          <div style="margin-top:12px;">
            <button class="ts-btn ts-btn-primary" id="ts-imp-run">Import Now</button>
          </div>
        </div>
      `;
    } else if (state.managerTab === "export") {
      const json = JSON.stringify(state.texts, null, 2);
      bodyHtml = `
        <div class="ts-pad">
          <h3 style="margin:0 0 8px 0;">Export Snippets (JSON)</h3>
          <textarea class="ts-textarea" readonly style="min-height:260px;font-family:monospace;font-size:12px;">${escapeHtml(json)}</textarea>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="ts-btn ts-btn-primary" id="ts-exp-copy">Copy JSON</button>
            <button class="ts-btn" id="ts-exp-dl">Download .json</button>
          </div>
        </div>
      `;
    } else if (state.managerTab === "settings") {
      bodyHtml = `
        <div class="ts-pad">
          <h3 style="margin:0 0 8px 0;">Settings</h3>
          <div class="ts-field" style="max-width:260px;">
            <label>Default Format for New Snippets</label>
            <select id="ts-set-rich" class="ts-select">
              <option value="false" ${!state.settings.defaultRichText ? "selected" : ""}>Plain Text</option>
              <option value="true" ${state.settings.defaultRichText ? "selected" : ""}>Rich Text (HTML)</option>
            </select>
          </div>
          <p style="margin-top:14px;color:#64748b;font-size:12.5px;">Shortcut: Press <b>Alt + S</b> on any webpage to open/close the Quick Snippet Picker.</p>
        </div>
      `;
    }

    return `
      <div class="ts-modal-backdrop" id="ts-modal-backdrop">
        <div class="ts-modal">
          <div class="ts-modal-header">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-weight:700;font-size:15px;">📝 Text Snippets Manager</span>
              <div class="ts-tabs">
                <button class="ts-tab ${state.managerTab === "manage" ? "active" : ""}" data-tab="manage">Manage</button>
                <button class="ts-tab ${state.managerTab === "import" ? "active" : ""}" data-tab="import">Import</button>
                <button class="ts-tab ${state.managerTab === "export" ? "active" : ""}" data-tab="export">Export</button>
                <button class="ts-tab ${state.managerTab === "settings" ? "active" : ""}" data-tab="settings">Settings</button>
              </div>
            </div>
            <button class="ts-btn ts-btn-sm" id="ts-close-manager">✕ Close</button>
          </div>
          <div class="ts-modal-body">${bodyHtml}</div>
        </div>
      </div>
    `;
  }

  function createItem(type) {
    const id = nextId();
    const node = {
      id,
      type,
      level: 0,
      parent: 0,
      name: type === "text" ? "New Snippet" : "New Folder",
      text: "",
      html: type === "text" ? Boolean(state.settings.defaultRichText) : false,
    };
    if (type === "folder") node.items = [];

    const sel = state.selectedId != null ? findNodeContext(state.texts, state.selectedId) : null;
    if (sel && sel.node.type === "folder") {
      sel.node.items.push(node);
      state.collapsedFolders.delete(sel.node.id);
    } else if (sel && sel.parent) {
      sel.parent.items.push(node);
    } else {
      state.texts.push(node);
    }

    saveTexts(state.texts);
    state.selectedId = id;
    syncDraft();
    render();
    showToast(type === "text" ? "Snippet created" : "Folder created");
  }

  function saveDraft() {
    if (!state.draft) return;
    const ctx = findNodeContext(state.texts, state.draft.id);
    if (!ctx) return;

    if (ctx.node.type === "text" && state.draft.html && !state.htmlSourceMode) {
      const rte = shadow.getElementById("ts-rte-surface");
      if (rte) state.draft.text = rte.innerHTML;
    }

    ctx.node.name = state.draft.name.trim() || "(Untitled)";
    ctx.node.html = state.draft.type === "text" ? Boolean(state.draft.html) : false;
    ctx.node.text = state.draft.type === "text" ? state.draft.text : "";

    const targetParent = Number(state.draft.parent) || 0;
    const curParent = Number(ctx.node.parent) || 0;
    if (targetParent !== curParent) {
      if (targetParent === 0) moveNode(state.texts, ctx.node.id, null, "root");
      else {
        moveNode(state.texts, ctx.node.id, targetParent, "inside");
        state.collapsedFolders.delete(targetParent);
      }
    }

    saveTexts(state.texts);
    state.dirty = false;
    syncDraft();
    render();
    showToast("Saved & synced!");
  }

  function bindEvents() {
    const fab = shadow.getElementById("ts-fab");
    fab?.addEventListener("mousedown", (e) => e.preventDefault());
    fab?.addEventListener("click", () => {
      state.drawerOpen = !state.drawerOpen;
      render();
    });

    shadow.getElementById("ts-close-drawer")?.addEventListener("click", () => {
      state.drawerOpen = false;
      render();
    });

    shadow.getElementById("ts-open-manager")?.addEventListener("click", () => {
      state.drawerOpen = false;
      state.managerOpen = true;
      render();
    });

    const drawerSearch = shadow.getElementById("ts-drawer-search");
    drawerSearch?.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      const list = shadow.getElementById("ts-drawer-list");
      if (list) {
        list.innerHTML = renderDrawerRows(state.texts, 0) || `<div class="ts-empty">No matching snippets.</div>`;
        bindDrawerRowEvents();
      }
    });

    bindDrawerRowEvents();

    if (!state.managerOpen) return;

    shadow.getElementById("ts-close-manager")?.addEventListener("click", () => {
      state.managerOpen = false;
      render();
    });

    shadow.querySelectorAll(".ts-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.managerTab = btn.dataset.tab;
        render();
      });
    });

    if (state.managerTab === "manage") {
      shadow.getElementById("ts-add-text")?.addEventListener("click", () => createItem("text"));
      shadow.getElementById("ts-add-folder")?.addEventListener("click", () => createItem("folder"));
      shadow.getElementById("ts-empty-add-text")?.addEventListener("click", () => createItem("text"));
      shadow.getElementById("ts-empty-add-folder")?.addEventListener("click", () => createItem("folder"));
      shadow.getElementById("ts-add-in-folder")?.addEventListener("click", () => createItem("text"));

      shadow.getElementById("ts-mgr-search")?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        const list = shadow.getElementById("ts-mgr-tree-list");
        if (list) {
          list.innerHTML =
            (renderManagerTreeRows(state.texts, 0) || `<div class="ts-empty">No matching snippets.</div>`) +
            `<div id="ts-root-drop" class="ts-root-drop" style="display:none;">Drop here to move to Root</div>`;
          bindManagerTreeEvents();
        }
      });

      bindManagerTreeEvents();

      if (state.draft) {
        const markDirty = () => {
          if (!state.dirty) {
            state.dirty = true;
            const pill = shadow.querySelector(".ts-pill");
            if (pill) {
              pill.className = "ts-pill warn";
              pill.textContent = "● Unsaved";
            }
          }
        };

        shadow.getElementById("ts-ed-name")?.addEventListener("input", (e) => {
          state.draft.name = e.target.value;
          markDirty();
        });
        shadow.getElementById("ts-ed-parent")?.addEventListener("change", (e) => {
          state.draft.parent = Number(e.target.value) || 0;
          markDirty();
        });
        shadow.getElementById("ts-fmt-plain")?.addEventListener("click", () => {
          if (!state.draft.html) return;
          const rte = shadow.getElementById("ts-rte-surface");
          if (rte) state.draft.text = rte.innerText;
          state.draft.html = false;
          state.htmlSourceMode = false;
          markDirty();
          render();
        });
        shadow.getElementById("ts-fmt-rich")?.addEventListener("click", () => {
          if (state.draft.html) return;
          state.draft.text = (state.draft.text || "").replace(/\r\n|\r|\n/g, "<br>");
          state.draft.html = true;
          markDirty();
          render();
        });
        shadow.getElementById("ts-ed-plain")?.addEventListener("input", (e) => {
          state.draft.text = e.target.value;
          markDirty();
        });
        shadow.getElementById("ts-ed-src")?.addEventListener("input", (e) => {
          state.draft.text = e.target.value;
          markDirty();
        });

        const rte = shadow.getElementById("ts-rte-surface");
        if (rte) {
          rte.innerHTML = state.draft.text || "";
          rte.addEventListener("input", () => {
            state.draft.text = rte.innerHTML;
            markDirty();
          });
          shadow.querySelectorAll(".ts-rte-btn[data-cmd]").forEach((btn) => {
            btn.addEventListener("mousedown", (e) => {
              e.preventDefault();
              document.execCommand(btn.dataset.cmd, false, null);
              state.draft.text = rte.innerHTML;
              markDirty();
            });
          });
          shadow.getElementById("ts-rte-link")?.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const url = prompt("Enter URL:", "https://");
            if (url) {
              document.execCommand("createLink", false, url);
              state.draft.text = rte.innerHTML;
              markDirty();
            }
          });
        }

        shadow.getElementById("ts-rte-src")?.addEventListener("click", () => {
          if (!state.htmlSourceMode && rte) state.draft.text = rte.innerHTML;
          state.htmlSourceMode = !state.htmlSourceMode;
          render();
        });

        shadow.getElementById("ts-save-btn")?.addEventListener("click", saveDraft);
        shadow.getElementById("ts-copy-btn")?.addEventListener("click", () => {
          GM_setClipboard(state.draft.text || "");
          showToast("Copied to clipboard!");
        });
        shadow.getElementById("ts-dup-btn")?.addEventListener("click", () => {
          const ctx = findNodeContext(state.texts, state.draft.id);
          if (!ctx) return;
          const copy = {
            id: nextId(),
            type: "text",
            level: ctx.node.level,
            parent: ctx.node.parent,
            name: `${state.draft.name} (Copy)`,
            text: state.draft.text,
            html: Boolean(state.draft.html),
          };
          ctx.list.splice(ctx.index + 1, 0, copy);
          saveTexts(state.texts);
          state.selectedId = copy.id;
          syncDraft();
          render();
          showToast("Duplicated!");
        });
        shadow.getElementById("ts-del-btn")?.addEventListener("click", () => {
          const ctx = findNodeContext(state.texts, state.draft.id);
          if (!ctx) return;
          if (!confirm(`Delete "${ctx.node.name}"?`)) return;
          ctx.list.splice(ctx.index, 1);
          saveTexts(state.texts);
          state.selectedId = null;
          state.draft = null;
          state.dirty = false;
          render();
          showToast("Deleted");
        });
      }
    } else if (state.managerTab === "import") {
      shadow.getElementById("ts-imp-file")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = (ev) => {
          const ta = shadow.getElementById("ts-imp-json");
          if (ta) ta.value = ev.target.result || "";
        };
        r.readAsText(file);
      });
      shadow.getElementById("ts-imp-run")?.addEventListener("click", () => {
        const raw = (shadow.getElementById("ts-imp-json")?.value || "").trim();
        const mode = shadow.getElementById("ts-imp-mode")?.value || "Append";
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          showToast("Invalid JSON", "error");
          return;
        }
        if (!validateImportData(parsed)) {
          showToast("Invalid snippet JSON structure", "error");
          return;
        }
        if (mode === "Overwrite") {
          let c = 0;
          assignNewIds(parsed, () => ++c, 0, 0);
          GM_setValue(STORAGE_KEY_ID, c);
          state.texts = parsed;
          state.selectedId = null;
          state.draft = null;
        } else {
          assignNewIds(parsed, nextId, 0, 0);
          state.texts = state.texts.concat(parsed);
        }
        saveTexts(state.texts);
        state.managerTab = "manage";
        render();
        showToast("Imported successfully!");
      });
    } else if (state.managerTab === "export") {
      shadow.getElementById("ts-exp-copy")?.addEventListener("click", () => {
        GM_setClipboard(JSON.stringify(state.texts, null, 2));
        showToast("JSON copied!");
      });
      shadow.getElementById("ts-exp-dl")?.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state.texts, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `text-snippets-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      });
    } else if (state.managerTab === "settings") {
      shadow.getElementById("ts-set-rich")?.addEventListener("change", (e) => {
        state.settings.defaultRichText = e.target.value === "true";
        saveSettings(state.settings);
        showToast("Settings saved");
      });
    }
  }

  function bindDrawerRowEvents() {
    shadow.querySelectorAll(".ts-drawer-row").forEach((row) => {
      row.addEventListener("mousedown", (e) => e.preventDefault());
      row.addEventListener("click", (e) => {
        const id = Number(row.dataset.id);
        const ctx = findNodeContext(state.texts, id);
        if (!ctx) return;

        if (e.target.closest("[data-copy]")) {
          e.stopPropagation();
          GM_setClipboard(ctx.node.text || "");
          showToast("Copied!");
          return;
        }

        if (ctx.node.type === "folder") {
          if (state.collapsedFolders.has(id)) state.collapsedFolders.delete(id);
          else state.collapsedFolders.add(id);
          const list = shadow.getElementById("ts-drawer-list");
          if (list) {
            list.innerHTML = renderDrawerRows(state.texts, 0);
            bindDrawerRowEvents();
          }
          return;
        }

        const res = insertTextIntoPage(ctx.node.text || "", Boolean(ctx.node.html === true || ctx.node.html === "true"));
        if (res.ok) {
          showToast(`Inserted "${ctx.node.name}"`);
        } else {
          showToast(res.reason, "error");
        }
      });
    });
  }

  function bindManagerTreeEvents() {
    const clearDrops = () => {
      shadow.querySelectorAll(".drop-before, .drop-after, .drop-inside").forEach((el) => {
        el.classList.remove("drop-before", "drop-after", "drop-inside");
      });
      const r = shadow.getElementById("ts-root-drop");
      if (r) r.classList.remove("active");
    };

    shadow.querySelectorAll(".ts-tree-row").forEach((row) => {
      const id = Number(row.dataset.id);
      const type = row.dataset.type;

      row.addEventListener("click", (e) => {
        if (e.target.closest(".ts-folder-toggle")) {
          e.stopPropagation();
          if (state.collapsedFolders.has(id)) state.collapsedFolders.delete(id);
          else state.collapsedFolders.add(id);
          render();
          return;
        }
        if (state.dirty && state.selectedId !== id && !confirm("Discard unsaved changes?")) return;
        state.selectedId = id;
        state.htmlSourceMode = false;
        syncDraft();
        render();
      });

      row.addEventListener("dragstart", (e) => {
        state.dragSourceId = id;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(id));
        const r = shadow.getElementById("ts-root-drop");
        if (r) r.style.display = "block";
      });

      row.addEventListener("dragend", () => {
        state.dragSourceId = null;
        state.dropTargetId = null;
        state.dropPosition = null;
        row.classList.remove("dragging");
        clearDrops();
        const r = shadow.getElementById("ts-root-drop");
        if (r) r.style.display = "none";
      });

      row.addEventListener("dragover", (e) => {
        if (state.dragSourceId == null || state.dragSourceId === id) return;
        const srcCtx = findNodeContext(state.texts, state.dragSourceId);
        if (srcCtx && srcCtx.node.type === "folder" && isDescendant(srcCtx.node, id)) return;

        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        const pos = type === "folder" ? (ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside") : ratio < 0.5 ? "before" : "after";

        if (state.dropTargetId !== id || state.dropPosition !== pos) {
          clearDrops();
          state.dropTargetId = id;
          state.dropPosition = pos;
          row.classList.add(`drop-${pos}`);
        }
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const srcId = state.dragSourceId;
        const pos = state.dropPosition;
        clearDrops();
        if (srcId == null || srcId === id || !pos) return;
        if (moveNode(state.texts, srcId, id, pos)) {
          if (pos === "inside") state.collapsedFolders.delete(id);
          saveTexts(state.texts);
          syncDraft();
          render();
          showToast("Order updated");
        }
      });
    });

    const rootDrop = shadow.getElementById("ts-root-drop");
    if (rootDrop) {
      rootDrop.addEventListener("dragover", (e) => {
        if (state.dragSourceId == null) return;
        e.preventDefault();
        rootDrop.classList.add("active");
      });
      rootDrop.addEventListener("dragleave", () => rootDrop.classList.remove("active"));
      rootDrop.addEventListener("drop", (e) => {
        e.preventDefault();
        const srcId = state.dragSourceId;
        clearDrops();
        if (srcId != null && moveNode(state.texts, srcId, null, "root")) {
          saveTexts(state.texts);
          syncDraft();
          render();
          showToast("Moved to Root");
        }
      });
    }
  }

  // --- Shortcuts & Live Cross-Tab Sync ---
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      state.drawerOpen = !state.drawerOpen;
      render();
      if (state.drawerOpen) {
        requestAnimationFrame(() => shadow?.getElementById("ts-drawer-search")?.focus());
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && state.managerOpen && state.draft) {
      e.preventDefault();
      saveDraft();
    } else if (e.key === "Escape") {
      if (state.managerOpen) {
        state.managerOpen = false;
        render();
      } else if (state.drawerOpen) {
        state.drawerOpen = false;
        render();
      }
    }
  });

  GM_addValueChangeListener(STORAGE_KEY_TEXTS, (_name, _oldVal, newVal) => {
    state.texts = Array.isArray(newVal) ? newVal : [];
    if (!state.dirty) syncDraft();
    if (state.drawerOpen || state.managerOpen) render();
  });

  GM_registerMenuCommand("Open Snippets Picker (Alt+S)", () => {
    state.drawerOpen = true;
    render();
  });

  GM_registerMenuCommand("Open Snippets Manager", () => {
    state.managerOpen = true;
    render();
  });

  const STYLES = `
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .ts-fab {
      position: fixed; right: 18px; bottom: 18px; width: 44px; height: 44px;
      border-radius: 50%; border: 1px solid #cbd5e1; background: #ffffff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18); cursor: pointer;
      font-size: 20px; display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s;
    }
    .ts-fab:hover { transform: scale(1.07); }
    .ts-drawer {
      position: fixed; right: 18px; bottom: 72px; width: 310px; max-height: 460px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22); display: flex; flex-direction: column;
      overflow: hidden; font-size: 13px; color: #0f172a;
    }
    .ts-drawer-header {
      padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .ts-drawer-search { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .ts-drawer-list { overflow-y: auto; padding: 6px; flex: 1; }
    .ts-drawer-row {
      display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px;
      cursor: pointer; user-select: none;
    }
    .ts-drawer-row:hover { background: #eff6ff; color: #2563eb; }
    .ts-row-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ts-badge { font-size: 10px; padding: 1px 5px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-weight: 600; }
    .ts-count { font-size: 11px; color: #64748b; }
    .ts-mini-btn {
      opacity: 0; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px;
      font-size: 11px; padding: 1px 6px; cursor: pointer;
    }
    .ts-drawer-row:hover .ts-mini-btn { opacity: 1; }
    .ts-empty { text-align: center; padding: 24px 12px; color: #64748b; }

    .ts-modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .ts-modal {
      width: 920px; max-width: 96vw; height: 620px; max-height: 92vh;
      background: #fff; border-radius: 12px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
      display: flex; flex-direction: column; overflow: hidden; color: #0f172a; font-size: 13.5px;
    }
    .ts-modal-header {
      padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .ts-tabs { display: flex; gap: 4px; }
    .ts-tab {
      border: none; background: transparent; padding: 6px 11px; border-radius: 6px;
      cursor: pointer; font-size: 13px; color: #64748b; font-weight: 500;
    }
    .ts-tab.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
    .ts-modal-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .ts-mgr-split { display: flex; flex: 1; overflow: hidden; }
    .ts-mgr-tree { width: 290px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    .ts-mgr-tree-bar { padding: 10px; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; }
    .ts-mgr-tree-list { flex: 1; overflow-y: auto; padding: 6px; }
    .ts-tree-row {
      position: relative; display: flex; align-items: center; gap: 5px; padding: 6px 8px;
      border-radius: 6px; cursor: pointer; border: 2px solid transparent; user-select: none;
    }
    .ts-tree-row:hover { background: #f8fafc; }
    .ts-tree-row.selected { background: #eff6ff; color: #2563eb; font-weight: 600; }
    .ts-tree-row.dragging { opacity: 0.45; }
    .ts-tree-row.drop-before::before {
      content: ""; position: absolute; left: 6px; right: 6px; top: -3px; height: 2px; background: #2563eb;
    }
    .ts-tree-row.drop-after::after {
      content: ""; position: absolute; left: 6px; right: 6px; bottom: -3px; height: 2px; background: #2563eb;
    }
    .ts-tree-row.drop-inside { border-color: #2563eb; background: #eff6ff; }
    .ts-drag-handle { color: #cbd5e1; cursor: grab; font-size: 12px; }
    .ts-folder-toggle { border: none; background: transparent; cursor: pointer; padding: 0; width: 16px; color: #64748b; }
    .ts-root-drop {
      margin-top: 8px; padding: 8px; border: 1.5px dashed #cbd5e1; border-radius: 6px;
      text-align: center; font-size: 12px; color: #64748b;
    }
    .ts-root-drop.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; font-weight: 600; }

    .ts-mgr-editor { flex: 1; padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; }
    .ts-editor-empty { margin: auto; text-align: center; max-width: 360px; }
    .ts-editor-card { display: flex; flex-direction: column; flex: 1; gap: 12px; }
    .ts-editor-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .ts-editor-fields { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .ts-editor-footer { display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e2e8f0; }
    .ts-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ts-field { display: flex; flex-direction: column; gap: 4px; }
    .ts-field label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .ts-input, .ts-select, .ts-textarea {
      width: 100%; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
      font-size: 13.5px; color: #0f172a; background: #fff; outline: none;
    }
    .ts-textarea { flex: 1; min-height: 170px; resize: vertical; }
    .ts-seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; max-width: 260px; }
    .ts-seg button { flex: 1; border: none; background: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 12.5px; }
    .ts-seg button.active { background: #2563eb; color: #fff; font-weight: 600; }
    .ts-rte { flex: 1; display: flex; flex-direction: column; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    .ts-rte-bar { display: flex; flex-wrap: wrap; gap: 3px; padding: 6px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .ts-rte-btn { border: 1px solid transparent; background: transparent; padding: 3px 7px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .ts-rte-btn:hover { background: #e2e8f0; }
    .ts-rte-btn.active { background: #eff6ff; color: #2563eb; }
    .ts-rte-surface { flex: 1; padding: 10px 12px; outline: none; overflow-y: auto; min-height: 150px; }
    .ts-pad { padding: 20px 24px; overflow-y: auto; }
    .ts-btn {
      padding: 7px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff;
      color: #0f172a; font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .ts-btn:hover { background: #f1f5f9; }
    .ts-btn-sm { padding: 5px 9px; font-size: 12px; }
    .ts-btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    .ts-btn-primary:hover { background: #1d4ed8; }
    .ts-btn-danger { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
    .ts-pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .ts-pill.ok { background: #f0fdf4; color: #16a34a; }
    .ts-pill.warn { background: #fffbeb; color: #d97706; }
    .ts-toast {
      position: fixed; bottom: 72px; left: 50%; transform: translateX(-50%);
      padding: 8px 16px; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 500;
      box-shadow: 0 6px 18px rgba(0,0,0,0.2); z-index: 2147483647;
    }
    .ts-toast.success { background: #16a34a; }
    .ts-toast.error { background: #dc2626; }
  `;

  ensureUI();
  render();
})();
