/* ==========================================================================
 * 中国辣力地图 —— 地图层 (js/map.js)
 * --------------------------------------------------------------------------
 * 职责：
 *   1. 加载中国省级 GeoJSON（在线优先 → 备用 CDN → 本地 data/china.json）
 *   2. 用 ECharts 5 渲染中国地图，visualMap 把综合辣度 0-10 连续映射为红色深度
 *   3. 悬浮 tooltip（省名 / 综合辣度 / 代表菜）、点击选中（深红描边）
 *   4. 把“选中了哪个省”通知给 panel.js，并在点击空白处时通知关闭浮窗
 *
 * 依赖：window.SPICY_DATA、window.SPICY_COLORS（来自 js/data.js）
 * 暴露：window.SpicyMap = { highlight, clearHighlight, getSelected, resetView }
 * ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------- 常量配置 ---------------------------- */

  // 在线 GeoJSON：题目指定地址（properties.name 为“四川省”这类全称）
  var GEO_ONLINE = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
  // 备用在线地址：ECharts 官方地图（properties.name 为“四川”这类简称，靠归一化兼容）
  var GEO_ONLINE_BACKUP = 'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/china.json';
  // 本地 fallback：需要用本地服务器（http://）打开才能读取
  var GEO_LOCAL = 'data/china.json';

  var MAP_NAME = 'china';                 // 注册到 ECharts 的地图名
  var NO_DATA_COLOR = '#eef1f6';          // 无数据区域（南海诸岛）的填充色
  var SELECT_COLOR = window.SPICY_SELECT_COLOR || '#7f1d1d'; // 选中描边深红
  var NANHAI_NAME = '南海诸岛';            // GeoJSON 中 name 为空的那块（adcode 100000_JD）

  /* ---------------------------- 运行时状态 ---------------------------- */

  var chart = null;              // ECharts 实例
  var mapReady = false;          // 地图是否注册完成
  var selectedName = null;       // 当前选中省名（与 SPICY_DATA 的 name 一致）
  var ro = null;                 // ResizeObserver

  // DOM 引用
  var elMap, elWrap, elLoading, elError, elErrorText, elRetry, elHint;

  /* ---------------------------- 工具函数 ---------------------------- */

  // HTML 转义，避免把文本直接拼进 innerHTML 时出问题
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 辣度 → 等级文案（0 不辣 / 1-2 微辣 / 3-4 轻辣 / 5-6 中辣 / 7-8 重辣 / 9-10 极辣）
  function levelOf(spicy) {
    var list = window.SPICY_LEVELS || [];
    var v = Math.max(0, Math.min(10, Number(spicy) || 0));
    for (var i = 0; i < list.length; i++) {
      // 0 单独成档；其余按区间判断，9.5 这类小数也能落到“极辣”
      var min = list[i].min, max = list[i].max;
      if (v >= min && v <= max) return list[i];
      if (v > max && (i === list.length - 1 || v < list[i + 1].min)) return list[i];
    }
    return list[list.length - 1] || { label: '未知', color: '#eee' };
  }

  // 保留一位小数显示
  function fmt1(v) {
    var n = Number(v);
    return isFinite(n) ? n.toFixed(1) : '--';
  }

  /* 在 SPICY_COLORS 色阶上按 0-10 取色（与 visualMap 的映射保持一致）。
   * 用途：让“悬浮高亮”用同一色系更深一档的红，而不是 ECharts 默认的金黄色——
   * 这样鼠标悬浮时依然能读出辣度深浅，不会破坏数据编码。 */
  function colorAt(value) {
    var stops = window.SPICY_COLORS || ['#f7f7f7', '#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#a50f15'];
    var v = Math.max(0, Math.min(10, Number(value) || 0));
    var seg = 10 / (stops.length - 1);          // 每个色阶覆盖的辣度跨度（此处为 2）
    var i = Math.min(stops.length - 2, Math.floor(v / seg));
    var t = (v - i * seg) / seg;                // 段内插值比例 0-1

    function hex2rgb(h) {
      h = String(h).replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var a = hex2rgb(stops[i]);
    var b = hex2rgb(stops[i + 1]);
    var out = a.map(function (c, k) { return Math.round(c + (b[k] - c) * t); });
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }

  /* ------------------- GeoJSON 名称归一化 -------------------
   * 不同来源的 GeoJSON 名称不一致：
   *   政务版：四川省 / 重庆市 / 广西壮族自治区
   *   ECharts 4 版：四川 / 重庆 / 广西
   * 这里统一换算成 SPICY_DATA 里的 name，保证 series 数据能对上区域。
   */
  function stripSuffix(s) {
    return String(s || '')
      .replace(/特别行政区$/, '')
      .replace(/维吾尔自治区$/, '')
      .replace(/壮族自治区$/, '')
      .replace(/回族自治区$/, '')
      .replace(/自治区$/, '')
      .replace(/[省市]$/, '');
  }

  // 建立查找表：全称 / 简称 / 去后缀名 → SPICY_DATA 里的正式 name
  function buildNameLookup() {
    var lookup = {};
    var data = window.SPICY_DATA || [];
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      lookup[p.name] = p.name;
      if (p.shortName) lookup[p.shortName] = p.name;
      lookup[stripSuffix(p.name)] = p.name;
    }
    return lookup;
  }

  // 把 GeoJSON 里的 name 映射成正式省名；无法识别时原样返回
  function canonicalName(geoName, lookup) {
    var raw = String(geoName == null ? '' : geoName).trim();
    if (!raw) return NANHAI_NAME;                       // 空名 = 南海诸岛
    if (lookup[raw]) return lookup[raw];
    var stripped = stripSuffix(raw);
    if (lookup[stripped]) return lookup[stripped];
    return raw;
  }

  /* ---------------------------- 数据索引 ---------------------------- */

  var provinceIndex = null; // { 省名: 省份数据对象 }

  function getProvince(name) {
    if (!provinceIndex) {
      provinceIndex = {};
      var data = window.SPICY_DATA || [];
      for (var i = 0; i < data.length; i++) provinceIndex[data[i].name] = data[i];
    }
    return provinceIndex[name] || null;
  }

  // 代表菜 = 该省辣度最高的那道菜（辣度相同时按菜名排序，保证结果稳定）
  function topDish(province) {
    if (!province || !province.dishes || !province.dishes.length) return null;
    var sorted = province.dishes.slice().sort(function (a, b) {
      if (b.spicy !== a.spicy) return b.spicy - a.spicy;
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });
    return sorted[0];
  }

  /* ---------------------------- 状态 UI ---------------------------- */

  var slowTimer = null;   // “加载较慢”提示的定时器

  function showLoading(show) {
    if (!elLoading) return;
    elLoading.hidden = !show;
    if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
    if (!show) return;

    // 网络挂起时不能让用户一直干等：5 秒后给出解释性提示
    var label = elLoading.querySelector('.map-status__label');
    if (label) label.textContent = '正在加载中国地图数据…';
    slowTimer = setTimeout(function () {
      if (elLoading && !elLoading.hidden && label) {
        label.textContent = '网络较慢，正在尝试备用地址与本地 data/china.json…';
      }
    }, 5000);
  }

  function showError(html) {
    showLoading(false);
    if (!elError) return;
    if (elErrorText && html) elErrorText.innerHTML = html;
    elError.hidden = false;
  }

  function hideError() {
    if (elError) elError.hidden = true;
  }

  /* ---------------------------- 拉取 GeoJSON ---------------------------- */

  var FETCH_TIMEOUT = 6000;   // 单个数据源超时（毫秒）

  /* 带超时的 fetch：避免网络挂起时页面永远停在“加载中”。
   * 超时后 abort 请求并进入下一个备用数据源。 */
  function fetchJson(url, timeoutMs) {
    var ms = timeoutMs || FETCH_TIMEOUT;
    var timer = null;
    var controller = null;
    var opts = { cache: 'no-cache' };

    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      opts.signal = controller.signal;
    }

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) { try { controller.abort(); } catch (e) { /* 忽略 */ } }
        reject(new Error('请求超时 ' + ms + 'ms'));
      }, ms);
    });

    function done() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    return Promise.race([fetch(url, opts), timeoutPromise]).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (json) {
      done();
      if (!json || !json.features || !json.features.length) {
        throw new Error('GeoJSON 内容为空');
      }
      return json;
    }).catch(function (err) {
      done();
      throw new Error((err && err.message ? err.message : String(err)) + ' @ ' + url);
    });
  }

  // 依次尝试：在线主源 → 在线备用源 → 本地文件
  function loadGeoJson() {
    var sources = [
      { url: GEO_ONLINE, label: '在线主源' },
      { url: GEO_ONLINE_BACKUP, label: '在线备用源' },
      { url: GEO_LOCAL, label: '本地文件' }
    ];
    var errors = [];

    function tryAt(i) {
      if (i >= sources.length) {
        return Promise.reject(errors);
      }
      return fetchJson(sources[i].url).catch(function (err) {
        errors.push(sources[i].label + '：' + (err && err.message ? err.message : err));
        return tryAt(i + 1);
      });
    }
    return tryAt(0);
  }

  /* ---------------------------- 渲染地图 ---------------------------- */

  // 注册 GeoJSON 到 ECharts，并把区域名统一成正式省名
  function registerMap(geo) {
    var lookup = buildNameLookup();

    geo.features.forEach(function (f) {
      if (!f.properties) f.properties = {};
      var canonical = canonicalName(f.properties.name, lookup);

      // 保留原始名，便于排查；同时把 name 改成能跟数据对上的正式名
      if (f.properties.name !== canonical) {
        f.properties.originalName = f.properties.name;
      }
      f.properties.name = canonical;

      // 南海诸岛那块给一个中文名，tooltip 才能正常显示
      if (!canonical || canonical === NANHAI_NAME) {
        f.properties.name = NANHAI_NAME;
      }
    });

    // registerMap 会覆盖同名地图，这里先移除旧注册，保证“重新加载”可用
    if (echarts.getMap && echarts.getMap(MAP_NAME)) {
      echarts.unregisterMap(MAP_NAME);
    }
    echarts.registerMap(MAP_NAME, geo);
  }

  // 组装 series 数据（选中省份用深红描边）
  function buildSeriesData() {
    var data = window.SPICY_DATA || [];
    var items = data.map(function (p) {
      var item = {
        name: p.name,
        value: p.spicyLevel,
        // 悬浮时在同色系里加深一档，既高亮又不丢失辣度深浅信息
        emphasis: { itemStyle: { areaColor: colorAt(Number(p.spicyLevel) + 1.8) } }
      };
      if (p.name === selectedName) {
        item.itemStyle = {
          borderColor: SELECT_COLOR,
          borderWidth: 2.6,
          shadowBlur: 16,
          shadowColor: 'rgba(127,29,29,.45)'
        };
        item.z = 3;
      }
      return item;
    });

    /* 南海诸岛（九段线）单独处理：
     * 它没有辣度数据，且几何形状是一条条“线段状多边形”。如果按普通区域填充，
     * 在白色卡片上几乎看不见。这里改为**透明填充 + 灰色描边**，让九段线清晰可辨，
     * 既保证领土完整可见，又不会误读成某个辣度等级。 */
    items.push({
      name: NANHAI_NAME,
      value: null,                       // 无辣度数据，不参与 0-10 颜色映射
      itemStyle: {
        areaColor: 'transparent',
        borderColor: '#9aa6b8',
        borderWidth: 1.2
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(154,166,184,.20)',
          borderColor: '#6b7789',
          borderWidth: 1.6
        }
      },
      label: { show: true, color: '#7b8496', fontSize: 10, textBorderColor: '#ffffff', textBorderWidth: 2 }
    });

    return items;
  }

  // tooltip：省名 + 综合辣度 + 代表菜
  function tooltipFormatter(params) {
    var name = params.name;
    if (name === NANHAI_NAME) {
      return '<div style="font-weight:700;margin-bottom:4px;">' + NANHAI_NAME + '</div>' +
        '<div style="color:#7b8496;font-size:12px;">中国南海诸岛（无辣度数据）</div>';
    }
    var p = getProvince(name);
    if (!p) {
      return '<div style="font-weight:700;">' + escapeHtml(name) + '</div>' +
        '<div style="color:#7b8496;font-size:12px;">暂无辣度数据</div>';
    }
    var lv = levelOf(p.spicyLevel);
    var top = topDish(p);
    var line = function (k, v) {
      return '<div style="display:flex;gap:10px;justify-content:space-between;font-size:12.5px;line-height:1.7;">' +
        '<span style="color:#7b8496;">' + k + '</span><span style="font-weight:600;">' + v + '</span></div>';
    };
    return '' +
      '<div style="min-width:172px;">' +
        '<div style="font-weight:800;font-size:14px;margin-bottom:5px;">' +
          escapeHtml(p.shortName || p.name) +
          '<span style="font-weight:400;color:#7b8496;font-size:11.5px;margin-left:6px;">' +
            escapeHtml(p.name) + '</span>' +
        '</div>' +
        line('综合辣度', '<span style="color:' + SELECT_COLOR + ';">' + fmt1(p.spicyLevel) + ' / 10</span>') +
        line('辣度等级',
          '<span style="background:' + lv.color + ';color:' + (p.spicyLevel >= 5 ? '#ffffff' : '#4b5565') +
          ';padding:1px 8px;border-radius:6px;">' + lv.label + '</span>') +
        (top ? line('代表菜', escapeHtml(top.name) + ' <span style="color:#a50f15;">' + fmt1(top.spicy) + '</span>') : '') +
        '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e5e8f0;' +
          'font-size:11.5px;color:#9aa2b1;">点击查看该省名菜辣度排名</div>' +
      '</div>';
  }

  function buildOption() {
    return {
      // 背景透明，交给 CSS 控制卡片外观
      backgroundColor: 'transparent',
      animationDuration: 600,
      animationEasing: 'cubicOut',

      // ---- 0-10 连续型图例，红色越深辣度越高 ----
      visualMap: {
        type: 'continuous',
        min: 0,
        max: 10,
        left: 18,
        bottom: 22,
        itemWidth: 14,
        itemHeight: 148,
        calculable: true,
        precision: 1,
        text: ['极辣 10', '不辣 0'],
        textGap: 8,
        textStyle: { color: '#4b5565', fontSize: 11.5 },
        inRange: { color: window.SPICY_COLORS || ['#f7f7f7', '#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#a50f15'] },
        backgroundColor: 'rgba(255,255,255,.86)',
        padding: [10, 10, 10, 10]
      },

      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove|click',
        confine: true,
        padding: [10, 12],
        backgroundColor: 'rgba(255,255,255,.98)',
        borderColor: '#e5e8f0',
        borderWidth: 1,
        extraCssText: 'border-radius:12px;box-shadow:0 8px 26px rgba(20,28,45,.14);',
        textStyle: { color: '#1c2230', fontSize: 13 },
        formatter: tooltipFormatter
      },

      series: [{
        id: 'spicy-china',
        name: '综合辣度',
        type: 'map',
        map: MAP_NAME,
        roam: true,                       // 允许缩放 / 平移
        scaleLimit: { min: 0.8, max: 8 },
        zoom: 1,
        selectedMode: false,              // 选中态自己控制，避免与 visualMap 配色冲突
        // 区域默认样式（有数据的区域会被 visualMap 覆盖颜色）
        itemStyle: {
          areaColor: NO_DATA_COLOR,
          borderColor: '#ffffff',
          borderWidth: 0.8,
          shadowColor: 'rgba(20,28,45,.10)',
          shadowBlur: 6,
          shadowOffsetY: 2
        },
        // 悬浮高亮：保留红色深度，用深红描边 + 阴影 + 省名标签来强调
        emphasis: {
          itemStyle: {
            borderColor: SELECT_COLOR,
            borderWidth: 1.8,
            shadowBlur: 14,
            shadowColor: 'rgba(127,29,29,.35)'
          },
          label: {
            show: true,
            color: '#7f1d1d',
            fontWeight: 'bold',
            fontSize: 12,
            textBorderColor: '#ffffff',
            textBorderWidth: 3
          }
        },
        // 省名标签：自动隐藏重叠标签，避免港澳沪等地名互相压盖
        label: {
          show: true,
          color: '#414a5c',
          fontSize: 10,
          textBorderColor: 'rgba(255,255,255,.9)',
          textBorderWidth: 2.4
        },
        labelLayout: { hideOverlap: true },
        select: {
          label: { show: true, color: '#7f1d1d', fontWeight: 'bold' }
        },
        data: buildSeriesData()
      }]
    };
  }

  // 只更新 series 数据（切换选中省份时用，比整图 setOption 更稳）
  function refreshSelection() {
    if (!chart) return;
    chart.setOption({ series: [{ id: 'spicy-china', data: buildSeriesData() }] });
  }

  /* ---------------------------- 交互事件 ---------------------------- */

  function handleRegionClick(name) {
    if (!name || name === NANHAI_NAME) return;
    var p = getProvince(name);
    if (!p) return;

    // 再次点击同一个省：保持选中，不重复打开
    selectedName = name;
    refreshSelection();

    // 通知浮窗层渲染该省数据
    if (window.SpicyPanel && typeof window.SpicyPanel.open === 'function') {
      window.SpicyPanel.open(name);
    }

    // 首次点击后隐藏操作提示
    if (elHint) elHint.classList.add('is-hidden');
  }

  // 点击地图空白处 → 关闭浮窗
  function handleBlankClick() {
    if (window.SpicyPanel && typeof window.SpicyPanel.close === 'function') {
      window.SpicyPanel.close();
    } else {
      clearHighlight();
    }
  }

  function bindEvents() {
    // 点击省份
    chart.on('click', function (params) {
      if (params && params.componentType === 'series' && params.seriesId === 'spicy-china') {
        handleRegionClick(params.name);
      }
    });

    // 点击画布空白处：zrender 事件里没有 target 就说明没点到任何图形
    chart.getZr().on('click', function (e) {
      if (!e.target) handleBlankClick();
    });
  }

  /* ---------------------------- 尺寸自适应 ---------------------------- */

  function bindResize() {
    function resize() {
      if (chart) chart.resize();
    }
    // 浮窗打开时地图容器宽度会变化，用 ResizeObserver 最可靠
    if (typeof ResizeObserver !== 'undefined' && elWrap) {
      ro = new ResizeObserver(function () {
        window.requestAnimationFrame(resize);
      });
      ro.observe(elWrap);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () {
      window.setTimeout(resize, 220);
    });
  }

  /* ---------------------------- 初始化 ---------------------------- */

  function initChart() {
    if (!window.echarts) {
      showError('ECharts 脚本加载失败，请检查网络后刷新页面。');
      return false;
    }
    chart = echarts.init(elMap, null, { renderer: 'canvas' });
    return true;
  }

  function render(geo) {
    registerMap(geo);
    mapReady = true;
    hideError();
    showLoading(false);

    chart.setOption(buildOption(), true);
    bindEvents();
    // 首次渲染后立刻校正一次尺寸，避免容器刚布局完成时的偏移
    window.requestAnimationFrame(function () { chart.resize(); });
  }

  function start() {
    if (!initChart()) return;

    showLoading(true);
    loadGeoJson().then(function (geo) {
      render(geo);
    }).catch(function (errors) {
      // 在线与本地都失败：给出明确的中文提示
      var isFile = location.protocol === 'file:';
      var detail = (errors || []).map(function (e) {
        return '<br>· ' + escapeHtml(e);
      }).join('');
      showError(
        (isFile
          ? '浏览器因 <code>file://</code> 安全限制无法读取本地 JSON 文件。'
          : '无法获取中国地图 GeoJSON 数据。') +
        '<br>请用本地服务器打开，例如：<code>python -m http.server 8080</code>' +
        '<br>然后访问 <code>http://localhost:8080</code>' +
        (detail ? '<br><span style="font-size:11.5px;color:#9aa2b1;">失败原因：' + detail + '</span>' : '')
      );
    });
  }

  /* ---------------------------- 对外 API ---------------------------- */

  window.SpicyMap = {
    // 只更新地图高亮（不触发浮窗），供 panel.js 在切换省份时调用
    highlight: function (name) {
      selectedName = name || null;
      if (mapReady) refreshSelection();
    },
    // 取消高亮
    clearHighlight: function () {
      selectedName = null;
      if (mapReady) refreshSelection();
    },
    // 当前选中的省
    getSelected: function () { return selectedName; },
    // 重置缩放/平移
    resetView: function () {
      if (chart) chart.setOption({ series: [{ id: 'spicy-china', zoom: 1, center: null }] });
    },
    // 供外部（如顶栏）主动选中某个省
    select: function (name) { handleRegionClick(name); },
    /* 数据被外部改写后调用：清掉省份索引缓存并重刷地图配色。
     * tools.js 的「数据总览 → 应用到地图」会用到。 */
    reloadData: function () {
      provinceIndex = null;
      if (mapReady) refreshSelection();
    },
    isReady: function () { return mapReady; },
    getChart: function () { return chart; },
    // 共享工具，供 panel.js 复用，保证两处配色/分档完全一致
    levelOf: levelOf,
    colorAt: colorAt
  };

  /* ---------------------------- 启动 ---------------------------- */

  function boot() {
    elMap = document.getElementById('map');
    elWrap = document.getElementById('mapWrap');
    elLoading = document.getElementById('mapLoading');
    elError = document.getElementById('mapError');
    elErrorText = document.getElementById('mapErrorText');
    elRetry = document.getElementById('mapRetryBtn');
    elHint = document.getElementById('mapHint');

    if (elRetry) {
      elRetry.addEventListener('click', function () {
        hideError();
        if (!chart) {
          start();
        } else {
          // 重新走一遍加载流程
          showLoading(true);
          loadGeoJson().then(render).catch(function () {
            showError('重新加载失败，请确认网络，或使用本地服务器打开：<code>python -m http.server 8080</code>');
          });
        }
      });
    }

    start();
    bindResize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
