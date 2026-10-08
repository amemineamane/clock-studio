/*
 * きせかえ時計 Clock Studio — 共有データ
 * clock.html と settings.html の両方が <script src="clock-data.js"> で読み込む唯一の共有契約。
 * デザイン/フォントの定義表・既定値・URL パラメータの parse / serialize をまとめています。
 *
 * 有料版専用の項目は PAID-ONLY:START 〜 PAID-ONLY:END のコメントで囲んでいます。
 * 無料版ビルドではこの区間が物理削除されます (配列の各要素は必ず末尾カンマ付きで書くこと)。
 */
(function () {
'use strict';

window.ClockStudio = {
  VERSION: '1.0.0',
  EDITION: 'free', // BUILD:EDITION
  PAID_URL: 'https://amemineamane.booth.pm/items/8958119', // BUILD:PAID_URL

  DEFAULTS: { d:'plain', lay:'v', h12:0, ap:'en', sec:1, blink:0, pad:1, date:0, df:'jp', label:'',
              font:'', c1:'', c2:'', c3:'', size:100, ol:0, olc:'000000', sh:0, anim:'none',
              ax:'c', ay:'m', tz:'', lang:'ja' },   /* lang は末尾に (既存 URL の serialize 結果を変えないため) */

  /*
   * デザイン定義
   *  font        : 既定フォント id (FONTS の id)
   *  colors      : c1〜c3 の既定値 (RRGGBB)。null = このデザインでは使わない
   *  colorLabels : 設定画面に出す色の名前
   *  rec         : size=100・秒あり・日付ありのときの推奨ブラウザソース 幅×高さ (v=縦並び / h=横並び)
   *  supports    : false の項目は設定画面でグレーアウト (clock.html 側でも無視する)
   *                font=フォント選択 / ol=フチ / anim=数字アニメ / lay=日付の位置 /
   *                h12=12時間表示(AM/PM) / blink=コロン点滅 / pad=時の先頭ゼロ
   *                ap=AM/PM の表記の選択 (false = 常に「午前/午後」。短冊・ことば)
   *                ※ ことば は pad:false でも先頭ゼロなし (「9時」)。ほかの pad:false は先頭ゼロあり扱い
   */
  DESIGNS: [
    { id:'plain', name:'プレーン', group:'シンプル', free:true,
      font:'noto',
      colors:['ffffff', '000000', null],
      colorLabels:['文字', '影', null],
      palettes:[ { name:'さくら', colors:['ffd1e3', '5a1e3a', null] },
                 { name:'ミント', colors:['b9ffe4', '003a2a', null] },
                 { name:'レモン', colors:['fff3a0', '3a2a00', null] },
                 { name:'空色', colors:['bfe6ff', '0a2a4a', null] } ],
      rec:{ v:[400,160], h:[550,130] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'pill', name:'ピル', group:'シンプル', free:true,
      font:'rounded',
      colors:['ffffff', '14161c', '9ad8ff'],
      colorLabels:['文字', 'プレート', '日付'],
      palettes:[ { name:'ピンク', colors:['ffffff', 'f04a7e', 'ffffff'] },
                 { name:'白プレート', colors:['1f2a44', 'ffffff', '3f7cff'] },
                 { name:'森', colors:['ffffff', '2f6b4f', 'b8f0cf'] },
                 { name:'すみれ', colors:['ffffff', '5b3fd1', 'e6e0ff'] } ],
      rec:{ v:[510,190], h:[670,150] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'neon', name:'ネオン', group:'ゲーミング', free:true,
      font:'orbitron',
      colors:['00e5ff', 'ff3df0', 'ffffff'],
      colorLabels:['時刻の光', '日付の光', '芯の色'],
      palettes:[ { name:'ピンク', colors:['ff2ea6', 'b44dff', 'ffffff'] },
                 { name:'グリーン', colors:['39ff14', '00e5ff', 'ffffff'] },
                 { name:'オレンジ', colors:['ff7a1a', 'ff2e63', 'fff3e0'] },
                 { name:'パープル', colors:['b44dff', '4dc9ff', 'ffffff'] } ],
      rec:{ v:[510,180], h:[680,140] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'seg7', name:'7セグ', group:'レトロ', free:true,
      font:'sharetech',
      colors:['ffa630', '15110c', null],
      colorLabels:['点灯色', 'プレート', null],
      palettes:[ { name:'レッド', colors:['ff3b3b', '140808', null] },
                 { name:'グリーン', colors:['3dff7a', '08140c', null] },
                 { name:'ブルー', colors:['4dd2ff', '081018', null] },
                 { name:'ホワイト', colors:['ffffff', '121316', null] } ],
      rec:{ v:[410,190], h:[580,150] },
      supports:{ font:false, ol:false, anim:false, lay:true, h12:true, blink:true, pad:true } },
    { id:'ticker', name:'ニュース', group:'番組風', free:true,
      font:'noto',
      colors:['0f1a2e', 'e60033', 'ffffff'],
      colorLabels:['帯', 'アクセント', '文字'],
      palettes:[ { name:'グリーン', colors:['0b3a2a', '00c27a', 'ffffff'] },
                 { name:'パープル', colors:['1a1030', '8c5cff', 'ffffff'] },
                 { name:'白帯', colors:['ffffff', 'e60033', '111111'] },
                 { name:'オレンジ', colors:['2a1608', 'ff9b00', 'ffffff'] } ],
      rec:{ v:[420,180], h:[590,150] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'pastel', name:'パステル', group:'かわいい', free:true,
      font:'zenmaru',
      colors:['ffd6e8', 'd4e4ff', '5d4a7e'],
      colorLabels:['グラデ1', 'グラデ2', '文字'],
      palettes:[ { name:'ミント', colors:['d9f7e8', 'd4e4ff', '2e5e5a'] },
                 { name:'ピーチ', colors:['fff1c9', 'ffd6e0', '7a4a3a'] },
                 { name:'ラベンダー', colors:['e6dcff', 'cdeeff', '4a3a8a'] },
                 { name:'いちご', colors:['ffe0f0', 'fff6c2', '8a3a5e'] } ],
      rec:{ v:[460,220], h:[630,170] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'wafu', name:'和風', group:'和', free:true,
      font:'mincho',
      colors:['f5eedc', 'c8442f', '2a2420'],
      colorLabels:['和紙', '朱 (落款)', '墨 (文字)'],
      palettes:[ { name:'墨地', colors:['2a2420', 'c8442f', 'f5eedc'] },
                 { name:'若竹', colors:['e8f0e0', '4a7a3a', '2a2a20'] },
                 { name:'藤', colors:['efe6f5', '7a3f9e', '2a2030'] },
                 { name:'藍', colors:['f0e6d8', '1f3f7a', '1a1e2a'] } ],
      rec:{ v:[540,210], h:[740,170] },
      supports:{ font:true, ol:true, anim:true, lay:true, h12:true, blink:true, pad:true } },
    { id:'analog', name:'アナログ', group:'アナログ', free:true,
      font:'noto',
      colors:['f8f7f3', '22252b', 'e04848'],
      colorLabels:['盤面', '針・目盛', '秒針'],
      palettes:[ { name:'クリーム', colors:['fff6e8', '5a3a1a', 'e0782a'] },
                 { name:'ブルー', colors:['eaf4ff', '1f3a5a', 'ff5c5c'] },
                 { name:'ミント', colors:['f4fff0', '2a4030', 'e8a01a'] },
                 { name:'ピンク', colors:['ffeef4', '5a2a3a', 'ff5c8a'] } ],
      rec:{ v:[260,290], h:[260,290] },
      supports:{ font:false, ol:false, anim:false, lay:false, h12:false, blink:false, pad:false } },
  ],

  /* 有料デザインの軽い一覧 (無料版でも鍵つきカードを出すために残す) */
  LOCKED_PREVIEW: [
    { id:'underline', name:'アンダーライン', group:'シンプル' },
    { id:'glass',     name:'グラス',         group:'シンプル' },
    { id:'outline',   name:'アウトライン',   group:'シンプル' },
    { id:'bar',       name:'サイドバー',     group:'シンプル' },
    { id:'split', name:'2段', group:'シンプル' },
    { id:'caption', name:'キャプション', group:'シンプル' },
    { id:'typewriter', name:'タイプライター', group:'シンプル' },
    { id:'hairline', name:'ヘアライン', group:'シンプル' },
    { id:'badge', name:'丸バッジ', group:'シンプル' },
    { id:'stack', name:'3段', group:'シンプル' },
    { id:'bracket', name:'角括弧', group:'シンプル' },
    { id:'cyber',     name:'サイバー',       group:'ゲーミング' },
    { id:'glitch',    name:'グリッチ',       group:'ゲーミング' },
    { id:'rgb',       name:'RGBウェーブ',    group:'ゲーミング' },
    { id:'hud',       name:'HUD',            group:'ゲーミング' },
    { id:'hologram',  name:'ホログラム',     group:'ゲーミング' },
    { id:'esports', name:'eスポーツ', group:'ゲーミング' },
    { id:'synthwave', name:'シンセウェーブ', group:'ゲーミング' },
    { id:'matrix', name:'マトリックス', group:'ゲーミング' },
    { id:'scoreboard', name:'スコアボード', group:'ゲーミング' },
    { id:'milspec', name:'ミルスペック', group:'ゲーミング' },
    { id:'circuit', name:'基板', group:'ゲーミング' },
    { id:'hazard', name:'工事テープ', group:'ゲーミング' },
    { id:'rank', name:'ランクバッジ', group:'ゲーミング' },
    { id:'carbon', name:'カーボン', group:'ゲーミング' },
    { id:'flip',      name:'フリップ',       group:'レトロ' },
    { id:'terminal',  name:'ターミナル',     group:'レトロ' },
    { id:'pixel',     name:'RPGウィンドウ',  group:'レトロ' },
    { id:'nixie',     name:'ニキシー管',     group:'レトロ' },
    { id:'lcd',       name:'液晶',           group:'レトロ' },
    { id:'led', name:'電光掲示板', group:'レトロ' },
    { id:'vfd', name:'蛍光表示管', group:'レトロ' },
    { id:'vhs', name:'VHS', group:'レトロ' },
    { id:'cassette', name:'カセット', group:'レトロ' },
    { id:'arcade', name:'アーケード', group:'レトロ' },
    { id:'marquee', name:'看板電飾', group:'レトロ' },
    { id:'pager', name:'ポケベル', group:'レトロ' },
    { id:'typepaper', name:'タイプ紙', group:'レトロ' },
    { id:'variety',   name:'テロップ',       group:'番組風' },
    { id:'live',      name:'ライブ',         group:'番組風' },
    { id:'weather', name:'お天気', group:'番組風' },
    { id:'quiz', name:'クイズ番組', group:'番組風' },
    { id:'sports', name:'スポーツ中継', group:'番組風' },
    { id:'subtitle', name:'字幕', group:'番組風' },
    { id:'lowerthird', name:'ローワーサード', group:'番組風' },
    { id:'docu', name:'ドキュメンタリー', group:'番組風' },
    { id:'pop',       name:'ポップ',         group:'かわいい' },
    { id:'sticker',   name:'ステッカー',     group:'かわいい' },
    { id:'neko',      name:'ねこ',           group:'かわいい' },
    { id:'fusen',     name:'ふせん',         group:'かわいい' },
    { id:'cloud', name:'くも', group:'かわいい' },
    { id:'ribbon', name:'リボン', group:'かわいい' },
    { id:'candy', name:'キャンディ', group:'かわいい' },
    { id:'bear', name:'くま', group:'かわいい' },
    { id:'bunny', name:'うさぎ', group:'かわいい' },
    { id:'heart', name:'ハート', group:'かわいい' },
    { id:'balloon', name:'風船', group:'かわいい' },
    { id:'yumekawa', name:'ゆめかわ', group:'かわいい' },
    { id:'tanzaku',   name:'短冊',           group:'和' },
    { id:'koyomi',    name:'日めくり',       group:'和' },
    { id:'kinpaku',   name:'金箔',           group:'和' },
    { id:'tsuki',     name:'月あかり',       group:'和' },
    { id:'sumi', name:'筆文字', group:'和' },
    { id:'asanoha', name:'麻の葉', group:'和' },
    { id:'nami', name:'波', group:'和' },
    { id:'shoji', name:'障子', group:'和' },
    { id:'ema', name:'絵馬', group:'和' },
    { id:'chochin', name:'提灯', group:'和' },
    { id:'sakura', name:'さくら', group:'季節' },
    { id:'hanabi', name:'花火', group:'季節' },
    { id:'momiji', name:'もみじ', group:'季節' },
    { id:'yuki', name:'雪', group:'季節' },
    { id:'halloween', name:'ハロウィン', group:'季節' },
    { id:'xmas', name:'クリスマス', group:'季節' },
    { id:'tsuyu', name:'梅雨', group:'季節' },
    { id:'umi', name:'海', group:'季節' },
    { id:'kingyo', name:'金魚', group:'季節' },
    { id:'tsukimi', name:'お月見', group:'季節' },
    { id:'valentine', name:'バレンタイン', group:'季節' },
    { id:'newyear', name:'お正月', group:'季節' },
    { id:'ring',      name:'リング',         group:'アナログ' },
    { id:'analogdark', name:'アナログ(黒)',  group:'アナログ' },
    { id:'roman',     name:'ローマ数字',     group:'アナログ' },
    { id:'handsonly', name:'針だけ', group:'アナログ' },
    { id:'neonanalog', name:'ネオンアナログ', group:'アナログ' },
    { id:'wood', name:'木製', group:'アナログ' },
    { id:'station', name:'駅時計', group:'アナログ' },
    { id:'chalk',     name:'黒板',           group:'その他' },
    { id:'binary', name:'バイナリ', group:'その他' },
    { id:'kotoba', name:'ことば', group:'その他' },
    { id:'progress', name:'進捗バー', group:'その他' },
    { id:'ticket', name:'チケット', group:'その他' }
  ],

  /* フォント (Google Fonts の family パラメータ) */
  FONTS: [
    { id:'noto',       name:'Noto Sans JP',        css:"'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif",          google:'Noto+Sans+JP:wght@500;700;900' },
    { id:'rounded',    name:'M PLUS Rounded 1c',   css:"'M PLUS Rounded 1c', 'Yu Gothic', 'Meiryo', sans-serif",     google:'M+PLUS+Rounded+1c:wght@500;700;800' },
    { id:'zenmaru',    name:'Zen Maru Gothic',     css:"'Zen Maru Gothic', 'Yu Gothic', 'Meiryo', sans-serif",       google:'Zen+Maru+Gothic:wght@500;700;900' },
    { id:'mincho',     name:'Shippori Mincho',     css:"'Shippori Mincho', 'Yu Mincho', 'MS PMincho', serif",        google:'Shippori+Mincho:wght@500;700;800' },
    { id:'orbitron',   name:'Orbitron',            css:"'Orbitron', 'Yu Gothic', 'Meiryo', sans-serif",              google:'Orbitron:wght@500;700;900' },
    { id:'sharetech',  name:'Share Tech Mono',     css:"'Share Tech Mono', 'Consolas', 'Yu Gothic', monospace",      google:'Share+Tech+Mono' },
    { id:'dot',        name:'DotGothic16',         css:"'DotGothic16', 'MS Gothic', 'Yu Gothic', monospace",         google:'DotGothic16' },
    { id:'fredoka',    name:'Fredoka',             css:"'Fredoka', 'Yu Gothic', 'Meiryo', sans-serif",               google:'Fredoka:wght@500;600;700' },
    { id:'oswald',     name:'Oswald',              css:"'Oswald', 'Yu Gothic', 'Meiryo', sans-serif",                google:'Oswald:wght@500;600;700' },
    { id:'bebas',      name:'Bebas Neue',          css:"'Bebas Neue', 'Yu Gothic', 'Meiryo', sans-serif",            google:'Bebas+Neue' },
    { id:'robotomono', name:'Roboto Mono',         css:"'Roboto Mono', 'Consolas', 'Yu Gothic', monospace",          google:'Roboto+Mono:wght@500;700' },
    { id:'yuji',       name:'Yuji Syuku',          css:"'Yuji Syuku', 'Yu Mincho', 'MS PMincho', serif",             google:'Yuji+Syuku' },
    { id:'dela',       name:'Dela Gothic One',     css:"'Dela Gothic One', 'Yu Gothic', 'Meiryo', sans-serif",       google:'Dela+Gothic+One' },
    { id:'klee',       name:'Klee One',            css:"'Klee One', 'Yu Gothic', 'Meiryo', sans-serif",              google:'Klee+One:wght@400;600' },
    { id:'nixie',      name:'Nixie One',           css:"'Nixie One', 'Yu Gothic', 'Meiryo', sans-serif",             google:'Nixie+One' },
    { id:'jost',       name:'Jost',                css:"'Jost', 'Yu Gothic', 'Meiryo', sans-serif",                google:'Jost:wght@200;300;500;700;900' },
    { id:'teko',       name:'Teko',                css:"'Teko', 'Yu Gothic', 'Meiryo', sans-serif",                google:'Teko:wght@500;600;700' },
    { id:'elite',      name:'Special Elite',       css:"'Special Elite', 'Courier New', 'Yu Mincho', 'MS PMincho', serif",    google:'Special+Elite' },
    { id:'stencil',    name:'Saira Stencil One',   css:"'Saira Stencil One', 'Yu Gothic', 'Meiryo', sans-serif",          google:'Saira+Stencil+One' }
  ],

  /* クエリ文字列 → 検証済みの完全な config オブジェクト (不正な値は既定値に) */
  parse: function (queryString) {
    var raw = {};
    var s = String(queryString == null ? '' : queryString).replace(/^[?#]/, '');
    if (s) {
      var pairs = s.split('&');
      for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        var eq = pairs[i].indexOf('=');
        var k = eq < 0 ? pairs[i] : pairs[i].slice(0, eq);
        var v = eq < 0 ? '' : pairs[i].slice(eq + 1);
        try { k = decodeURIComponent(k.replace(/\+/g, ' ')); v = decodeURIComponent(v.replace(/\+/g, ' ')); }
        catch (e) { continue; }
        raw[k] = v;
      }
    }
    var c = normalize(raw);
    c.t = parseT(raw.t);  // 開発用 (serialize の対象外)
    c.moon = parseMoon(raw.moon);  // 開発用: 月齢を固定 (0〜29.5、serialize の対象外)
    return c;
  },

  /* config → 既定値を省いたクエリ文字列 (先頭の ? なし) */
  serialize: function (config) {
    var D = window.ClockStudio.DEFAULTS;
    var c = normalize(config || {});
    var out = [];
    for (var k in D) {
      if (!D.hasOwnProperty(k)) continue;
      /* pad の既定は 12 時間表示のとき 0 (先頭ゼロなし)。既定と違うときだけ書く (h12=1&pad=1 は明示する) */
      var def = k === 'pad' ? padDefault(c) : D[k];
      if (String(c[k]) === String(def)) continue;
      out.push(k + '=' + encodeURIComponent(String(c[k])));
    }
    return out.join('&');
  },

  /* 無料版の制限を適用した config (有料版ではそのまま返す) */
  effective: function (config) {
    var CS = window.ClockStudio, D = CS.DEFAULTS;
    var c = {};
    for (var k in config) if (config.hasOwnProperty(k)) c[k] = config[k];
    if (CS.EDITION !== 'free') return c;
    var d = CS.design(c.d);
    if (!d || !d.free) c.d = 'plain';
    c.c1 = ''; c.c2 = ''; c.c3 = '';
    c.font = '';
    c.ol = 0; c.olc = D.olc;
    c.anim = 'none';
    return c;
  },

  /* EDITION==='free' かつ free でないデザインなら true */
  isLocked: function (designId) {
    var CS = window.ClockStudio;
    if (CS.EDITION !== 'free') return false;
    var d = CS.design(designId);
    if (d) return !d.free;
    for (var i = 0; i < CS.LOCKED_PREVIEW.length; i++) if (CS.LOCKED_PREVIEW[i].id === designId) return true;
    return false;
  },

  /* 補助: id からデザイン / フォント定義を引く (無ければ null) */
  design: function (id) {
    var a = window.ClockStudio.DESIGNS;
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  },
  font: function (id) {
    var a = window.ClockStudio.FONTS;
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }
};

/* ---------- 内部: 値の検証 ---------- */
var HEX = /^[0-9a-fA-F]{6}$/;

function oneOf(v, list, def) {
  v = v == null ? '' : String(v);
  return list.indexOf(v) >= 0 ? v : def;
}
function flag(v, def) {
  v = v == null ? '' : String(v);
  return v === '1' ? 1 : v === '0' ? 0 : def;
}
function intRange(v, min, max, def) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}
function hex(v, def) {
  v = v == null ? '' : String(v).replace(/^#/, '');
  return HEX.test(v) ? v.toLowerCase() : def;
}
function validTz(v) {
  v = v == null ? '' : String(v);
  if (!v || !/^[A-Za-z][A-Za-z0-9_+\-\/]{1,63}$/.test(v)) return '';
  try { new Intl.DateTimeFormat('en-US', { timeZone: v }); return v; }
  catch (e) { return ''; }
}
function cleanLabel(v) {
  v = v == null ? '' : String(v).replace(/[\u0000-\u001f\u007f]/g, '').replace(/^\s+|\s+$/g, '');
  var chars = Array.from ? Array.from(v) : v.split('');
  return chars.slice(0, 30).join('');
}
function parseT(v) {
  var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v == null ? '' : String(v));
  if (!m) return '';
  var h = +m[1], mi = +m[2], s = m[3] ? +m[3] : 0;
  if (h > 23 || mi > 59 || s > 59) return '';
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return p(h) + ':' + p(mi) + ':' + p(s);
}

function parseMoon(v) {
  if (v == null || v === '') return '';
  var n = parseFloat(v);
  if (isNaN(n) || n < 0 || n > 29.6) return '';
  return n;
}

/* 言語 id: i18n/lang.js があればその normalize (zh_tw → zh-TW、不正 → ja)。無い環境でも同じ規則で丸める */
function normLang(v, def) {
  var LG = window.ClockStudioLang;
  if (LG && LG.normalize) return LG.normalize(v);
  var s = String(v == null ? '' : v).replace(/_/g, '-').toLowerCase(), ids = ['ja', 'en', 'zh-TW'];
  for (var i = 0; i < ids.length; i++) if (ids[i].toLowerCase() === s) return ids[i];
  return def;
}

function padDefault(c) { return c.h12 ? 0 : window.ClockStudio.DEFAULTS.pad; }

function normalize(r) {
  var CS = window.ClockStudio, D = CS.DEFAULTS;
  var c = {};
  c.d     = CS.design(r.d) ? String(r.d) : D.d;
  c.lay   = oneOf(r.lay, ['v', 'vr', 'h', 'hr'], D.lay);
  c.h12   = flag(r.h12, D.h12);
  c.ap    = oneOf(r.ap, ['en', 'jp', 'off'], D.ap);
  c.sec   = flag(r.sec, D.sec);
  c.blink = flag(r.blink, D.blink);
  c.pad   = flag(r.pad, padDefault(c));   /* 未指定なら 24 時間表示=先頭ゼロあり / 12 時間表示=なし (9:05 PM) */
  c.date  = flag(r.date, D.date);
  c.df    = oneOf(r.df, ['jp', 'jpy', 'wareki', 'slash', 'dot', 'en'], D.df);
  c.label = cleanLabel(r.label);
  c.font  = (r.font && CS.font(String(r.font))) ? String(r.font) : '';
  c.c1    = hex(r.c1, '');
  c.c2    = hex(r.c2, '');
  c.c3    = hex(r.c3, '');
  c.size  = intRange(r.size, 30, 400, D.size);
  c.ol    = intRange(r.ol, 0, 8, D.ol);
  c.olc   = hex(r.olc, D.olc);
  c.sh    = flag(r.sh, D.sh);
  c.anim  = oneOf(r.anim, ['none', 'fade', 'slide', 'pop'], D.anim);
  c.ax    = oneOf(r.ax, ['l', 'c', 'r'], D.ax);
  c.ay    = oneOf(r.ay, ['t', 'm', 'b'], D.ay);
  c.tz    = validTz(r.tz);
  c.lang  = normLang(r.lang, D.lang);    /* 時計に出す言葉 (ja / en / zh-TW)。df / ap は言語で丸めず保持 (丸めは clock.html の描画時) */
  return c;
}

})();
