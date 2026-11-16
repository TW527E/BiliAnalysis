// UI only. Parsing, providers, settings and clipboard feedback belong to BiliAnalysis.
function installVRInterface({ parse, getModes, getPosition }) {
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
    const css = `
        .ba-vr-action { --vr-bg:#202124; --vr-ink:#faf9fb; --vr-hover:#343438;
            box-sizing:border-box !important; display:inline-flex !important; align-items:center !important;
            justify-content:center !important; gap:9px !important; border:1px solid #59575e !important;
            border-radius:999px !important; background:var(--vr-bg) !important; color:var(--vr-ink) !important;
            font-family:inherit !important; font-weight:600 !important; line-height:1.2 !important;
            cursor:pointer !important; text-align:left !important; white-space:nowrap !important;
            box-shadow:none !important; opacity:1 !important; visibility:visible !important;
            transition:background .15s ease !important; transform:none !important;
        }
        .ba-vr-action:hover { background:var(--vr-hover) !important; box-shadow:none !important; }
        .ba-vr-action:focus-visible { outline:3px solid #d69bb2 !important; outline-offset:3px !important; }
        .ba-vr-action svg { width:20px !important; height:20px !important; flex:none !important; }
        .ba-vr-action small { display:block; font-size:12px; font-weight:400; margin-top:4px; color:#dedbe0; }
        .fixed-analysis-btn.ba-vr-action { width:156px !important; height:64px !important;
            padding:10px 16px !important; font-size:17px !important; z-index:999 !important; }
        .ba-vr-video .fixed-analysis-btn { display:none !important; }
        .ba-vr-dock { position:fixed; right:8px; top:50%; transform:translateY(-50%);
            display:flex; align-items:center; gap:8px; padding:8px; z-index:999; }
        .ba-vr-dock-actions { display:flex; flex-direction:row-reverse; align-items:center; gap:6px; }
        .ba-vr-dock .fixed-analysis-btn.ba-vr-action { display:inline-flex !important;
            position:static !important; inset:auto !important; width:auto !important; min-width:140px !important;
            height:48px !important; padding:10px 16px !important; font-size:15px !important; }
        .ba-vr-dock-actions[data-many] .fixed-analysis-btn[data-mode="local"] {
            min-width:44px !important; width:44px !important; height:44px !important; padding:0 !important; }
        .ba-vr-dock-actions[data-many] [data-mode="local"] span { display:none; }
        .ba-vr-dock[data-open="false"] .fixed-analysis-btn:not(.ba-vr-dock-primary) { display:none !important; }
        .ba-vr-dock[data-open="false"] .ba-vr-dock-primary {
            min-width:44px !important; width:44px !important; height:44px !important; padding:0 !important; opacity:.55 !important; }
        .ba-vr-dock[data-open="false"] .ba-vr-dock-primary span { display:none; }
        .ba-vr-card-actions { position:absolute; left:8px; bottom:32px; z-index:5;
            display:flex; flex-direction:column; gap:6px; max-width:calc(100% - 16px);
            opacity:0; pointer-events:none; }
        a:hover .ba-vr-card-actions,
        .ba-vr-card-actions:has(:focus-visible) { opacity:1; pointer-events:auto; }
        .ba-vr-card-actions .ba-vr-action { min-height:44px; padding:10px 14px; font-size:14px; }
        .ba-vr-card-actions[data-many] { flex-direction:row; right:52px; }
        .ba-vr-card-actions[data-many] .ba-vr-action { flex:1; min-width:0; padding:8px; font-size:13px; gap:6px !important; }
        .ba-vr-card-actions[data-many] span { overflow:hidden; text-overflow:ellipsis; }
        .ba-vr-card-actions[data-many] [data-mode="local"] { flex:0 0 44px; width:44px; }
        .ba-vr-card-actions[data-many] [data-mode="local"] span { display:none; }
        @media(prefers-reduced-motion:reduce) { .ba-vr-action { transition:none !important; } }
        @media(max-width:600px) {
            .fixed-analysis-btn.ba-vr-action { width:140px !important; height:60px !important; font-size:16px !important; }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    const normalizedStyle = document.createElement('div').style;
    const isVideo = location.pathname.startsWith('/video/') || new URL(location.href).searchParams.has('bvid');
    let dock, dockActions, dockPrimary, closeTimer;

    function decorateVideoDock() {
        document.body.classList.add('ba-vr-video');
        const byMode = new Map();
        document.querySelectorAll('.fixed-analysis-btn').forEach(button => {
            if (!byMode.has(button.dataset.mode) || button.parentElement === dockActions) byMode.set(button.dataset.mode, button);
        });
        const priority = { 'cloud-ya':0, local:2 };
        const buttons = [...byMode.values()].sort((a, b) => (priority[a.dataset.mode] ?? 1) - (priority[b.dataset.mode] ?? 1));
        if (!buttons.length) {
            clearTimeout(closeTimer);
            dock?.remove();
            dock = null;
            return;
        }
        if (!dock) {
            dock = document.createElement('div');
            dock.className = 'ba-vr-dock';
            dock.dataset.open = 'false';
            dockActions = document.createElement('div');
            dockActions.id = 'ba-vr-dock-actions';
            dockActions.className = 'ba-vr-dock-actions';
            dockActions.setAttribute('role', 'group');
            dockActions.setAttribute('aria-label', '解析連結');
            const show = () => {
                clearTimeout(closeTimer);
                dock.dataset.open = 'true';
                dockPrimary.setAttribute('aria-expanded', 'true');
            };
            const hide = () => {
                dock.dataset.open = 'false';
                dockPrimary.setAttribute('aria-expanded', 'false');
            };
            const closeLater = () => {
                clearTimeout(closeTimer);
                closeTimer = setTimeout(() => {
                    if (!dock.matches(':hover') && !dock.querySelector(':focus-visible')) hide();
                }, 500);
            };
            dock.addEventListener('pointerenter', show);
            dock.addEventListener('pointerleave', closeLater);
            dock.addEventListener('focusin', show);
            dock.addEventListener('focusout', closeLater);
            dock.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    dockPrimary.focus();
                    hide();
                }
            });
            dock.append(dockActions);
            document.body.append(dock);
        }
        buttons.forEach(button => {
            if (button.classList.contains('ba-vr-action')) return;
            const label = button.textContent.trim();
            button.classList.add('ba-vr-action');
            button.innerHTML = icon + '<span>解析連結<small></small></span>';
            button.querySelector('small').textContent = label;
            button.title = `解析連結 · ${label}`;
            button.setAttribute('aria-label', button.title);
        });
        dockPrimary = buttons[0];
        buttons.forEach(button => {
            button.classList.toggle('ba-vr-dock-primary', button === dockPrimary);
            if (button === dockPrimary) button.setAttribute('aria-expanded', dock.dataset.open);
            else button.removeAttribute('aria-expanded');
        });
        dockActions.toggleAttribute('data-many', buttons.length > 1);
        if (buttons.length !== dockActions.children.length || buttons.some((button, index) => dockActions.children[index] !== button)) {
            dockActions.replaceChildren(...buttons);
        }
    }

    /** While the settings panel is open, the sliders are the preview; the saved values are only read once it closes. */
    function currentPosition() {
        const saved = getPosition();
        if (!document.getElementById('biliAnalysisSettingsPanel')?.classList.contains('show')) return saved;
        const live = axis => {
            const value = parseInt(document.getElementById(`slider${axis}Value`)?.value, 10);
            return Number.isNaN(value) ? null : Math.max(0, Math.min(100, value));
        };
        return { ...saved, customX: live('X') ?? saved.customX, customY: live('Y') ?? saved.customY };
    }

    function decorateFixed() {
        if (isVideo) return decorateVideoDock();
        document.querySelectorAll('.fixed-analysis-btn').forEach(button => {
            if (!button.classList.contains('ba-vr-action')) {
                const label = button.textContent.trim();
                button.classList.add('ba-vr-action');
                button.innerHTML = icon + '<span>解析連結<small></small></span>';
                button.querySelector('small').textContent = label;
                button.setAttribute('aria-label', `解析連結 · ${label}`);
                button.title = `以${label}複製目前影片的連結`;
            }
            const index = Number(button.dataset.stackIndex) || 0;
            const position = button.dataset.positionType;
            const offset = index * 72;
            const set = (key, value) => {
                normalizedStyle[key] = value;
                if (button.style[key] !== normalizedStyle[key]) button.style[key] = normalizedStyle[key];
            };
            if (position === 'custom') {
                const { customX, customY } = currentPosition();
                set('left', `calc(${customX} / 100 * (100vw - 156px))`);
                set('top', `min(calc(${customY} / 100 * (100vh - ${64 + offset}px) + ${offset}px), calc(100vh - 64px))`);
            } else if (/^(top|bottom)-(left|right)$/.test(position)) {
                const [vertical, horizontal] = position.split('-');
                set(horizontal, '16px');
                set(vertical, `${(vertical === 'top' ? 150 : 20) + offset}px`);
            }
        });
    }

    function videoUrl(anchor) {
        try {
            const url = new URL(anchor.href, location.href);
            if (url.hostname !== 'www.bilibili.com' || !/^\/video\/(BV[a-zA-Z0-9]+|av\d+)\/?$/.test(url.pathname)) return null;
            const p = url.searchParams.get('p');
            url.search = '';
            url.hash = '';
            if (p && /^[1-9]\d*$/.test(p)) url.searchParams.set('p', p);
            url.protocol = 'https:';
            return url.href;
        } catch { return null; }
    }

    let activeRoot;
    let rootObserver;
    const cardStates = new WeakMap();
    function scanCards() {
        if (!activeRoot) return;
        const modes = getModes().sort((a, b) => Number(a.id === 'local') - Number(b.id === 'local'));
        const hasLocal = modes.some(mode => mode.id === 'local');
        const signature = modes.map(mode => `${mode.id}:${mode.coverLabel}`).join('|');
        // shortcut: current BewlyCat cover selectors; update here if its cover component is renamed.
        activeRoot.querySelectorAll('.bew-cover-action-host, .group\\/cover').forEach(cover => {
            const anchor = cover.closest('a[href]');
            const url = anchor && videoUrl(anchor);
            const old = cardStates.get(cover);
            if (old?.url === url && old?.signature === signature && old.node.isConnected) return;
            old?.node.remove();
            if (!url || !modes.length) return;
            const actions = document.createElement('div');
            actions.className = 'ba-vr-card-actions';
            if (modes.length > 1) actions.dataset.many = '';
            actions.setAttribute('role', 'group');
            actions.setAttribute('aria-label', '影片連結');
            modes.forEach(mode => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ba-vr-action';
                button.dataset.mode = mode.id;
                button.innerHTML = icon + '<span></span>';
                button.querySelector('span').textContent = modes.length === 1 || (hasLocal && mode.id !== 'local') ? '解析連結' : mode.coverLabel;
                button.title = `解析連結 · ${mode.coverLabel}`;
                button.setAttribute('aria-label', button.title);
                // Vue's outer card is a link. Keep both click and keyboard activation on this button.
                button.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const current = videoUrl(anchor);
                    if (current) parse(current, mode.id);
                });
                for (const type of ['pointerdown', 'mousedown', 'dblclick', 'keydown', 'keyup']) {
                    button.addEventListener(type, event => event.stopPropagation());
                }
                actions.append(button);
            });
            cover.append(actions);
            cardStates.set(cover, { url, signature, node: actions });
        });
    }

    function refresh() {
        decorateFixed();
        const root = document.getElementById('bewly')?.shadowRoot;
        if (root !== activeRoot) {
            rootObserver?.disconnect();
            activeRoot = root;
            if (root) {
                const shadowStyle = document.createElement('style');
                shadowStyle.textContent = css;
                root.append(shadowStyle);
                rootObserver = new MutationObserver(queue);
                rootObserver.observe(root, { childList:true, subtree:true, attributes:true, attributeFilter:['href'] });
            }
        }
        scanCards();
    }
    let queued = false;
    function queue() {
        if (queued) return;
        queued = true;
        setTimeout(() => { queued = false; refresh(); }, 100);
    }
    const observer = new MutationObserver(queue);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['style'] });
    // attachShadow on an existing host doesn't emit a light-DOM mutation; settings may change in another tab.
    setInterval(queue, 1500);
    refresh();
}
