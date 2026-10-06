/* ==========================================================================
 * 中国辣力地图 —— 浮窗层 (js/panel.js)
 * --------------------------------------------------------------------------
 * 职责：
 *   1. 渲染页头的辣度等级图例、浮窗内的“辣度等级说明”
 *   2. 打开 / 关闭 / 更新右侧浮窗（窄屏时为底部抽屉）
 *   3. 渲染省份综合辣力 + 经典名菜辣度排名（0-10 数值 + 辣度条 + 辣椒图标）
 *
 * 依赖：window.SPICY_DATA / SPICY_LEVELS（js/data.js）
 *       window.SpicyMap.highlight / clearHighlight（js/map.js）
 * 暴露：window.SpicyPanel = { open, close, toggle, isOpen, getCurrent }
 * ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------- DOM 引用 ---------------------------- */
  var els = {};

  /* ---------------------------- 运行时状态 ---------------------------- */
  var currentName = null;   // 当前展示的省名
  var opened = false;       // 浮窗是否打开

  /* ---------------------------- 工具函数 ---------------------------- */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 保留一位小数
  function fmt1(v) {
    var n = Number(v);
    return isFinite(n) ? n.toFixed(1) : '0.0';
  }

  // 辣度 → 等级（0 不辣 / 1-2 微辣 / 3-4 轻辣 / 5-6 中辣 / 7-8 重辣 / 9-10 极辣）
  // 优先复用 map.js 暴露的实现，保证全站分档口径一致
  function levelOf(spicy) {
    if (window.SpicyMap && typeof window.SpicyMap.levelOf === 'function') {
      return window.SpicyMap.levelOf(spicy);
    }
    var list = window.SPICY_LEVELS || [];
    var v = Math.max(0, Math.min(10, Number(spicy) || 0));
    for (var i = 0; i < list.length; i++) {
      if (v >= list[i].min && v <= list[i].max) return list[i];
      var isLast = i === list.length - 1;
      if (v > list[i].max && (isLast || v < list[i + 1].min)) return list[i];
    }
    return list[list.length - 1] || { label: '未知', color: '#eeeeee' };
  }

  // 辣度条颜色：同一色系取色，辣度越高越深
  function barColor(spicy) {
    if (window.SpicyMap && typeof window.SpicyMap.colorAt === 'function') {
      return window.SpicyMap.colorAt(spicy);
    }
    return levelOf(spicy).color;
  }

  /* 辣椒图标：最多 5 个，按 0-10 映射
   *   0 → 不显示 | 1-2 → 🌶️ | 3-4 → 🌶️🌶️ | 5-6 → 🌶️🌶️🌶️ | 7-8 → 🌶️🌶️🌶️🌶️ | 9-10 → 🌶️🌶️🌶️🌶️🌶️
   *
   * 注意：6.8 / 8.6 这类小数会落在档位区间之间，这里**按辣度等级分档取图标数**，
   * 而不是简单做 ceil(spicy/2)。这样图标数量与面板上显示的“辣度等级”永远一致，
   * 且整数辣度完全符合上表（如 6.8 → 中辣 → 🌶️🌶️🌶️）。
   */
  function chiliCount(spicy) {
    var v = Math.max(0, Math.min(10, Number(spicy) || 0));
    var list = window.SPICY_LEVELS || [];
    var target = levelOf(v);
    for (var i = 0; i < list.length; i++) {
      if (list[i].label === target.label) return Math.max(0, Math.min(5, i));
    }
    return 0;
  }

  function chiliHtml(spicy) {
    var n = chiliCount(spicy);
    if (n === 0) return '<span class="dish__chili dish__chili--none">不辣</span>';
    var s = '';
    for (var i = 0; i < n; i++) s += '🌶️';
    return '<span class="dish__chili" title="' + n + ' 个辣椒" aria-label="辣度图标 ' + n + ' 个">' + s + '</span>';
  }

  // 辣度条宽度 = 辣度 / 10 * 100%
  function barWidth(spicy) {
    var v = Math.max(0, Math.min(10, Number(spicy) || 0));
    return (v / 10 * 100).toFixed(1) + '%';
  }

  // 菜品排序：辣度从高到低；辣度相同时按菜名排序
  function sortDishes(dishes) {
    return (dishes || []).slice().sort(function (a, b) {
      if (Number(b.spicy) !== Number(a.spicy)) return Number(b.spicy) - Number(a.spicy);
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });
  }

  function getProvince(name) {
    var data = window.SPICY_DATA || [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].name === name) return data[i];
    }
    return null;
  }

  function isMobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  /* ---------------------- 渲染：页头等级图例 ---------------------- */

  function renderHeaderLegend() {
    if (!els.levelLegend) return;
    var list = window.SPICY_LEVELS || [];
    els.levelLegend.innerHTML = list.map(function (lv) {
      var range = lv.min === lv.max ? String(lv.min) : lv.min + '-' + lv.max;
      return '<li class="level-legend__item" data-level="' + escapeHtml(lv.label) + '">' +
        '<span class="level-legend__chip" style="background:' + lv.color + ';"></span>' +
        '<span>' + escapeHtml(lv.label) + '</span>' +
        '<span class="level-legend__range">' + range + '</span>' +
        '</li>';
    }).join('');
  }

  // 高亮当前省份所在的档位
  function markHeaderLegend(spicy) {
    if (!els.levelLegend) return;
    var target = levelOf(spicy).label;
    var items = els.levelLegend.querySelectorAll('.level-legend__item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', items[i].getAttribute('data-level') === target);
    }
  }

  /* ------------------- 渲染：浮窗内“辣度等级说明” ------------------- */

  function renderScaleList(activeLevel) {
    if (!els.scaleList) return;
    var list = window.SPICY_LEVELS || [];
    els.scaleList.innerHTML = list.map(function (lv) {
      var range = lv.min === lv.max ? String(lv.min) : lv.min + '-' + lv.max;
      return '<li class="scale-list__item' + (lv.label === activeLevel ? ' is-active' : '') + '">' +
        '<span class="scale-list__chip" style="background:' + lv.color + ';"></span>' +
        '<span>' + escapeHtml(lv.label) + '</span>' +
        '<span class="scale-list__range">' + range + '</span>' +
        '</li>';
    }).join('');
  }

  /* ---------------------- 渲染：浮窗主体内容 ---------------------- */

  function renderPanel(province) {
    var lv = levelOf(province.spicyLevel);
    var dishes = sortDishes(province.dishes);
    var displayName = province.shortName || province.name;

    // 标题：四川省 · 综合辣力 8.5/10
    if (els.title) {
      els.title.textContent = province.name + ' · 综合辣力 ' + fmt1(province.spicyLevel) + '/10';
    }
    // 副标题：等级 + 菜品数量
    if (els.subtitle) {
      els.subtitle.textContent = displayName + ' · ' + lv.label + ' · 共 ' + dishes.length + ' 道经典名菜';
    }
    // 综合辣力数值与等级徽标
    if (els.levelBadge) {
      els.levelBadge.textContent = lv.label;
      els.levelBadge.style.background = lv.color;
      // 浅色档位用深色文字，保证对比度
      els.levelBadge.style.color = Number(province.spicyLevel) >= 5 ? '#ffffff' : '#4b5565';
      els.levelBadge.style.boxShadow = Number(province.spicyLevel) >= 5
        ? '0 3px 10px rgba(200,30,30,.22)' : 'none';
    }
    if (els.levelValue) {
      els.levelValue.textContent = fmt1(province.spicyLevel) + ' / 10';
    }
    // 综合辣度条：宽度 = 辣度 / 10 * 100%
    if (els.levelFill) {
      els.levelFill.style.width = barWidth(province.spicyLevel);
    }

    renderScaleList(lv.label);
    markHeaderLegend(province.spicyLevel);

    // 菜品排名列表
    if (els.dishList) {
      if (!dishes.length) {
        els.dishList.innerHTML =
          '<li class="dish"><p class="dish__desc">该省暂无收录的经典名菜数据。</p></li>';
      } else {
        els.dishList.innerHTML = dishes.map(function (d, i) {
          var rank = i + 1;
          var topClass = rank <= 3 ? ' dish--top' + rank : '';
          return '' +
            '<li class="dish' + topClass + '" style="animation-delay:' + Math.min(i * 45, 320) + 'ms;">' +
              '<div class="dish__top">' +
                '<span class="dish__rank">第' + rank + '名</span>' +
                '<span class="dish__name" title="' + escapeHtml(d.name) + '">' + escapeHtml(d.name) + '</span>' +
                chiliHtml(d.spicy) +
                '<span class="dish__score">' + fmt1(d.spicy) + '<em>/10</em></span>' +
              '</div>' +
              '<div class="dish__bar">' +
                '<div class="dish__bar-fill" style="width:' + barWidth(d.spicy) +
                  ';background:linear-gradient(90deg,' + levelOf(d.spicy).color + ',' + barColor(d.spicy) + ');">' +
                '</div>' +
              '</div>' +
              '<p class="dish__desc">' + escapeHtml(d.desc) + '</p>' +
            '</li>';
        }).join('');
      }
      // 切换省份时列表回到顶部
      els.dishList.scrollTop = 0;
    }

    if (els.foot) {
      els.foot.textContent = '辣度为 0-10 的科普性评估，仅供饮食文化参考';
    }
  }

  /* ---------------------------- 打开 / 关闭 ---------------------------- */

  function open(name) {
    var province = getProvince(name);
    if (!province) return;

    // 工具浮层（数据总览 / 意见反馈）正盖在上面时，不要在后面偷偷弹出省份浮窗，
    // 否则关掉浮层会突然冒出一个浮窗。地图上的深红描边仍会正常更新。
    if (document.body.classList.contains('modal-open')) {
      if (window.SpicyMap && typeof window.SpicyMap.highlight === 'function') {
        window.SpicyMap.highlight(name);
      }
      return;
    }

    currentName = name;
    renderPanel(province);

    // 同步地图选中描边（再次点击同省时也保证一致）
    if (window.SpicyMap && typeof window.SpicyMap.highlight === 'function') {
      window.SpicyMap.highlight(name);
    }

    if (opened) return; // 已经打开时只更新内容，不重复播放入场动画
    opened = true;

    if (els.stage) els.stage.classList.add('is-open');
    if (els.panel) {
      els.panel.classList.add('is-open');
      els.panel.setAttribute('aria-hidden', 'false');
    }
    // 窄屏为底部抽屉：显示遮罩并锁定页面滚动
    if (isMobile() && els.mask) els.mask.hidden = false;
    document.body.classList.add('panel-open');
  }

  function close() {
    if (!opened) {
      // 未打开时也允许调用，保证状态干净
      if (window.SpicyMap && typeof window.SpicyMap.clearHighlight === 'function') {
        window.SpicyMap.clearHighlight();
      }
      markHeaderLegend(-1);
      return;
    }
    opened = false;
    currentName = null;

    if (els.stage) els.stage.classList.remove('is-open');
    if (els.panel) {
      els.panel.classList.remove('is-open');
      els.panel.setAttribute('aria-hidden', 'true');
    }
    if (els.mask) els.mask.hidden = true;
    document.body.classList.remove('panel-open');

    // 关闭浮窗时同步取消地图上的深红描边
    if (window.SpicyMap && typeof window.SpicyMap.clearHighlight === 'function') {
      window.SpicyMap.clearHighlight();
    }
    markHeaderLegend(-1);
  }

  function toggle(name) {
    if (opened && currentName === name) close();
    else open(name);
  }

  /* ---------------------------- 事件绑定 ---------------------------- */

  function bindEvents() {
    // 关闭按钮
    if (els.closeBtn) {
      els.closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });
    }

    // 移动端点击遮罩关闭
    if (els.mask) {
      els.mask.addEventListener('click', function () { close(); });
    }

    // ESC 关闭（工具浮层打开时让位给浮层，避免同时关掉两个）
    document.addEventListener('keydown', function (e) {
      if (document.body.classList.contains('modal-open')) return;
      if ((e.key === 'Escape' || e.keyCode === 27) && opened) close();
    });

    // 视口从窄屏切到宽屏时，遮罩需要收起（避免残留一层灰）
    window.addEventListener('resize', function () {
      if (!els.mask) return;
      if (opened && isMobile()) {
        els.mask.hidden = false;
      } else {
        els.mask.hidden = true;
      }
    });

    // 底部抽屉：向下轻扫关闭（移动端增强，非必需）
    var startY = null;
    if (els.panel) {
      els.panel.addEventListener('touchstart', function (e) {
        if (!isMobile()) return;
        var head = e.target.closest ? e.target.closest('.panel__head, .panel__grip') : null;
        startY = head ? e.touches[0].clientY : null;
      }, { passive: true });

      els.panel.addEventListener('touchmove', function (e) {
        if (startY === null) return;
        var dy = e.touches[0].clientY - startY;
        if (dy > 0) {
          // 跟手位移，最多下移 40% 面板高度
          var max = (els.panel.offsetHeight || 300) * 0.4;
          els.panel.style.transform = 'translateY(' + Math.min(dy, max) + 'px)';
        }
      }, { passive: true });

      els.panel.addEventListener('touchend', function (e) {
        if (startY === null) return;
        var dy = (e.changedTouches[0].clientY - startY);
        els.panel.style.transform = '';
        startY = null;
        if (dy > 80) close();  // 下拉超过 80px 视为关闭
      });
    }
  }

  /* ---------------------------- 初始化 ---------------------------- */

  function boot() {
    els.stage = document.getElementById('stage');
    els.panel = document.getElementById('panel');
    els.title = document.getElementById('panelTitle');
    els.subtitle = document.getElementById('panelSubtitle');
    els.levelBadge = document.getElementById('panelLevelBadge');
    els.levelValue = document.getElementById('panelLevelValue');
    els.levelFill = document.getElementById('panelLevelFill');
    els.scaleList = document.getElementById('panelScaleList');
    els.dishList = document.getElementById('dishList');
    els.closeBtn = document.getElementById('panelClose');
    els.mask = document.getElementById('drawerMask');
    els.levelLegend = document.getElementById('levelLegend');
    els.foot = document.getElementById('panelFoot');

    renderHeaderLegend();
    renderScaleList(null);   // 未选中省份时不突出任何档位
    bindEvents();

    // 移动端抽屉把手：点击也可关闭
    var grip = els.panel ? els.panel.querySelector('.panel__grip') : null;
    if (grip) grip.addEventListener('click', function () { close(); });
  }

  /* ---------------------------- 对外 API ---------------------------- */

  window.SpicyPanel = {
    open: open,
    close: close,
    toggle: toggle,
    isOpen: function () { return opened; },
    getCurrent: function () { return currentName; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
