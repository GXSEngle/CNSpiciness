/* ==========================================================================
 * 中国辣力地图 —— 工具层 (js/tools.js)
 * --------------------------------------------------------------------------
 * 职责：
 *   1. 「数据总览」浮层：用表格展示全部 34 个省级行政区 + 每道名菜的详细数据，
 *      支持就地修改（简称 / 综合辣度 / 菜名 / 菜品辣度 / 描述）、增删菜品。
 *   2. 导出：CSV（Excel 可编辑）、复制 CSV、导出可直接替换的 js/data.js。
 *   3. 「意见反馈」浮层：把建议或异议发送到 engggggle@gmail.com。
 *
 * 依赖：window.SPICY_DATA / SPICY_LEVELS（js/data.js）
 *       window.SpicyMap.levelOf / colorAt / reloadData（js/map.js）
 *       window.SpicyPanel.close（js/panel.js）
 * ========================================================================== */

(function () {
  'use strict';

  /* 反馈邮箱：如需更换，改这一处即可（页脚的链接在 index.html 中） */
  var FEEDBACK_EMAIL = 'engggggle@gmail.com';

  /* 缓存的 DOM 引用 */
  var el = {};

  /* ============================ 通用工具 ============================ */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function fmt1(v) {
    var n = Number(v);
    return isFinite(n) ? n.toFixed(1) : '0.0';
  }

  // 辣度 → 等级（优先复用 map.js 的实现，保证全站口径一致）
  function levelOf(spicy) {
    if (window.SpicyMap && typeof window.SpicyMap.levelOf === 'function') {
      return window.SpicyMap.levelOf(spicy);
    }
    var list = window.SPICY_LEVELS || [];
    var v = Math.max(0, Math.min(10, Number(spicy) || 0));
    for (var i = 0; i < list.length; i++) {
      if (v >= list[i].min && v <= list[i].max) return list[i];
      var last = i === list.length - 1;
      if (v > list[i].max && (last || v < list[i + 1].min)) return list[i];
    }
    return { label: '不辣', color: '#f7f7f7' };
  }

  // 把输入框内容转成 0-10 的辣度数字
  function toSpicy(raw) {
    var n = parseFloat(raw);
    if (!isFinite(n)) return 0;
    return Math.round(Math.max(0, Math.min(10, n)) * 10) / 10;
  }

  // 辣椒图标（与 panel.js 完全一致：按等级分档，最多 5 个）
  function chiliHtml(spicy) {
    var list = window.SPICY_LEVELS || [];
    var target = levelOf(spicy);
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].label === target.label) { idx = i; break; }
    }
    idx = Math.max(0, Math.min(5, idx));
    if (idx === 0) return '<span class="cell-chili-none">不辣</span>';
    var s = '';
    for (var k = 0; k < idx; k++) s += '🌶️';
    return s;
  }

  // 复制到剪贴板（带 execCommand 兜底，兼容 file:// 等非安全上下文）
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('浏览器拒绝了复制操作'));
      } catch (err) {
        reject(err);
      }
    });
  }

  // 触发浏览器下载
  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ============================ 数据模型 ============================ */

  var original = null;   // js/data.js 里的原始数据（用于「重置」）
  var working = null;    // 表格里正在编辑的副本
  var applied = false;   // 是否已经「应用到地图」
  var tbody = null, metaEl = null, hintEl = null, applyBtn = null;

  function initModel() {
    if (working) return;
    var src = Array.isArray(window.SPICY_DATA) ? window.SPICY_DATA : [];
    original = clone(src);
    working = clone(src);
  }

  function isDirty() {
    return !!working && JSON.stringify(working) !== JSON.stringify(original);
  }

  function totals() {
    var provinces = working ? working.length : 0;
    var dishes = 0;
    if (working) {
      working.forEach(function (p) { dishes += (p.dishes || []).length; });
    }
    return { provinces: provinces, dishes: dishes };
  }

  /* ============================ 表格渲染 ============================ */

  var keyword = '';

  function dishHit(d, kw) {
    return String(d.name || '').toLowerCase().indexOf(kw) >= 0 ||
           String(d.desc || '').toLowerCase().indexOf(kw) >= 0;
  }

  function renderTable() {
    if (!tbody || !working) return;
    var kw = keyword.trim().toLowerCase();
    var html = [];
    var shownProv = 0, shownDish = 0;

    working.forEach(function (p, pi) {
      var provinceHit = !kw ||
        String(p.name).toLowerCase().indexOf(kw) >= 0 ||
        String(p.shortName || '').toLowerCase().indexOf(kw) >= 0;

      // 命中省份 → 展示该省全部菜品；只命中菜品 → 只展示命中的那几道
      var idx = [];
      (p.dishes || []).forEach(function (d, di) {
        if (!kw || provinceHit || dishHit(d, kw)) idx.push(di);
      });
      if (kw && !provinceHit && !idx.length) return;
      if (!idx.length) idx = [-1];   // 没有菜品时也占一行，方便「＋菜品」

      shownProv++;
      idx.forEach(function (i) { if (i >= 0) shownDish++; });

      var lv = levelOf(p.spicyLevel);
      var rowspan = idx.length;

      idx.forEach(function (di, k) {
        var d = di >= 0 ? (p.dishes || [])[di] : null;
        var cells = [];

        // 前 5 列（省份信息）只在每组第一行输出，用 rowspan 纵向合并
        if (k === 0) {
          cells.push(
            '<td class="col-province" rowspan="' + rowspan + '">' +
              '<span class="pt-dot" style="background:' + lv.color + '"></span>' +
              '<span class="pt-name">' + escapeHtml(p.shortName || p.name) + '</span>' +
              '<span class="pt-count">' + (p.dishes || []).length + ' 道</span>' +
            '</td>'
          );
          cells.push(
            '<td class="col-name" rowspan="' + rowspan + '"><code>' + escapeHtml(p.name) + '</code></td>'
          );
          cells.push(
            '<td class="col-short" rowspan="' + rowspan + '">' +
              '<input class="cell-input" type="text" value="' + escapeHtml(p.shortName || '') + '" ' +
                'data-p="' + pi + '" data-field="shortName" aria-label="' + escapeHtml(p.name) + ' 简称" />' +
            '</td>'
          );
          cells.push(
            '<td class="col-level" rowspan="' + rowspan + '">' +
              '<input class="cell-input cell-input--num" type="number" min="0" max="10" step="0.1" ' +
                'value="' + fmt1(p.spicyLevel) + '" data-p="' + pi + '" data-field="spicyLevel" ' +
                'aria-label="' + escapeHtml(p.name) + ' 综合辣度" />' +
            '</td>'
          );
          cells.push(
            '<td class="col-grade" rowspan="' + rowspan + '">' +
              '<span class="grade-chip" data-grade="' + pi + '" style="background:' + lv.color +
                ';color:' + (Number(p.spicyLevel) >= 5 ? '#ffffff' : '#4b5565') + '">' +
                escapeHtml(lv.label) + '</span>' +
            '</td>'
          );
        }

        if (d) {
          cells.push(
            '<td class="col-dish">' +
              '<input class="cell-input" type="text" value="' + escapeHtml(d.name) + '" ' +
                'data-p="' + pi + '" data-d="' + di + '" data-field="name" aria-label="菜品名" />' +
            '</td>'
          );
          cells.push(
            '<td class="col-spicy">' +
              '<input class="cell-input cell-input--num" type="number" min="0" max="10" step="0.1" ' +
                'value="' + fmt1(d.spicy) + '" data-p="' + pi + '" data-d="' + di + '" data-field="spicy" ' +
                'aria-label="' + escapeHtml(d.name) + ' 辣度" />' +
            '</td>'
          );
          cells.push(
            '<td class="col-chili"><span class="cell-chili" data-chili="' + pi + '-' + di + '">' +
              chiliHtml(d.spicy) + '</span></td>'
          );
          cells.push(
            '<td class="col-desc">' +
              '<input class="cell-input cell-input--wide" type="text" value="' + escapeHtml(d.desc || '') + '" ' +
                'data-p="' + pi + '" data-d="' + di + '" data-field="desc" aria-label="描述" />' +
            '</td>'
          );
          cells.push(
            '<td class="col-op">' +
              (k === 0
                ? '<button type="button" class="mini-btn" data-act="add" data-p="' + pi + '" title="为该省新增一道菜">＋菜品</button>'
                : '') +
              '<button type="button" class="mini-btn mini-btn--danger" data-act="del" data-p="' + pi +
                '" data-d="' + di + '" title="删除这道菜">删除</button>' +
            '</td>'
          );
        } else {
          cells.push('<td class="col-dish cell-empty" colspan="4">该省暂无菜品，点右侧「＋菜品」新增</td>');
          cells.push(
            '<td class="col-op">' +
              '<button type="button" class="mini-btn" data-act="add" data-p="' + pi + '">＋菜品</button>' +
            '</td>'
          );
        }

        html.push('<tr class="' + (k === 0 ? 'row-group-start' : '') + '">' + cells.join('') + '</tr>');
      });
    });

    if (!html.length) {
      html.push('<tr><td class="cell-empty" colspan="10">没有匹配「' +
        escapeHtml(keyword) + '」的省份或菜品</td></tr>');
    }

    tbody.innerHTML = html.join('');
    renderMeta(shownProv, shownDish);
  }

  function renderMeta(shownProv, shownDish) {
    var t = totals();
    if (kwActive()) {
      metaEl.textContent = '筛选出 ' + shownProv + ' / ' + t.provinces + ' 个省级行政区 · ' +
        shownDish + ' / ' + t.dishes + ' 道名菜';
    } else {
      metaEl.textContent = '共 ' + t.provinces + ' 个省级行政区 · ' + t.dishes + ' 道名菜（辣度全部为 0-10）';
    }
    renderDirtyState();
  }

  function kwActive() {
    return keyword.trim().length > 0;
  }

  function renderDirtyState() {
    var dirty = isDirty();
    if (applyBtn) {
      applyBtn.textContent = applied
        ? (dirty ? '重新应用到地图' : '已应用到地图')
        : (dirty ? '应用到地图 ●' : '应用到地图');
      applyBtn.classList.toggle('btn--dirty', dirty);
    }
    var badge = document.getElementById('dataDirtyBadge');
    if (badge) badge.hidden = !dirty;
  }

  /* --------- 单元格改动后，只刷新该行/该组的派生显示，避免打断输入 --------- */

  function refreshProvinceDerived(pi) {
    var p = working[pi];
    if (!p || !tbody) return;
    var chip = tbody.querySelector('[data-grade="' + pi + '"]');
    if (chip) {
      var lv = levelOf(p.spicyLevel);
      chip.textContent = lv.label;
      chip.style.background = lv.color;
      chip.style.color = Number(p.spicyLevel) >= 5 ? '#ffffff' : '#4b5565';
      var dot = chip.closest('tr').querySelector('.pt-dot');
      if (dot) dot.style.background = lv.color;
    }
  }

  function refreshDishDerived(pi, di) {
    var p = working[pi];
    if (!p || !p.dishes[di] || !tbody) return;
    var span = tbody.querySelector('[data-chili="' + pi + '-' + di + '"]');
    if (span) span.innerHTML = chiliHtml(p.dishes[di].spicy);
  }

  /* ============================ 导出 ============================ */

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv() {
    var head = ['省份(name)', '简称(shortName)', '综合辣度(spicyLevel)', '辣度等级',
      '菜品(name)', '菜品辣度(spicy)', '辣椒', '描述(desc)'];
    var lines = [head.map(csvCell).join(',')];
    working.forEach(function (p) {
      var lv = levelOf(p.spicyLevel);
      var dishes = (p.dishes || []).length ? p.dishes : [null];
      dishes.forEach(function (d) {
        lines.push([
          p.name,
          p.shortName || '',
          fmt1(p.spicyLevel),
          lv.label,
          d ? d.name : '',
          d ? fmt1(d.spicy) : '',
          d ? chiliHtml(d.spicy).replace(/<[^>]+>/g, '') : '',
          d ? (d.desc || '') : ''
        ].map(csvCell).join(','));
      });
    });
    // 带 BOM，Excel 打开中文不乱码
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }

  // 生成一份可以直接覆盖 js/data.js 的文件内容
  function toDataJs() {
    function q(s) {
      return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }
    var out = [];
    out.push('/* ==========================================================================');
    out.push(' * 中国辣力地图 —— 数据层 (js/data.js)');
    out.push(' * --------------------------------------------------------------------------');
    out.push(' * 本文件由页面「数据总览 → 导出 data.js」生成，可直接覆盖同名文件。');
    out.push(' * 导出时间：' + new Date().toLocaleString('zh-CN'));
    out.push(' * name 必须与 GeoJSON 的 properties.name 完全一致；辣度统一为 0-10。');
    out.push(' * ========================================================================== */');
    out.push('');
    out.push('window.SPICY_DATA = [');
    working.forEach(function (p, pi) {
      out.push('  {');
      out.push('    name: ' + q(p.name) + ',');
      out.push('    shortName: ' + q(p.shortName || '') + ',');
      out.push('    spicyLevel: ' + fmt1(p.spicyLevel) + ',');
      out.push('    dishes: [');
      (p.dishes || []).forEach(function (d, di) {
        var tail = di === p.dishes.length - 1 ? '' : ',';
        out.push('      { name: ' + q(d.name) + ', spicy: ' + fmt1(d.spicy) +
          ', desc: ' + q(d.desc || '') + ' }' + tail);
      });
      out.push('    ]');
      out.push('  }' + (pi === working.length - 1 ? '' : ','));
    });
    out.push('];');
    out.push('');
    out.push('/* 辣度等级与配色（导出时保持不变） */');
    out.push('window.SPICY_LEVELS = ' + JSON.stringify(window.SPICY_LEVELS, null, 2) + ';');
    out.push('');
    out.push('window.SPICY_COLORS = ' + JSON.stringify(window.SPICY_COLORS) + ';');
    out.push('');
    out.push('window.SPICY_SELECT_COLOR = ' + q(window.SPICY_SELECT_COLOR || '#7f1d1d') + ';');
    out.push('');
    return out.join('\n');
  }

  function flash(msg) {
    if (!hintEl) return;
    hintEl.textContent = msg;
    hintEl.classList.add('is-flash');
    clearTimeout(flash._t);
    flash._t = setTimeout(function () {
      hintEl.classList.remove('is-flash');
      renderHint();
    }, 2600);
  }

  function renderHint() {
    if (!hintEl) return;
    hintEl.innerHTML =
      '数据源：<code>js/data.js</code>。表格里的改动只作用于当前页面，' +
      '确认无误后点「<b>导出 data.js</b>」覆盖同名文件即可永久生效（或用「导出 CSV」在 Excel 里批量编辑）。' +
      '省份 <code>name</code> 必须与 GeoJSON 完全一致，因此不可编辑；' +
      '表格按 <code>data.js</code> 的存储顺序显示，右侧浮窗会自动按辣度从高到低排序。';
  }

  /* ============================ 应用到地图 ============================ */

  function applyToApp() {
    window.SPICY_DATA = clone(working);
    applied = true;

    // 让地图重新读取数据并刷新配色
    if (window.SpicyMap && typeof window.SpicyMap.reloadData === 'function') {
      window.SpicyMap.reloadData();
    }
    // 浮窗开着的话同步刷新内容
    var sel = window.SpicyMap && window.SpicyMap.getSelected ? window.SpicyMap.getSelected() : null;
    if (sel && window.SpicyPanel && window.SpicyPanel.isOpen && window.SpicyPanel.isOpen()) {
      window.SpicyPanel.open(sel);
    }
    renderDirtyState();
    flash('✓ 已应用到地图与浮窗（改动仍在内存中，记得导出 data.js 保存）');
  }

  function resetData() {
    if (isDirty() && !window.confirm('确定放弃当前所有改动，恢复为 js/data.js 的原始数据吗？')) return;
    working = clone(original);
    applied = false;
    window.SPICY_DATA = clone(original);
    if (window.SpicyMap && typeof window.SpicyMap.reloadData === 'function') {
      window.SpicyMap.reloadData();
    }
    var sel = window.SpicyMap && window.SpicyMap.getSelected ? window.SpicyMap.getSelected() : null;
    if (sel && window.SpicyPanel && window.SpicyPanel.isOpen && window.SpicyPanel.isOpen()) {
      window.SpicyPanel.open(sel);
    }
    renderTable();
    flash('已恢复为 js/data.js 的原始数据');
  }

  /* ============================ 表格交互 ============================ */

  function bindTableEvents() {
    // 输入：实时写入内存模型（不重绘表格，避免打断输入）
    tbody.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || !t.dataset || !t.dataset.field) return;
      var pi = parseInt(t.dataset.p, 10);
      var p = working[pi];
      if (!p) return;
      var field = t.dataset.field;

      if (t.dataset.d === undefined) {
        // 省份级字段
        if (field === 'shortName') p.shortName = t.value;
        else if (field === 'spicyLevel') p.spicyLevel = toSpicy(t.value);
        refreshProvinceDerived(pi);
        renderDirtyState();
        return;
      }

      var di = parseInt(t.dataset.d, 10);
      var d = (p.dishes || [])[di];
      if (!d) return;
      if (field === 'name') d.name = t.value;
      else if (field === 'desc') d.desc = t.value;
      else if (field === 'spicy') d.spicy = toSpicy(t.value);
      refreshDishDerived(pi, di);
      renderDirtyState();
    });

    // 失焦：把数字框规范成 0-10 的一位小数，纠正越界输入
    tbody.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.dataset || !t.dataset.field) return;
      if (t.type !== 'number') return;
      var v = toSpicy(t.value);
      t.value = fmt1(v);
    });

    // 增删菜品
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var pi = parseInt(btn.dataset.p, 10);
      var p = working[pi];
      if (!p) return;

      if (btn.dataset.act === 'add') {
        if (!p.dishes) p.dishes = [];
        p.dishes.push({ name: '新菜品', spicy: 5.0, desc: '请填写这道菜的简短描述' });
        renderTable();
        // 聚焦到新增那一行的菜名输入框，方便直接改名
        var last = p.dishes.length - 1;
        var input = tbody.querySelector('input[data-p="' + pi + '"][data-d="' + last + '"][data-field="name"]');
        if (input) { input.focus(); input.select(); }
        flash('已新增一道菜，改完记得「导出 data.js」');
      } else if (btn.dataset.act === 'del') {
        var di = parseInt(btn.dataset.d, 10);
        var dish = p.dishes[di];
        if (!dish) return;
        if (!window.confirm('确定删除「' + (p.shortName || p.name) + ' · ' + dish.name + '」吗？')) return;
        p.dishes.splice(di, 1);
        renderTable();
        flash('已删除，点「重置」可以全部还原');
      }
    });
  }

  /* ============================ 浮层管理 ============================ */

  var openStack = [];

  function openOverlay(node) {
    if (!node || node.classList.contains('is-open')) return;
    // 打开工具浮层前先收起省份浮窗，避免叠在一起
    if (window.SpicyPanel && window.SpicyPanel.close) window.SpicyPanel.close();

    node.hidden = false;
    // 强制一次重排，保证过渡动画生效
    void node.offsetWidth;
    node.classList.add('is-open');
    document.body.classList.add('modal-open');
    if (openStack.indexOf(node) < 0) openStack.push(node);

    var focusable = node.querySelector('input, textarea, button:not(.overlay__close)');
    if (focusable) setTimeout(function () { focusable.focus(); }, 60);
  }

  function closeOverlay(node) {
    if (!node || node.hidden) return;
    node.classList.remove('is-open');
    var i = openStack.indexOf(node);
    if (i >= 0) openStack.splice(i, 1);
    if (!openStack.length) document.body.classList.remove('modal-open');
    setTimeout(function () {
      if (!node.classList.contains('is-open')) node.hidden = true;
    }, 220);
  }

  function closeTopOverlay() {
    if (!openStack.length) return false;
    closeOverlay(openStack[openStack.length - 1]);
    return true;
  }

  function bindOverlayEvents() {
    // 点击背景或关闭按钮
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-close]') : null;
      if (!el) return;
      var overlay = el.closest('.overlay');
      if (overlay) closeOverlay(overlay);
    });

    // ESC 关闭最上层浮层（省份浮窗的 ESC 在 panel.js 中，已做 modal-open 互斥）
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      if (closeTopOverlay()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  /* ============================ 意见反馈 ============================ */

  function composeMailto() {
    var msg = (el.fbMessage && el.fbMessage.value || '').trim();
    var sel = window.SpicyMap && window.SpicyMap.getSelected ? window.SpicyMap.getSelected() : null;

    var body = [];
    if (msg) { body.push(msg); body.push(''); }
    body.push('———— 以下信息由页面自动附带 ————');
    body.push('页面：中国辣力地图');
    body.push('地址：' + location.href);
    if (sel) body.push('当前选中省份：' + sel);
    body.push('时间：' + new Date().toLocaleString('zh-CN'));

    return 'mailto:' + FEEDBACK_EMAIL +
      '?subject=' + encodeURIComponent('【中国辣力地图】意见反馈' + (sel ? '（' + sel + '）' : '')) +
      '&body=' + encodeURIComponent(body.join('\n'));
  }

  function refreshFeedbackLinks() {
    var href = composeMailto();
    if (el.fbMailLink) el.fbMailLink.setAttribute('href', href);
  }

  function bindFeedbackEvents() {
    if (el.openFeedbackBtn) {
      el.openFeedbackBtn.addEventListener('click', function () {
        refreshFeedbackLinks();
        if (el.fbStatus) el.fbStatus.textContent = '';
        openOverlay(el.feedbackOverlay);
      });
    }

    if (el.fbSendBtn) {
      el.fbSendBtn.addEventListener('click', function () {
        refreshFeedbackLinks();
        if (el.fbStatus) el.fbStatus.textContent = '正在打开邮件客户端…';
        window.location.href = composeMailto();
      });
    }

    if (el.fbCopyBtn) {
      el.fbCopyBtn.addEventListener('click', function () {
        copyText(FEEDBACK_EMAIL).then(function () {
          if (el.fbStatus) el.fbStatus.textContent = '✓ 已复制邮箱地址：' + FEEDBACK_EMAIL;
        }).catch(function () {
          if (el.fbStatus) el.fbStatus.textContent = '复制失败，请手动记录：' + FEEDBACK_EMAIL;
        });
      });
    }

    if (el.fbMessage) {
      el.fbMessage.addEventListener('input', refreshFeedbackLinks);
    }
  }

  /* ============================ 数据总览浮层 ============================ */

  function bindDataEvents() {
    if (el.openDataBtn) {
      el.openDataBtn.addEventListener('click', function () {
        initModel();
        renderTable();
        openOverlay(el.dataOverlay);
      });
    }

    if (el.dataSearch) {
      var timer = null;
      el.dataSearch.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          keyword = el.dataSearch.value || '';
          renderTable();
        }, 140);
      });
    }

    if (el.dataCsvBtn) {
      el.dataCsvBtn.addEventListener('click', function () {
        downloadText('辣度数据表.csv', toCsv(), 'text/csv');
        flash('已导出 辣度数据表.csv（UTF-8 BOM，Excel 可直接打开）');
      });
    }

    if (el.dataCopyBtn) {
      el.dataCopyBtn.addEventListener('click', function () {
        copyText(toCsv().replace(/^\uFEFF/, '')).then(function () {
          flash('✓ CSV 已复制到剪贴板，可直接粘贴进表格软件');
        }).catch(function () {
          flash('复制失败，请改用「导出 CSV」');
        });
      });
    }

    if (el.dataJsBtn) {
      el.dataJsBtn.addEventListener('click', function () {
        downloadText('data.js', toDataJs(), 'text/javascript');
        flash('已导出 data.js —— 用它覆盖 js/data.js 即可永久生效');
      });
    }

    if (el.dataResetBtn) {
      el.dataResetBtn.addEventListener('click', resetData);
    }

    if (el.dataApplyBtn) {
      el.dataApplyBtn.addEventListener('click', applyToApp);
    }
  }

  /* ============================ 初始化 ============================ */

  function boot() {
    el.dataOverlay = document.getElementById('dataOverlay');
    el.feedbackOverlay = document.getElementById('feedbackOverlay');
    el.openDataBtn = document.getElementById('openDataBtn');
    el.openFeedbackBtn = document.getElementById('openFeedbackBtn');
    el.dataSearch = document.getElementById('dataSearch');
    el.dataCsvBtn = document.getElementById('dataCsvBtn');
    el.dataCopyBtn = document.getElementById('dataCopyBtn');
    el.dataJsBtn = document.getElementById('dataJsBtn');
    el.dataResetBtn = document.getElementById('dataResetBtn');
    el.dataApplyBtn = document.getElementById('dataApplyBtn');
    el.fbMessage = document.getElementById('fbMessage');
    el.fbSendBtn = document.getElementById('fbSendBtn');
    el.fbCopyBtn = document.getElementById('fbCopyBtn');
    el.fbMailLink = document.getElementById('fbMailLink');
    el.fbStatus = document.getElementById('fbStatus');

    tbody = document.getElementById('dataTableBody');
    metaEl = document.getElementById('dataOverlayMeta');
    hintEl = document.getElementById('dataHint');
    applyBtn = el.dataApplyBtn;

    // 页面上没有这些节点时（例如只引用了部分脚本）直接跳过，不影响地图
    if (!el.dataOverlay && !el.feedbackOverlay) return;

    initModel();
    renderHint();
    if (metaEl) renderMeta(0, 0);

    if (tbody) bindTableEvents();
    bindDataEvents();
    bindFeedbackEvents();
    bindOverlayEvents();
  }

  /* 对外 API：方便在控制台或别的脚本里打开 */
  window.SpicyTools = {
    openData: function () { initModel(); renderTable(); openOverlay(el.dataOverlay); },
    openFeedback: function () { refreshFeedbackLinks(); openOverlay(el.feedbackOverlay); },
    closeAll: function () { while (closeTopOverlay()) { /* 逐个关闭 */ } },
    getWorkingData: function () { initModel(); return clone(working); },
    toCsv: function () { initModel(); return toCsv(); },
    toDataJs: function () { initModel(); return toDataJs(); },
    email: FEEDBACK_EMAIL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
