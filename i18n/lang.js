/*
 * きせかえ時計 Clock Studio — 言語辞書 (ja / en / zh-TW)
 * clock.html と settings.html の両方が <script src="i18n/lang.js"> で読み込む (clock-data.js の前でも後でもよい)。
 *
 * ※ このファイルは _dev\i18n\build-lang.js が _dev\i18n\src\ の部品から組み立てています。
 *    直接直してもかまいませんが、build-lang.js を流し直すと上書きされるので、直すなら src\ 側を。
 *
 * 構成:
 *   LANGS / DEFAULT          対応言語の一覧と既定 (ja)。言語を足すときは LANGS に 1 行足し、
 *                            clock・ui に同じキーのオブジェクトを足し、names の各語に訳を足す。
 *   detect(navLangs)         navigator.languages から言語 id を選ぶ
 *   normalize(id)            不正な id を DEFAULT に丸める (URL パラメータ lang= の検証用)
 *   clock[lang]              時計本体 (clock.html) が画面に出す語・日付書式・テンプレート
 *   formatDate / koyomi / ap / apPos / tplParts   clock[lang] から文字列や部品列を組み立てる補助関数
 *   names                    設定画面に出すデザイン名・系統名・配色名・色の名前 (en / zh-TW のみ。ja は clock-data.js の値)
 *   ui[lang]                 設定画面の全文言 (キーは英語 snake_case)
 *   t(lang, key, vars)       ui の文字列を引く。{name} 形式の置換。無ければ ja → key の順にフォールバック
 *
 * 方針:
 *   - 漢数字を使うデザイン (和風 / 短冊 / 金箔 / 筆文字 の日付、短冊の時刻) は全言語で漢数字のまま (作者の決定)。
 *   - OBS の画面上の語は OBS Studio 公式翻訳 (en-US / zh-TW ロケール) の表記に合わせる。
 *       Browser / Local file / URL / Width / Height / Sources / Properties / Refresh cache of current page
 *       瀏覽器 / 本機檔案 / 網址 / 寬度 / 高度 / 來源 / 屬性 / 更新當前頁面快取
 *   - zh-TW は台湾華語の語彙 (字型・影片・軟體・螢幕・預設・網址・直播 など)。
 *   - 文字列に HTML を含むのはキー名が _html で終わるもの (<b> のみ) だけ。それ以外は必ず textContent で使う。
 *   - OBS 内蔵ブラウザ (Chromium 103 相当) で動くよう ES5 で書く。
 */
(function () {
'use strict';

/* ---------- 内部: 漢数字 ---------- */
var KAN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/* 0〜99 は「十」を使う読み方 (十月三日)、100 以上は 1 けたずつ (民國一一五年) */
function kanNum(n) {
  n = Math.floor(n);
  if (n >= 100) return kanDigits(n);
  if (n < 10) return KAN[n];
  var t = Math.floor(n / 10), o = n % 10;
  return (t > 1 ? KAN[t] : '') + '十' + (o ? KAN[o] : '');
}
function kanDigits(n) { return String(n).split('').map(function (c) { return KAN[+c]; }).join(''); }
function p2(n) { return (n < 10 ? '0' : '') + n; }
function textPart(s) { return /^\s+$/.test(s) ? { text: ' ', space: true } : { text: s }; }

var WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var WD_EN_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var MON_EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* 英字の飾り書式 (slash / dot / en) はどの言語でも英字のまま */
var LATIN_DATES = {
  slash: '{Y}/{MM}/{DD} {wEn}',      /* 2026/10/03 Sat */
  dot:   '{Y}.{MM}.{DD} {WEN}',      /* 2026.10.03 SAT */
  en:    '{wEn}, {Mon} {D}'          /* Sat, Oct 3 */
};
var LATIN_KOYOMI = { slash: '{Y} / {MM}', dot: '{Y}.{MM}', en: '{MON} {Y}' };

var L = window.ClockStudioLang = {
  LANGS: [
    { id: 'ja',    name: '日本語',   htmlLang: 'ja' },
    { id: 'en',    name: 'English',  htmlLang: 'en' },
    { id: 'zh-TW', name: '繁體中文', htmlLang: 'zh-Hant-TW' }   /* <html lang> 用。繁体字の字形を選ばせる */
  ],
  DEFAULT: 'ja',
  STORE_KEY: 'clockStudio.lang.v1',   /* 設定画面の表示言語を localStorage に保存するキー (時計の lang とは別) */

  /* 有効な言語 id か */
  has: function (id) {
    for (var i = 0; i < L.LANGS.length; i++) if (L.LANGS[i].id === id) return true;
    return false;
  },
  /* URL パラメータなどの値を有効な id に丸める (大文字小文字・_ の違いは吸収: zh_tw → zh-TW)。不正なら DEFAULT */
  normalize: function (id) {
    var s = String(id == null ? '' : id).replace(/_/g, '-').toLowerCase();
    for (var i = 0; i < L.LANGS.length; i++) if (L.LANGS[i].id.toLowerCase() === s) return L.LANGS[i].id;
    return L.DEFAULT;
  },
  /*
   * navigator.languages (配列) または navigator.language (文字列) から言語 id を選ぶ。
   * 先頭から順に見て、最初に対応言語に当たったものを返す。どれにも当たらなければ 'en'。
   *   ja / ja-JP                                  → 'ja'
   *   zh-TW / zh-Hant(-*) / zh-HK / zh-MO          → 'zh-TW'
   *   zh / zh-CN / zh-SG / zh-Hans(-*)             → 当面は対応外として読み飛ばす (最後まで当たらなければ 'en')
   *   en / en-*                                   → 'en'
   *   それ以外 (ko, fr …)                          → 読み飛ばす (最後まで当たらなければ 'en')
   * zh-CN / ko を足すときは、ここに分岐を 1 行ずつ足す。
   */
  detect: function (navLangs) {
    var list = navLangs == null ? [] : (typeof navLangs === 'string' ? [navLangs] : navLangs);
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || '').toLowerCase().replace(/_/g, '-');
      if (!tag) continue;
      if (tag === 'ja' || tag.indexOf('ja-') === 0) return 'ja';
      if (tag.indexOf('zh-hant') === 0 || /^zh-(tw|hk|mo)(-|$)/.test(tag)) return 'zh-TW';
      if (tag === 'en' || tag.indexOf('en-') === 0) return 'en';
    }
    return 'en';
  },

  /* ================================================================
   * 時計本体 (clock.html) が使う語
   *   weekdaysShort : 括弧の中などに入る短い曜日 ({w})
   *   weekdaysMid   : 漢数字デザインの日付の後ろに付く曜日 ({W})
   *   weekdaysLong  : 日めくりの曜日 ({WL})
   *   ampm / apPos  : ap=jp (= その言語の言葉で) のときの語と位置。'pre' = 時刻の前、'post' = 後ろ
   *   ampmEn        : ap=en のときの AM/PM (全言語で英字・時刻の後ろ)
   *   apOptions     : 設定画面の「AM/PM の書き方」に出す選択肢 (en は jp を出さない)
   *   dfList / dfDefault : 設定画面の「日付の書き方」に出す書式 (並び順) と、その言語の既定。
   *                   URL の df が dfList に無くても date[df] で描く (古い URL・言語を変えた URL を壊さない)
   *   era           : 'wareki' (令和/平成) / 'minguo' (民國 = 西暦 - 1911) / null
   *   date          : 書式 id → テンプレート (トークンは fill の説明を参照)
   *   dateKan       : 漢数字デザイン (wafu / tanzaku / kinpaku / sumi) で jp / jpy / wareki のときのテンプレート
   *   koyomi        : 日めくり。mo = 書式ごとの「月」の行、wd = 曜日の行 (英字書式 slash/dot/en のときは wdLatin)
   *   kotoba        : 「ことば」デザイン。pre (前置き) + tpl (時刻部分) + end (結び)。
   *                   tpl のトークン {h} {m} {s} {ap}。[ ] の中は秒ありのときだけ出す。apText = {ap} に入る語。
   *                   12 時間表示で ap が off でなければ {ap} を出す (ja の現行動作: ap=en でも 午前/午後)
   *   progress      : 「進捗バー」。elapsed の {p} が <b>52%</b> になる。range は右側の小さな文字
   *   tanzaku       : 「短冊」の縦書き時刻 (漢数字のまま)。units = 時/分/秒、zero = 0 のときの字、ampm
   *   live / ticket : 英字の飾り (全言語で英字のまま。辞書に置くのは将来の差し替え用)
   *   moonAria      : 月あかりの月の aria-label ({n} = 月齢)
   * ================================================================ */
  clock: {
    ja: {
      weekdaysShort: ['日', '月', '火', '水', '木', '金', '土'],
      weekdaysMid:   ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      weekdaysLong:  ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
      ampm: { am: '午前', pm: '午後' }, apPos: 'pre',
      ampmEn: { am: 'AM', pm: 'PM' },
      apOptions: ['en', 'jp', 'off'],
      dfList: ['jp', 'jpy', 'wareki', 'slash', 'dot', 'en'], dfDefault: 'jp',
      era: 'wareki',
      date: {
        jp:     '{M}月{D}日({w})',            /* 10月3日(土) */
        jpy:    '{Y}年{M}月{D}日({w})',       /* 2026年10月3日(土) */
        wareki: '{era}{ey}年{M}月{D}日({w})', /* 令和8年10月3日(土) */
        slash: LATIN_DATES.slash, dot: LATIN_DATES.dot, en: LATIN_DATES.en
      },
      dateKan: {
        jp:     '{MK}月{DK}日 {W}',             /* 十月三日 土曜 */
        jpy:    '{YK}年{MK}月{DK}日 {W}',       /* 二〇二六年十月三日 土曜 */
        wareki: '{era}{eyK}年{MK}月{DK}日 {W}'  /* 令和八年十月三日 土曜 */
      },
      koyomi: {
        mo: { jp: '{M}月', jpy: '{Y}年 {M}月', wareki: '{era}{ey}年 {M}月',
              slash: LATIN_KOYOMI.slash, dot: LATIN_KOYOMI.dot, en: LATIN_KOYOMI.en },
        wd: '{WL}', wdLatin: '{WLEN}'          /* 土曜日 / SATURDAY */
      },
      kotoba: { pre: 'ただいま', tpl: '{ap}{h}時{m}分[{s}秒]', end: 'です', apText: { am: '午前', pm: '午後' } },
      progress: { elapsed: '今日は{p}経過', range: '0:00 → 24:00' },
      tanzaku: { units: ['時', '分', '秒'], zero: '零', ampm: { am: '午前', pm: '午後' } },
      live: 'LIVE',
      ticket: { admit: 'ADMIT ONE', kick: 'SHOWTIME', no: 'No.' },
      moonAria: '月齢 {n}'
    },
    en: {
      weekdaysShort: WD_EN,
      weekdaysMid:   WD_EN,
      weekdaysLong:  WD_EN_LONG,
      ampm: { am: 'AM', pm: 'PM' }, apPos: 'post',
      ampmEn: { am: 'AM', pm: 'PM' },
      apOptions: ['en', 'off'],
      dfList: ['en', 'jp', 'jpy', 'slash', 'dot'], dfDefault: 'en',
      era: null,
      date: {
        jp:     '{Mon} {D} ({w})',          /* Oct 3 (Sat) */
        jpy:    '{w}, {Mon} {D}, {Y}',      /* Sat, Oct 3, 2026 */
        wareki: '{w}, {Mon} {D}, {Y}',      /* en では選択肢に出さない。URL に残っていた場合は jpy と同じに */
        slash: LATIN_DATES.slash, dot: LATIN_DATES.dot, en: LATIN_DATES.en
      },
      /* 漢数字デザインは英語でも漢数字のまま (作者の決定)。ただし和文の曜日 (土曜) は英語話者に読めないので省く
       * (英字の Sat を混ぜると縦書きの短冊で崩れるため、短縮形ではなく省略で全漢数字デザインを揃える) */
      dateKan: {
        jp:     '{MK}月{DK}日',            /* 十月三日 */
        jpy:    '{YK}年{MK}月{DK}日',      /* 二〇二六年十月三日 */
        wareki: '{YK}年{MK}月{DK}日'
      },
      koyomi: {
        mo: { jp: '{MONTH}', jpy: '{MONTH} {Y}', wareki: '{MONTH} {Y}',
              slash: LATIN_KOYOMI.slash, dot: LATIN_KOYOMI.dot, en: LATIN_KOYOMI.en },
        wd: '{WLEN}', wdLatin: '{WLEN}'        /* OCTOBER 2026 / SATURDAY */
      },
      kotoba: { pre: "It's", tpl: '{h}:{m}[:{s}] {ap}', end: '', apText: { am: 'AM', pm: 'PM' } },
      progress: { elapsed: '{p} of today done', range: '0:00 → 24:00' },
      tanzaku: { units: ['時', '分', '秒'], zero: '零', ampm: { am: '午前', pm: '午後' } },
      live: 'LIVE',
      ticket: { admit: 'ADMIT ONE', kick: 'SHOWTIME', no: 'No.' },
      moonAria: 'Moon age {n} days'
    },
    'zh-TW': {
      weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'],
      weekdaysMid:   ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
      weekdaysLong:  ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
      ampm: { am: '上午', pm: '下午' }, apPos: 'pre',
      ampmEn: { am: 'AM', pm: 'PM' },
      apOptions: ['en', 'jp', 'off'],
      dfList: ['jp', 'jpy', 'wareki', 'slash', 'dot', 'en'], dfDefault: 'jp',
      era: 'minguo',
      date: {
        jp:     '{M}月{D}日({w})',            /* 10月3日(六) */
        jpy:    '{Y}年{M}月{D}日({w})',       /* 2026年10月3日(六) */
        wareki: '{era}{ey}年{M}月{D}日({w})', /* 民國115年10月3日(六) (台湾の民國紀年) */
        slash: LATIN_DATES.slash, dot: LATIN_DATES.dot, en: LATIN_DATES.en
      },
      dateKan: {
        jp:     '{MK}月{DK}日 {W}',             /* 十月三日 週六 */
        jpy:    '{YK}年{MK}月{DK}日 {W}',       /* 二〇二六年十月三日 週六 */
        wareki: '{era}{eyK}年{MK}月{DK}日 {W}'  /* 民國一一五年十月三日 週六 */
      },
      koyomi: {
        mo: { jp: '{M}月', jpy: '{Y}年 {M}月', wareki: '{era}{ey}年 {M}月',
              slash: LATIN_KOYOMI.slash, dot: LATIN_KOYOMI.dot, en: LATIN_KOYOMI.en },
        wd: '{WL}', wdLatin: '{WLEN}'          /* 星期六 / SATURDAY */
      },
      kotoba: { pre: '現在是', tpl: '{ap}{h}點{m}分[{s}秒]', end: '', apText: { am: '上午', pm: '下午' } },
      progress: { elapsed: '今天已過 {p}', range: '0:00 → 24:00' },
      tanzaku: { units: ['時', '分', '秒'], zero: '零', ampm: { am: '上午', pm: '下午' } },
      live: 'LIVE',
      ticket: { admit: 'ADMIT ONE', kick: 'SHOWTIME', no: 'No.' },
      moonAria: '月齡 {n}'
    }
  },

  /* 指定言語の clock 辞書 (無ければ ja) */
  C: function (lang) { return L.clock[lang] || L.clock[L.DEFAULT]; },

  /* 英字書式か (日めくりの曜日を英字にする判定) */
  isLatinDf: function (df) { return df === 'slash' || df === 'dot' || df === 'en'; },

  /*
   * テンプレートを日付で埋める。t = { y, mo, d, wd } (wd: 0=日曜)
   * トークン:
   *   {Y} 2026  {YK} 二〇二六  {M} 10  {MM} 10 (2けた)  {MK} 十  {D} 3  {DD} 03  {DK} 三
   *   {w} 短い曜日  {W} 中くらいの曜日  {Wja} 日本語の「土曜」  {WL} 長い曜日
   *   {wEn} Sat  {WEN} SAT  {WLEN} SATURDAY  {Mon} Oct  {MON} OCT  {Month} October  {MONTH} OCTOBER
   *   {era} 令和 / 平成 / 民國  {ey} 8 (1 年は「元」)  {eyK} 八 / 一一五
   */
  fill: function (lang, tpl, t) {
    var c = L.C(lang), era = L.era(lang, t);
    var map = {
      Y: t.y, YK: kanDigits(t.y), M: t.mo, MM: p2(t.mo), MK: kanNum(t.mo), D: t.d, DD: p2(t.d), DK: kanNum(t.d),
      w: c.weekdaysShort[t.wd], W: c.weekdaysMid[t.wd], Wja: L.clock.ja.weekdaysMid[t.wd], WL: c.weekdaysLong[t.wd],
      wEn: WD_EN[t.wd], WEN: WD_EN[t.wd].toUpperCase(), WLEN: WD_EN_LONG[t.wd].toUpperCase(),
      Mon: MON_EN[t.mo - 1], MON: MON_EN[t.mo - 1].toUpperCase(),
      Month: MON_EN_LONG[t.mo - 1], MONTH: MON_EN_LONG[t.mo - 1].toUpperCase(),
      era: era ? era.name : '', ey: era ? era.ey : '', eyK: era ? era.eyK : ''
    };
    return String(tpl).replace(/\{([A-Za-z]+)\}/g, function (m, k) { return map.hasOwnProperty(k) ? String(map[k]) : m; });
  },
  /* 紀年: 和暦 (令和 = 2019年5月〜、それより前は平成) / 民國 (西暦 - 1911)。どちらも 1 年は「元」 */
  era: function (lang, t) {
    var kind = L.C(lang).era;
    if (kind === 'wareki') {
      var name = '令和', ey = t.y - 2018;
      if (t.y < 2019 || (t.y === 2019 && t.mo < 5)) { name = '平成'; ey = t.y - 1988; }
      return { name: name, ey: ey === 1 ? '元' : ey, eyK: ey === 1 ? '元' : kanNum(ey) };
    }
    if (kind === 'minguo') {
      var my = t.y - 1911;
      return { name: '民國', ey: my === 1 ? '元' : my, eyK: my === 1 ? '元' : kanNum(my) };
    }
    return null;
  },
  /* 日付の文字列。kan = 漢数字デザインか (jp / jpy / wareki のときだけ dateKan を使う) */
  formatDate: function (lang, df, t, kan) {
    var c = L.C(lang);
    var tpl = (kan && c.dateKan && c.dateKan[df]) || c.date[df] || c.date[c.dfDefault];
    return L.fill(lang, tpl, t);
  },
  /* 設定画面の「日付の書き方」ボタンの表示例 (2026年10月3日 土曜 = clock.html の t= 固定時と同じ日) */
  SAMPLE_DATE: { y: 2026, mo: 10, d: 3, wd: 6 },
  dateExample: function (lang, df) { return L.formatDate(lang, df, L.SAMPLE_DATE, false); },
  /* 日めくりの 2 行: { mo: '10月', wd: '土曜日' } */
  koyomi: function (lang, df, t) {
    var k = L.C(lang).koyomi;
    return { mo: L.fill(lang, k.mo[df] || k.mo.jp, t), wd: L.fill(lang, L.isLatinDf(df) ? k.wdLatin : k.wd, t) };
  },
  /* 午前/午後の語。ap = 'en' | 'jp' | 'off'、pm = true/false。off なら '' */
  ap: function (lang, ap, pm) {
    if (ap === 'off') return '';
    var c = L.C(lang), w = ap === 'jp' ? c.ampm : c.ampmEn;
    return pm ? w.pm : w.am;
  },
  /* AM/PM の位置: 'pre' (時刻の前) / 'post' (後ろ)。ap=en は全言語で後ろ */
  apPos: function (lang, ap) { return ap === 'jp' ? L.C(lang).apPos : 'post'; },
  /*
   * kotoba.tpl などのテンプレートを部品列に分解する。
   *   opts.sec = 秒を出すか ([ ] の中を残すか) / opts.ap = AM/PM を出すか ({ap} を残すか)
   * 例 (ja, 秒あり, ap あり): [{k:'ap'}, {k:'h'}, {text:'時'}, {k:'m'}, {text:'分'}, {k:'s'}, {text:'秒'}]
   * 例 (en, 秒なし, ap あり): [{k:'h'}, {text:':'}, {k:'m'}, {text:' ', space:true}, {k:'ap'}]
   * {ap} を消したときに前後に残る空白は詰める。空白だけの部品は { text:' ', space:true }。
   */
  tplParts: function (tpl, opts) {
    opts = opts || {};
    var s = String(tpl).replace(/\[([^\]]*)\]/g, function (m, inner) { return opts.sec ? inner : ''; });
    if (!opts.ap) s = s.replace(/\s*\{ap\}\s*/g, ' ').replace(/^\s+|\s+$/g, '');
    var out = [], re = /\{(h|m|s|ap)\}/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(textPart(s.slice(last, m.index)));
      out.push({ k: m[1] });
      last = re.lastIndex;
    }
    if (last < s.length) out.push(textPart(s.slice(last)));
    return out;
  },

  /* ================================================================
   * 設定画面に出す名前 (en / zh-TW)。ja は clock-data.js の name / group / colorLabels / palettes[].name をそのまま使う。
   * 引くときは補助関数を使う (訳が無ければ ja の元の語を返す):
   *   designName(lang, design)            design = clock-data.js の DESIGNS / LOCKED_PREVIEW の要素 ({id, name})
   *   groupName(lang, 'ゲーミング')
   *   colorLabel(lang, '文字')
   *   paletteName(lang, 'plain', 'さくら')
   * 有料デザインの名前も無料版にそのまま残してよい (LOCKED_PREVIEW の鍵つきカードで使うため)。
   * ================================================================ */
  names: {
    designs: {
      plain:      { en: 'Plain',          'zh-TW': '基本' },
      underline:  { en: 'Underline',      'zh-TW': '底線' },
      pill:       { en: 'Pill',           'zh-TW': '膠囊' },
      glass:      { en: 'Glass',          'zh-TW': '玻璃' },
      outline:    { en: 'Outline',        'zh-TW': '空心字' },
      bar:        { en: 'Side Bar',       'zh-TW': '側邊條' },
      split:      { en: 'Two-Line',       'zh-TW': '雙行' },
      caption:    { en: 'Caption',        'zh-TW': '字卡' },
      neon:       { en: 'Neon',           'zh-TW': '霓虹' },
      cyber:      { en: 'Cyber',          'zh-TW': '賽博' },
      glitch:     { en: 'Glitch',         'zh-TW': '故障風' },
      rgb:        { en: 'RGB Wave',       'zh-TW': 'RGB 波浪' },
      hud:        { en: 'HUD',            'zh-TW': 'HUD' },
      hologram:   { en: 'Hologram',       'zh-TW': '全像' },
      esports:    { en: 'Esports',        'zh-TW': '電競' },
      synthwave:  { en: 'Synthwave',      'zh-TW': '合成波' },
      matrix:     { en: 'Matrix',         'zh-TW': '數位雨' },
      seg7:       { en: '7-Segment',      'zh-TW': '七段顯示' },
      flip:       { en: 'Flip',           'zh-TW': '翻頁鐘' },
      terminal:   { en: 'Terminal',       'zh-TW': '終端機' },
      pixel:      { en: 'RPG Window',     'zh-TW': 'RPG 視窗' },
      nixie:      { en: 'Nixie Tube',     'zh-TW': '輝光管' },
      lcd:        { en: 'LCD',            'zh-TW': '液晶' },
      led:        { en: 'LED Board',      'zh-TW': 'LED 看板' },
      vfd:        { en: 'VFD',            'zh-TW': '螢光顯示管' },
      ticker:     { en: 'News',           'zh-TW': '新聞' },
      variety:    { en: 'Variety Show',   'zh-TW': '綜藝字幕' },
      live:       { en: 'Live',           'zh-TW': 'LIVE' },
      weather:    { en: 'Weather',        'zh-TW': '氣象' },
      pastel:     { en: 'Pastel',         'zh-TW': '粉彩' },
      pop:        { en: 'Pop',            'zh-TW': '普普風' },
      sticker:    { en: 'Sticker',        'zh-TW': '貼紙' },
      neko:       { en: 'Kitty',          'zh-TW': '貓咪' },
      fusen:      { en: 'Sticky Note',    'zh-TW': '便利貼' },
      cloud:      { en: 'Cloud',          'zh-TW': '雲朵' },
      ribbon:     { en: 'Ribbon',         'zh-TW': '緞帶' },
      wafu:       { en: 'Wafu',           'zh-TW': '和風' },
      tanzaku:    { en: 'Tanzaku',        'zh-TW': '短冊' },
      koyomi:     { en: 'Daily Calendar', 'zh-TW': '日曆' },
      kinpaku:    { en: 'Gold Leaf',      'zh-TW': '金箔' },
      tsuki:      { en: 'Moonlight',      'zh-TW': '月光' },
      sumi:       { en: 'Brush',          'zh-TW': '毛筆' },
      sakura:     { en: 'Sakura',         'zh-TW': '櫻花' },
      hanabi:     { en: 'Fireworks',      'zh-TW': '煙火' },
      momiji:     { en: 'Autumn Leaves',  'zh-TW': '楓葉' },
      yuki:       { en: 'Snow',           'zh-TW': '雪' },
      halloween:  { en: 'Halloween',      'zh-TW': '萬聖節' },
      xmas:       { en: 'Christmas',      'zh-TW': '聖誕節' },
      ring:       { en: 'Ring',           'zh-TW': '圓環' },
      analog:     { en: 'Analog',         'zh-TW': '指針' },
      analogdark: { en: 'Analog (Dark)',  'zh-TW': '指針 (黑)' },
      roman:      { en: 'Roman Numerals', 'zh-TW': '羅馬數字' },
      chalk:      { en: 'Chalkboard',     'zh-TW': '黑板' },
      binary:     { en: 'Binary',         'zh-TW': '二進位' },
      kotoba:     { en: 'Speech Bubble',  'zh-TW': '對話框' },
      progress:   { en: 'Progress Bar',   'zh-TW': '進度條' },
      ticket:     { en: 'Ticket',         'zh-TW': '票券' },
      typewriter: { en: 'Typewriter',    'zh-TW': '打字機' },
      hairline:   { en: 'Hairline',      'zh-TW': '極細' },
      badge:      { en: 'Round Badge',   'zh-TW': '圓形徽章' },
      stack:      { en: 'Stacked',       'zh-TW': '三段' },
      bracket:    { en: 'Brackets',      'zh-TW': '方括號' },
      scoreboard: { en: 'Scoreboard',    'zh-TW': '記分板' },
      milspec:    { en: 'Mil-Spec',      'zh-TW': '軍規' },
      circuit:    { en: 'Circuit Board', 'zh-TW': '電路板' },
      hazard:     { en: 'Caution Tape',  'zh-TW': '警示帶' },
      rank:       { en: 'Rank Badge',    'zh-TW': '段位徽章' },
      carbon:     { en: 'Carbon',        'zh-TW': '碳纖維' },
      vhs:        { en: 'VHS',           'zh-TW': 'VHS' },
      cassette:   { en: 'Cassette',      'zh-TW': '卡帶' },
      arcade:     { en: 'Arcade',        'zh-TW': '街機' },
      marquee:    { en: 'Marquee',       'zh-TW': '燈泡招牌' },
      pager:      { en: 'Pager',         'zh-TW': '呼叫器' },
      typepaper:  { en: 'Typed Page',    'zh-TW': '打字稿' },
      quiz:       { en: 'Quiz Show',     'zh-TW': '益智節目' },
      sports:     { en: 'Sports',        'zh-TW': '體育轉播' },
      subtitle:   { en: 'Subtitles',     'zh-TW': '字幕' },
      lowerthird: { en: 'Lower Third',   'zh-TW': '名條' },
      docu:       { en: 'Documentary',   'zh-TW': '紀錄片' },
      candy:      { en: 'Candy',          'zh-TW': '糖果' },
      bear:       { en: 'Bear',           'zh-TW': '小熊' },
      bunny:      { en: 'Bunny',          'zh-TW': '兔兔' },
      heart:      { en: 'Heart',          'zh-TW': '愛心' },
      balloon:    { en: 'Balloon',        'zh-TW': '氣球' },
      yumekawa:   { en: 'Dreamy Pastel',  'zh-TW': '夢幻可愛' },
      asanoha:    { en: 'Hemp Leaf',      'zh-TW': '麻葉紋' },
      nami:       { en: 'Waves',          'zh-TW': '青海波' },
      shoji:      { en: 'Shoji Screen',   'zh-TW': '紙拉門' },
      ema:        { en: 'Ema Plaque',     'zh-TW': '繪馬' },
      chochin:    { en: 'Lantern',        'zh-TW': '燈籠' },
      tsuyu:      { en: 'Rainy Season',   'zh-TW': '梅雨' },
      umi:        { en: 'Summer Sea',     'zh-TW': '夏日海洋' },
      kingyo:     { en: 'Goldfish',       'zh-TW': '金魚' },
      tsukimi:    { en: 'Moon Viewing',   'zh-TW': '賞月' },
      valentine:  { en: "Valentine's",    'zh-TW': '情人節' },
      newyear:    { en: 'New Year',       'zh-TW': '新年' },
      handsonly:  { en: 'Hands Only',     'zh-TW': '只有指針' },
      neonanalog: { en: 'Neon Analog',    'zh-TW': '霓虹指針' },
      wood:       { en: 'Wooden',         'zh-TW': '木製' },
      station:    { en: 'Station Clock',  'zh-TW': '車站時鐘' }
    },
    groups: {
      'シンプル':   { en: 'Simple',   'zh-TW': '簡約' },
      'ゲーミング': { en: 'Gaming',   'zh-TW': '電競' },
      'レトロ':     { en: 'Retro',    'zh-TW': '復古' },
      '番組風':     { en: 'TV Style', 'zh-TW': '節目風' },
      'かわいい':   { en: 'Cute',     'zh-TW': '可愛' },
      '和':         { en: 'Japanese', 'zh-TW': '日式' },
      '季節':       { en: 'Seasonal', 'zh-TW': '季節' },
      'アナログ':   { en: 'Analog',   'zh-TW': '指針' },
      'その他':     { en: 'Other',    'zh-TW': '其他' }
    },
    /* 色の名前 (clock-data.js の colorLabels に出てくる語すべて。デザインをまたいで同じ語は同じ訳) */
    colorLabels: {
      '文字':               { en: 'Text',                   'zh-TW': '文字' },
      '影':                 { en: 'Shadow',                 'zh-TW': '陰影' },
      'ライン':             { en: 'Line',                   'zh-TW': '線條' },
      'プレート':           { en: 'Plate',                  'zh-TW': '底板' },
      '日付':               { en: 'Date',                   'zh-TW': '日期' },
      'ガラスの色':         { en: 'Glass tint',             'zh-TW': '玻璃色' },
      '線':                 { en: 'Stroke',                 'zh-TW': '線條' },
      'バー':               { en: 'Bar',                    'zh-TW': '側條' },
      '時':                 { en: 'Hours',                  'zh-TW': '時' },
      '分・線':             { en: 'Minutes & line',         'zh-TW': '分・線條' },
      'キャプション・罫線': { en: 'Caption & rules',        'zh-TW': '字卡・格線' },
      '時刻の光':           { en: 'Time glow',              'zh-TW': '時間光暈' },
      '日付の光':           { en: 'Date glow',              'zh-TW': '日期光暈' },
      '芯の色':             { en: 'Core',                   'zh-TW': '核心色' },
      '枠・ブラケット':     { en: 'Frame & brackets',       'zh-TW': '外框・括號' },
      'ずれ色1':            { en: 'Offset color 1',         'zh-TW': '錯位色 1' },
      'ずれ色2':            { en: 'Offset color 2',         'zh-TW': '錯位色 2' },
      '色1':                { en: 'Color 1',                'zh-TW': '顏色 1' },
      '色2':                { en: 'Color 2',                'zh-TW': '顏色 2' },
      '色3':                { en: 'Color 3',                'zh-TW': '顏色 3' },
      'ライン・秒':         { en: 'Lines & seconds',        'zh-TW': '線條・秒' },
      '光':                 { en: 'Glow',                   'zh-TW': '光' },
      'アクセント':         { en: 'Accent',                 'zh-TW': '強調色' },
      'パネル':             { en: 'Panel',                  'zh-TW': '面板' },
      'ネオン・グリッド':   { en: 'Neon & grid',            'zh-TW': '霓虹・網格' },
      '夕日':               { en: 'Sun',                    'zh-TW': '夕陽' },
      '夜空':               { en: 'Night sky',              'zh-TW': '夜空' },
      '画面':               { en: 'Screen',                 'zh-TW': '螢幕' },
      '文字の雨':           { en: 'Code rain',              'zh-TW': '文字雨' },
      '点灯色':             { en: 'Lit color',              'zh-TW': '點亮色' },
      '数字':               { en: 'Digits',                 'zh-TW': '數字' },
      'カード':             { en: 'Cards',                  'zh-TW': '卡片' },
      '文字・枠':           { en: 'Text & frame',           'zh-TW': '文字・外框' },
      'ウィンドウ':         { en: 'Window',                 'zh-TW': '視窗' },
      '影・外枠':           { en: 'Shadow & border',        'zh-TW': '陰影・外框' },
      '発光':               { en: 'Glow',                   'zh-TW': '發光' },
      '管のガラス':         { en: 'Tube glass',             'zh-TW': '燈管玻璃' },
      '液晶':               { en: 'LCD',                    'zh-TW': '液晶' },
      'フレーム':           { en: 'Frame',                  'zh-TW': '外框' },
      'ガラス':             { en: 'Glass',                  'zh-TW': '玻璃' },
      'インジケーター':     { en: 'Indicators',             'zh-TW': '指示燈' },
      '帯':                 { en: 'Band',                   'zh-TW': '橫條' },
      'グラデ上':           { en: 'Gradient top',           'zh-TW': '漸層 (上)' },
      'グラデ下':           { en: 'Gradient bottom',        'zh-TW': '漸層 (下)' },
      'フチ':               { en: 'Outline',                'zh-TW': '外框' },
      '空色':               { en: 'Sky',                    'zh-TW': '天空' },
      'グラデ1':            { en: 'Gradient 1',             'zh-TW': '漸層 1' },
      'グラデ2':            { en: 'Gradient 2',             'zh-TW': '漸層 2' },
      'シール':             { en: 'Sticker',                'zh-TW': '貼紙' },
      '日付シール':         { en: 'Date sticker',           'zh-TW': '日期貼紙' },
      '耳・肉球':           { en: 'Ears & paws',            'zh-TW': '耳朵・肉球' },
      '文字・線':           { en: 'Text & lines',           'zh-TW': '文字・線條' },
      '付箋':               { en: 'Note',                   'zh-TW': '便利貼' },
      '赤ペン':             { en: 'Red pen',                'zh-TW': '紅筆' },
      'くも':               { en: 'Cloud',                  'zh-TW': '雲朵' },
      'リボン':             { en: 'Ribbon',                 'zh-TW': '緞帶' },
      '和紙':               { en: 'Washi paper',            'zh-TW': '和紙' },
      '朱 (落款)':          { en: 'Vermilion (seal)',       'zh-TW': '朱紅 (落款)' },
      '墨 (文字)':          { en: 'Ink (text)',             'zh-TW': '墨 (文字)' },
      '短冊':               { en: 'Card',                   'zh-TW': '短冊' },
      '紐・ぼかし':         { en: 'String & glow',          'zh-TW': '繩子・暈染' },
      '紙':                 { en: 'Paper',                  'zh-TW': '紙' },
      '綴じ・日曜':         { en: 'Binding & Sunday',       'zh-TW': '裝訂・週日' },
      '金 (文字)':          { en: 'Gold (text)',            'zh-TW': '金 (文字)' },
      '地':                 { en: 'Background',             'zh-TW': '底色' },
      '枠':                 { en: 'Frame',                  'zh-TW': '外框' },
      '月・星':             { en: 'Moon & stars',           'zh-TW': '月亮・星星' },
      '墨':                 { en: 'Ink',                    'zh-TW': '墨' },
      '和紙の帯':           { en: 'Washi band',             'zh-TW': '和紙帶' },
      '花びら':             { en: 'Petals',                 'zh-TW': '花瓣' },
      '花火1・日付':        { en: 'Firework 1 & date',      'zh-TW': '煙火 1・日期' },
      '花火2':              { en: 'Firework 2',             'zh-TW': '煙火 2' },
      '葉':                 { en: 'Leaves',                 'zh-TW': '葉子' },
      '結晶・日付':         { en: 'Snowflakes & date',      'zh-TW': '雪花・日期' },
      'かぼちゃ・文字':     { en: 'Pumpkin & text',         'zh-TW': '南瓜・文字' },
      '灯り・日付':         { en: 'Light & date',           'zh-TW': '燈光・日期' },
      '赤 (実・電球)':      { en: 'Red (berries & bulbs)',  'zh-TW': '紅 (果實・燈泡)' },
      '緑 (地)':            { en: 'Green (background)',     'zh-TW': '綠 (底色)' },
      '金 (縁・日付)':      { en: 'Gold (rim & date)',      'zh-TW': '金 (邊框・日期)' },
      'リング':             { en: 'Ring',                   'zh-TW': '圓環' },
      '盤面':               { en: 'Dial',                   'zh-TW': '錶盤' },
      '針・目盛':           { en: 'Hands & ticks',          'zh-TW': '指針・刻度' },
      '秒針':               { en: 'Second hand',            'zh-TW': '秒針' },
      '数字・針':           { en: 'Numerals & hands',       'zh-TW': '數字・指針' },
      '縁 (真鍮)':          { en: 'Rim (brass)',            'zh-TW': '邊框 (黃銅)' },
      'チョーク':           { en: 'Chalk',                  'zh-TW': '粉筆' },
      '黒板':               { en: 'Board',                  'zh-TW': '黑板' },
      '木枠':               { en: 'Wood frame',             'zh-TW': '木框' },
      '吹き出し':           { en: 'Bubble',                 'zh-TW': '對話框' },
      '文字・フチ':         { en: 'Text & outline',         'zh-TW': '文字・外框' },
      '本券':               { en: 'Ticket',                 'zh-TW': '主票' },
      '半券':               { en: 'Stub',                   'zh-TW': '票根' },
      'カーソル':             { en: 'Cursor',                'zh-TW': '游標' },
      '罫線':               { en: 'Rule',                  'zh-TW': '格線' },
      '縁・秒':              { en: 'Rim & seconds',         'zh-TW': '邊框・秒' },
      '単位・線':             { en: 'Units & line',          'zh-TW': '單位・線條' },
      '括弧':               { en: 'Brackets',              'zh-TW': '括號' },
      '左チーム':             { en: 'Left team',             'zh-TW': '左隊' },
      '右チーム':             { en: 'Right team',            'zh-TW': '右隊' },
      '文字 (塗装)':          { en: 'Text (paint)',          'zh-TW': '文字 (塗裝)' },
      '刻印':               { en: 'Stamping',              'zh-TW': '刻印' },
      '基板':               { en: 'Board',                 'zh-TW': '電路板' },
      '配線':               { en: 'Traces',                'zh-TW': '線路' },
      'ストライプ':            { en: 'Stripes',               'zh-TW': '條紋' },
      '縁 (金属)':           { en: 'Rim (metal)',           'zh-TW': '邊框 (金屬)' },
      'ステッチ':             { en: 'Stitching',             'zh-TW': '車縫線' },
      '録画マーク':            { en: 'REC mark',              'zh-TW': '錄影標記' },
      'ラベル':              { en: 'Label',                 'zh-TW': '標籤' },
      '本体':               { en: 'Body',                  'zh-TW': '機身' },
      '見出し':              { en: 'Headings',              'zh-TW': '標題' },
      '電球・文字':            { en: 'Bulbs & text',          'zh-TW': '燈泡・文字' },
      '板':                { en: 'Board',                 'zh-TW': '看板' },
      '縁':                { en: 'Rim',                   'zh-TW': '邊框' },
      '黒インク':             { en: 'Black ink',             'zh-TW': '黑墨水' },
      '赤インク':             { en: 'Red ink',               'zh-TW': '紅墨水' },
      'マーク・日付':           { en: 'Mark & date',           'zh-TW': '標記・日期' },
      '文字・上段':            { en: 'Text & top row',        'zh-TW': '文字・上排' },
      '罫線・キャプション':        { en: 'Rule & caption',        'zh-TW': '格線・說明文字' },
      '毛':                 { en: 'Fur',                   'zh-TW': '毛色' },
      'マズル・耳':             { en: 'Muzzle & ears',         'zh-TW': '口鼻・耳朵' },
      '耳の内側':              { en: 'Inner ears',            'zh-TW': '耳朵內側' },
      'ハート':               { en: 'Heart',                 'zh-TW': '愛心' },
      '縁・日付':              { en: 'Rim & date',            'zh-TW': '邊框・日期' },
      '風船':                { en: 'Balloon',               'zh-TW': '氣球' },
      '紐':                 { en: 'String',                'zh-TW': '繩子' },
      'グラデ3':              { en: 'Gradient 3',            'zh-TW': '漸層 3' },
      '模様':                { en: 'Pattern',               'zh-TW': '花紋' },
      '波':                 { en: 'Waves',                 'zh-TW': '波紋' },
      '桟':                 { en: 'Frame bars',            'zh-TW': '木格' },
      '木':                 { en: 'Wood',                  'zh-TW': '木頭' },
      '提灯':                { en: 'Lantern',               'zh-TW': '燈籠' },
      'あじさい':              { en: 'Hydrangea',             'zh-TW': '繡球花' },
      '海':                 { en: 'Sea',                   'zh-TW': '海' },
      '太陽':                { en: 'Sun',                   'zh-TW': '太陽' },
      '水':                 { en: 'Water',                 'zh-TW': '水' },
      '金魚':                { en: 'Goldfish',              'zh-TW': '金魚' },
      '月':                 { en: 'Moon',                  'zh-TW': '月亮' },
      'チョコ':               { en: 'Chocolate',             'zh-TW': '巧克力' },
      '赤 (文字・梅)':          { en: 'Red (text & plum)',     'zh-TW': '紅 (文字・梅花)' },
      '金':                 { en: 'Gold',                  'zh-TW': '金' },
      '針':                 { en: 'Hands',                 'zh-TW': '指針' },
      'リング・秒針':            { en: 'Ring & second hand',    'zh-TW': '圓環・秒針' },
      '枠・針':               { en: 'Frame & hands',         'zh-TW': '外框・指針' }
    },
    /* おすすめ配色の名前 (デザイン id → 配色名 → 訳)。_dev\i18n\palette-words.js の語の表から生成 */
    palettes: {
      plain: {
        'さくら': { en: 'Sakura', 'zh-TW': '櫻花' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'レモン': { en: 'Lemon', 'zh-TW': '檸檬' },
        '空色': { en: 'Sky Blue', 'zh-TW': '天藍' }
      },
      underline: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        '夕焼け': { en: 'Sunset Glow', 'zh-TW': '晚霞' }
      },
      pill: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        '白プレート': { en: 'White Plate', 'zh-TW': '白底板' },
        '森': { en: 'Forest', 'zh-TW': '森林' },
        'すみれ': { en: 'Viola', 'zh-TW': '堇花' }
      },
      glass: {
        'ローズ': { en: 'Rose', 'zh-TW': '玫瑰' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        '琥珀': { en: 'Amber', 'zh-TW': '琥珀' },
        '群青': { en: 'Ultramarine', 'zh-TW': '群青' }
      },
      outline: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        '黒線': { en: 'Black Line', 'zh-TW': '黑線' }
      },
      bar: {
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' },
        'バイオレット': { en: 'Violet', 'zh-TW': '紫羅蘭' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' }
      },
      split: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' }
      },
      caption: {
        'アイス': { en: 'Ice', 'zh-TW': '冰藍' },
        'ローズ': { en: 'Rose', 'zh-TW': '玫瑰' },
        '墨': { en: 'Ink', 'zh-TW': '墨色' },
        'セピア': { en: 'Sepia', 'zh-TW': '復古棕' }
      },
      typewriter: {
        '黒インク': { en: 'Black Ink', 'zh-TW': '黑墨水' },
        '赤インク': { en: 'Red Ink', 'zh-TW': '紅墨水' },
        '青インク': { en: 'Blue Ink', 'zh-TW': '藍墨水' },
        'セピア': { en: 'Sepia', 'zh-TW': '復古棕' }
      },
      hairline: {
        '墨': { en: 'Ink', 'zh-TW': '墨色' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' },
        'アイス': { en: 'Ice', 'zh-TW': '冰藍' },
        'ローズ': { en: 'Rose', 'zh-TW': '玫瑰' }
      },
      badge: {
        '白バッジ': { en: 'White Badge', 'zh-TW': '白徽章' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      stack: {
        '墨': { en: 'Ink', 'zh-TW': '墨色' },
        'ライム': { en: 'Lime', 'zh-TW': '萊姆綠' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' }
      },
      bracket: {
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        '黒': { en: 'Black', 'zh-TW': '黑色' },
        'ライム': { en: 'Lime', 'zh-TW': '萊姆綠' }
      },
      neon: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      cyber: {
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        '白プレート': { en: 'White Plate', 'zh-TW': '白底板' }
      },
      glitch: {
        'マゼンタ': { en: 'Magenta', 'zh-TW': '洋紅' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'バイオレット': { en: 'Violet', 'zh-TW': '紫羅蘭' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' }
      },
      rgb: {
        'サンセット': { en: 'Sunset', 'zh-TW': '日落' },
        'オーロラ': { en: 'Aurora', 'zh-TW': '極光' },
        'パステル': { en: 'Pastel', 'zh-TW': '粉彩' },
        'トリコロール': { en: 'Tricolor', 'zh-TW': '三色' }
      },
      hud: {
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      hologram: {
        'マゼンタ': { en: 'Magenta', 'zh-TW': '洋紅' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' }
      },
      esports: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' },
        '白パネル': { en: 'White Panel', 'zh-TW': '白面板' }
      },
      synthwave: {
        'サイバー': { en: 'Cyber', 'zh-TW': '賽博' },
        'サンセット': { en: 'Sunset', 'zh-TW': '日落' },
        'ドリーム': { en: 'Dream', 'zh-TW': '夢幻' },
        'トキシック': { en: 'Toxic', 'zh-TW': '毒液' }
      },
      matrix: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'モノクロ': { en: 'Monochrome', 'zh-TW': '黑白' }
      },
      scoreboard: {
        '青×黄': { en: 'Blue & Yellow', 'zh-TW': '藍×黃' },
        '緑×紫': { en: 'Green & Purple', 'zh-TW': '綠×紫' },
        'ピンク×シアン': { en: 'Pink & Cyan', 'zh-TW': '粉紅×青' },
        '金文字': { en: 'Gold Text', 'zh-TW': '金字' },
        'モノクロ': { en: 'Monochrome', 'zh-TW': '黑白' }
      },
      milspec: {
        'デザート': { en: 'Desert', 'zh-TW': '沙漠' },
        'ネイビー': { en: 'Navy', 'zh-TW': '海軍藍' },
        '黒': { en: 'Black', 'zh-TW': '黑色' },
        'アーバン': { en: 'Urban', 'zh-TW': '都市迷彩' }
      },
      circuit: {
        '青基板': { en: 'Blue PCB', 'zh-TW': '藍色電路板' },
        '黒基板': { en: 'Black PCB', 'zh-TW': '黑色電路板' },
        '赤基板': { en: 'Red PCB', 'zh-TW': '紅色電路板' },
        '白基板': { en: 'White PCB', 'zh-TW': '白色電路板' }
      },
      hazard: {
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' }
      },
      rank: {
        'シルバー': { en: 'Silver', 'zh-TW': '銀色' },
        'ブロンズ': { en: 'Bronze', 'zh-TW': '青銅' },
        'ダイヤ': { en: 'Diamond', 'zh-TW': '鑽石' },
        '白金': { en: 'Platinum', 'zh-TW': '白金' }
      },
      carbon: {
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'シルバー': { en: 'Silver', 'zh-TW': '銀色' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' }
      },
      seg7: {
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ホワイト': { en: 'White', 'zh-TW': '白色' }
      },
      flip: {
        '白カード': { en: 'White Cards', 'zh-TW': '白卡' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'ネイビー': { en: 'Navy', 'zh-TW': '海軍藍' }
      },
      terminal: {
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'ホワイト': { en: 'White', 'zh-TW': '白色' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      pixel: {
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        '羊皮紙': { en: 'Parchment', 'zh-TW': '羊皮紙' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      nixie: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' }
      },
      lcd: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'グレー': { en: 'Gray', 'zh-TW': '灰色' },
        '反転': { en: 'Inverted', 'zh-TW': '反白' }
      },
      led: {
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' }
      },
      vfd: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'ライム': { en: 'Lime', 'zh-TW': '萊姆綠' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      vhs: {
        'ブルーバック': { en: 'Blue Screen', 'zh-TW': '藍色畫面' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' }
      },
      cassette: {
        'クリア': { en: 'Clear', 'zh-TW': '透明' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' }
      },
      arcade: {
        'ホワイト': { en: 'White', 'zh-TW': '白色' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        '白画面': { en: 'White Screen', 'zh-TW': '白色畫面' }
      },
      marquee: {
        'ホワイト': { en: 'White', 'zh-TW': '白色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        '赤板': { en: 'Red Board', 'zh-TW': '紅色看板' }
      },
      pager: {
        'バックライト': { en: 'Backlit', 'zh-TW': '背光' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'スケルトン': { en: 'Clear Shell', 'zh-TW': '透明機殼' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      typepaper: {
        '白紙': { en: 'White Paper', 'zh-TW': '白紙' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' },
        '古紙': { en: 'Old Paper', 'zh-TW': '舊紙' },
        '黒紙': { en: 'Black Paper', 'zh-TW': '黑紙' }
      },
      ticker: {
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' },
        '白帯': { en: 'White Band', 'zh-TW': '白色橫條' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' }
      },
      variety: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'モノクロ': { en: 'Monochrome', 'zh-TW': '黑白' }
      },
      live: {
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' },
        'ネイビー': { en: 'Navy', 'zh-TW': '海軍藍' },
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' }
      },
      weather: {
        '夕焼け': { en: 'Sunset Glow', 'zh-TW': '晚霞' },
        '新緑': { en: 'Fresh Green', 'zh-TW': '新綠' },
        '夜明け': { en: 'Dawn', 'zh-TW': '黎明' },
        '春': { en: 'Spring', 'zh-TW': '春天' }
      },
      quiz: {
        '赤パネル': { en: 'Red Panel', 'zh-TW': '紅色面板' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' },
        '白パネル': { en: 'White Panel', 'zh-TW': '白面板' }
      },
      sports: {
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        '白帯': { en: 'White Band', 'zh-TW': '白色橫條' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' }
      },
      subtitle: {
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'シネマ': { en: 'Cinema', 'zh-TW': '電影' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        '白帯': { en: 'White Band', 'zh-TW': '白色橫條' }
      },
      lowerthird: {
        '白帯': { en: 'White Band', 'zh-TW': '白色橫條' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      docu: {
        '墨': { en: 'Ink', 'zh-TW': '墨色' },
        'ホワイト': { en: 'White', 'zh-TW': '白色' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'ローズ': { en: 'Rose', 'zh-TW': '玫瑰' }
      },
      pastel: {
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'ピーチ': { en: 'Peach', 'zh-TW': '蜜桃' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        'いちご': { en: 'Strawberry', 'zh-TW': '草莓' }
      },
      pop: {
        'ゆめかわ': { en: 'Dreamy', 'zh-TW': '夢幻可愛' },
        'ビタミン': { en: 'Vitamin', 'zh-TW': '維他命' },
        'ソーダ': { en: 'Soda', 'zh-TW': '蘇打' },
        'サンセット': { en: 'Sunset', 'zh-TW': '日落' }
      },
      sticker: {
        'ソーダ': { en: 'Soda', 'zh-TW': '蘇打' },
        'メロン': { en: 'Melon', 'zh-TW': '哈密瓜' },
        'グレープ': { en: 'Grape', 'zh-TW': '葡萄' },
        'レモン': { en: 'Lemon', 'zh-TW': '檸檬' }
      },
      neko: {
        'くろねこ': { en: 'Black Cat', 'zh-TW': '黑貓' },
        'みけ': { en: 'Calico', 'zh-TW': '三花貓' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'いちご': { en: 'Strawberry', 'zh-TW': '草莓' }
      },
      fusen: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        '水色': { en: 'Light Blue', 'zh-TW': '水藍' },
        '黄緑': { en: 'Yellow-Green', 'zh-TW': '黃綠' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' }
      },
      cloud: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'レモン': { en: 'Lemon', 'zh-TW': '檸檬' },
        '雨雲': { en: 'Rain Cloud', 'zh-TW': '烏雲' }
      },
      ribbon: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' }
      },
      candy: {
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'ソーダ': { en: 'Soda', 'zh-TW': '蘇打' },
        'レモン': { en: 'Lemon', 'zh-TW': '檸檬' },
        'グレープ': { en: 'Grape', 'zh-TW': '葡萄' }
      },
      bear: {
        'しろくま': { en: 'Polar Bear', 'zh-TW': '北極熊' },
        'こげちゃ': { en: 'Dark Brown', 'zh-TW': '深咖啡' },
        'ハニー': { en: 'Honey', 'zh-TW': '蜂蜜' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      bunny: {
        'チョコ': { en: 'Chocolate', 'zh-TW': '巧克力' },
        'グレー': { en: 'Gray', 'zh-TW': '灰色' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' }
      },
      heart: {
        'レッド': { en: 'Red', 'zh-TW': '紅色' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        'ミルク': { en: 'Milk', 'zh-TW': '牛奶' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' }
      },
      balloon: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'イエロー': { en: 'Yellow', 'zh-TW': '黃色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      yumekawa: {
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'ピーチ': { en: 'Peach', 'zh-TW': '蜜桃' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        'いちご': { en: 'Strawberry', 'zh-TW': '草莓' },
        'すみれ': { en: 'Viola', 'zh-TW': '堇花' }
      },
      wafu: {
        '墨地': { en: 'Ink Black', 'zh-TW': '墨底' },
        '若竹': { en: 'Young Bamboo', 'zh-TW': '嫩竹' },
        '藤': { en: 'Wisteria', 'zh-TW': '紫藤' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' }
      },
      tanzaku: {
        '空': { en: 'Sky', 'zh-TW': '晴空' },
        '若草': { en: 'Young Grass', 'zh-TW': '嫩草' },
        '山吹': { en: 'Golden Yellow', 'zh-TW': '山吹黃' },
        '藤': { en: 'Wisteria', 'zh-TW': '紫藤' }
      },
      koyomi: {
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' },
        '若葉': { en: 'Fresh Leaves', 'zh-TW': '嫩葉' },
        '夜': { en: 'Night', 'zh-TW': '夜晚' },
        '桜': { en: 'Cherry Blossom', 'zh-TW': '櫻花' }
      },
      kinpaku: {
        '漆黒': { en: 'Jet Black', 'zh-TW': '漆黑' },
        '紅': { en: 'Crimson', 'zh-TW': '緋紅' },
        '銀': { en: 'Silver', 'zh-TW': '銀色' },
        '深緑': { en: 'Deep Green', 'zh-TW': '深綠' }
      },
      tsuki: {
        '桜月夜': { en: 'Cherry Moon Night', 'zh-TW': '櫻月夜' },
        '冬の月': { en: 'Winter Moon', 'zh-TW': '冬月' },
        '秋の月': { en: 'Autumn Moon', 'zh-TW': '秋月' },
        '翡翠': { en: 'Jade', 'zh-TW': '翡翠' }
      },
      sumi: {
        '白墨': { en: 'White Ink', 'zh-TW': '白墨' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' },
        '茶': { en: 'Brown', 'zh-TW': '茶褐' },
        '桜': { en: 'Cherry Blossom', 'zh-TW': '櫻花' }
      },
      asanoha: {
        '紅': { en: 'Crimson', 'zh-TW': '緋紅' },
        '若竹': { en: 'Young Bamboo', 'zh-TW': '嫩竹' },
        '墨地': { en: 'Ink Black', 'zh-TW': '墨底' },
        '白地': { en: 'White Ground', 'zh-TW': '白底' }
      },
      nami: {
        '朱': { en: 'Vermilion', 'zh-TW': '朱紅' },
        '浅葱': { en: 'Light Teal', 'zh-TW': '淺蔥' },
        '夜': { en: 'Night', 'zh-TW': '夜晚' },
        '白地': { en: 'White Ground', 'zh-TW': '白底' }
      },
      shoji: {
        '行灯': { en: 'Paper Lamp', 'zh-TW': '紙燈' },
        '白木': { en: 'Plain Wood', 'zh-TW': '原木' },
        '黒': { en: 'Black', 'zh-TW': '黑色' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' }
      },
      ema: {
        '白木': { en: 'Plain Wood', 'zh-TW': '原木' },
        '焦茶': { en: 'Burnt Brown', 'zh-TW': '焦茶' },
        '黒': { en: 'Black', 'zh-TW': '黑色' },
        '紅': { en: 'Crimson', 'zh-TW': '緋紅' }
      },
      chochin: {
        '白提灯': { en: 'White Lantern', 'zh-TW': '白燈籠' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' },
        '山吹': { en: 'Golden Yellow', 'zh-TW': '山吹黃' },
        '桜': { en: 'Cherry Blossom', 'zh-TW': '櫻花' }
      },
      sakura: {
        '春空': { en: 'Spring Sky', 'zh-TW': '春日晴空' },
        '菜の花': { en: 'Canola', 'zh-TW': '油菜花' },
        'ラベンダー': { en: 'Lavender', 'zh-TW': '薰衣草' },
        '若葉': { en: 'Fresh Leaves', 'zh-TW': '嫩葉' }
      },
      hanabi: {
        '青': { en: 'Blue', 'zh-TW': '藍' },
        '赤': { en: 'Red', 'zh-TW': '紅' },
        '翠': { en: 'Emerald', 'zh-TW': '翠綠' },
        '金銀': { en: 'Gold & Silver', 'zh-TW': '金銀' }
      },
      momiji: {
        '栗': { en: 'Chestnut', 'zh-TW': '栗色' },
        '苔': { en: 'Moss', 'zh-TW': '青苔' },
        '紫紺': { en: 'Deep Purple', 'zh-TW': '深紫' },
        '銀杏': { en: 'Ginkgo', 'zh-TW': '銀杏' }
      },
      yuki: {
        '雪空': { en: 'Snowy Sky', 'zh-TW': '雪空' },
        '宵': { en: 'Dusk', 'zh-TW': '薄暮' },
        '白銀': { en: 'Silver Snow', 'zh-TW': '銀白' },
        '冬桜': { en: 'Winter Sakura', 'zh-TW': '冬櫻' }
      },
      halloween: {
        '魔女': { en: 'Witch', 'zh-TW': '魔女' },
        '漆黒': { en: 'Jet Black', 'zh-TW': '漆黑' },
        'スライム': { en: 'Slime', 'zh-TW': '史萊姆' },
        '吸血鬼': { en: 'Vampire', 'zh-TW': '吸血鬼' }
      },
      xmas: {
        '赤地': { en: 'Red', 'zh-TW': '紅底' },
        '銀世界': { en: 'Winter Wonderland', 'zh-TW': '銀白世界' },
        'ナイト': { en: 'Night', 'zh-TW': '夜晚' },
        'ジンジャー': { en: 'Gingerbread', 'zh-TW': '薑餅' }
      },
      tsuyu: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        '雨上がり': { en: 'After the Rain', 'zh-TW': '雨後' },
        '夜': { en: 'Night', 'zh-TW': '夜晚' },
        '若葉': { en: 'Fresh Leaves', 'zh-TW': '嫩葉' }
      },
      umi: {
        '南国': { en: 'Tropical', 'zh-TW': '南國' },
        '夕凪': { en: 'Evening Calm', 'zh-TW': '黃昏海' },
        '夜の海': { en: 'Night Sea', 'zh-TW': '夜之海' },
        '浅瀬': { en: 'Shallows', 'zh-TW': '淺灘' }
      },
      kingyo: {
        '夜店': { en: 'Night Market', 'zh-TW': '夜市' },
        '出目金': { en: 'Black Moor', 'zh-TW': '黑龍睛' },
        '水草': { en: 'Water Plants', 'zh-TW': '水草' },
        '桜': { en: 'Cherry Blossom', 'zh-TW': '櫻花' }
      },
      tsukimi: {
        '秋の月': { en: 'Autumn Moon', 'zh-TW': '秋月' },
        '宵': { en: 'Dusk', 'zh-TW': '薄暮' },
        '翡翠': { en: 'Jade', 'zh-TW': '翡翠' },
        '漆黒': { en: 'Jet Black', 'zh-TW': '漆黑' }
      },
      valentine: {
        'ホワイト': { en: 'White', 'zh-TW': '白色' },
        'いちご': { en: 'Strawberry', 'zh-TW': '草莓' },
        'ビター': { en: 'Bitter', 'zh-TW': '苦甜' },
        '抹茶': { en: 'Matcha', 'zh-TW': '抹茶' }
      },
      newyear: {
        '紅地': { en: 'Crimson Ground', 'zh-TW': '紅底' },
        '墨地': { en: 'Ink Black', 'zh-TW': '墨底' },
        '金地': { en: 'Gold Ground', 'zh-TW': '金底' },
        '藍': { en: 'Indigo', 'zh-TW': '靛藍' }
      },
      ring: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' },
        '白盤': { en: 'White Dial', 'zh-TW': '白錶盤' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      analog: {
        'クリーム': { en: 'Cream', 'zh-TW': '奶油' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' }
      },
      analogdark: {
        'ネイビー': { en: 'Navy', 'zh-TW': '海軍藍' },
        'ワイン': { en: 'Wine', 'zh-TW': '酒紅' },
        '深緑': { en: 'Deep Green', 'zh-TW': '深綠' },
        'ゴールド': { en: 'Gold', 'zh-TW': '金色' }
      },
      roman: {
        '銀': { en: 'Silver', 'zh-TW': '銀色' },
        '黒金': { en: 'Black & Gold', 'zh-TW': '黑金' },
        '白磁': { en: 'Porcelain', 'zh-TW': '白瓷' },
        '赤銅': { en: 'Copper', 'zh-TW': '赤銅' }
      },
      handsonly: {
        '黒針 (明るい画面用)': { en: 'Black Hands (for light scenes)', 'zh-TW': '黑指針 (亮色畫面用)' },
        'ゴールド (暗い画面用)': { en: 'Gold (for dark scenes)', 'zh-TW': '金色 (暗色畫面用)' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'シアン': { en: 'Cyan', 'zh-TW': '青色' }
      },
      neonanalog: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'オレンジ': { en: 'Orange', 'zh-TW': '橘色' },
        'ホワイト': { en: 'White', 'zh-TW': '白色' }
      },
      wood: {
        '白木': { en: 'Plain Wood', 'zh-TW': '原木' },
        '胡桃': { en: 'Walnut', 'zh-TW': '胡桃木' },
        '黒檀': { en: 'Ebony', 'zh-TW': '黑檀木' },
        '桜': { en: 'Cherry Wood', 'zh-TW': '櫻桃木' }
      },
      station: {
        '黒盤': { en: 'Black Dial', 'zh-TW': '黑錶盤' },
        'クリーム': { en: 'Cream', 'zh-TW': '奶油' },
        'ネイビー': { en: 'Navy', 'zh-TW': '海軍藍' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' }
      },
      chalk: {
        '紺板': { en: 'Navy Board', 'zh-TW': '深藍板' },
        '黒板': { en: 'Blackboard', 'zh-TW': '黑板' },
        'ローズ': { en: 'Rose', 'zh-TW': '玫瑰' },
        '青竹': { en: 'Green Bamboo', 'zh-TW': '青竹' }
      },
      binary: {
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'アンバー': { en: 'Amber', 'zh-TW': '琥珀黃' },
        'パープル': { en: 'Purple', 'zh-TW': '紫色' }
      },
      kotoba: {
        'クリーム': { en: 'Cream', 'zh-TW': '奶油' },
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ダーク': { en: 'Dark', 'zh-TW': '深色' },
        'ミント': { en: 'Mint', 'zh-TW': '薄荷' }
      },
      progress: {
        'シアン': { en: 'Cyan', 'zh-TW': '青色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'グリーン': { en: 'Green', 'zh-TW': '綠色' },
        'ライト': { en: 'Light', 'zh-TW': '淺色' }
      },
      ticket: {
        'ブルー': { en: 'Blue', 'zh-TW': '藍色' },
        'ピンク': { en: 'Pink', 'zh-TW': '粉紅' },
        'モノクロ': { en: 'Monochrome', 'zh-TW': '黑白' },
        'ナイト': { en: 'Night', 'zh-TW': '夜晚' }
      }
    }
  },

  /* 名前の補助関数 (訳が無ければ ja の元の語) */
  designName: function (lang, d) {
    if (!d) return '';
    var e = L.names.designs[d.id];
    return (lang !== 'ja' && e && e[lang]) || d.name;
  },
  groupName: function (lang, g) {
    var e = L.names.groups[g];
    return (lang !== 'ja' && e && e[lang]) || g;
  },
  colorLabel: function (lang, label) {
    var e = L.names.colorLabels[label];
    return (lang !== 'ja' && e && e[lang]) || label;
  },
  paletteName: function (lang, designId, name) {
    var p = L.names.palettes[designId], e = p && p[name];
    return (lang !== 'ja' && e && e[lang]) || name;
  },

  /* ================================================================
   * 設定画面 (settings.html) の全文言
   *   キーは英語 snake_case。{name} 形式は t() の vars で置換する。
   *   _html で終わるキーだけ <b> を含む (innerHTML で入れてよいのはこれだけ。中身は固定文字列のみ)。
   *   settings.html のどこで使うかは _dev\i18n\ui-strings.md (行番号つき) を参照。
   *   「日付の書き方」のボタンの文字は dateExample(lang, df) で作るのでここには無い。
   *   デザイン名・系統名・配色名・色の名前は names 側。
   * ================================================================ */
  ui: {
    ja: {
      /* --- ページ・ヘッダー --- */
      page_title: 'きせかえ時計 Clock Studio 設定',
      app_title: 'きせかえ時計 Clock Studio',
      ver_suffix: 'v{ver} ・ 設定画面',
      edition_free: '無料版',
      edition_paid: '有料版',
      hint_intro_html: 'はじめに: <b>①</b> 左でデザインを選ぶ → <b>②</b> 右で好みに調整 → <b>③</b> 中央下の「URL をコピー」を OBS に貼る',
      hint_short_html: '<b>①</b> 左で選ぶ → <b>②</b> 右で調整 → <b>③</b> 下でコピー',
      hint_narrow: 'はじめに: デザインを選ぶ → 調整 → 上の「URL をコピー」を OBS に貼る',
      hint_close_aria: 'このヒントを閉じる',
      close: '閉じる',
      cancel: 'やめる',
      help_btn: '使い方',
      help_aria: 'この画面の使い方',
      theme_dark: 'ダークにする',
      theme_light: 'ライトにする',
      theme_to_dark: 'ダークテーマに切り替える',
      theme_to_light: 'ライトテーマに切り替える',
      lang_label: '言語',
      lang_aria: '画面の言語を切り替える',

      /* --- プレビュー --- */
      preview: 'プレビュー',
      frame_toggle: 'OBS の枠を表示',
      frame_toggle_short: '枠を表示',
      frame_toggle_title: 'OBS のブラウザソースの枠 (破線) をプレビューに重ねます',
      preview_iframe_title: '時計のプレビュー',
      scale_shrunk: '{p}% に縮小表示中',
      trial_prefix: '試し表示: ',
      trial_click: 'クリックで決定',
      nav_prev: '前のデザイン',
      nav_next: '次のデザイン',
      nav_pos: '{i} / {n}',
      nav_pos_group: ' ({group})',
      nav_pos_fav: ' (お気に入り)',
      nav_pos_filtered: ' (絞り込み中)',
      mtabs_aria: '設定の切り替え',
      mtab_design: 'デザイン',
      mtab_adjust: '調整',

      /* --- ① デザイン --- */
      h_design: 'デザインを選ぶ',
      big_btn: '大きく並べて選ぶ',
      big_btn_title: '画面いっぱいに大きく並べて選びます',
      gal_title: 'デザインを大きく並べて選ぶ',
      search_placeholder: '名前で探す (例: ねおん)',
      search_aria: 'デザインを名前で探す',
      random: 'おまかせ',
      random_aria: 'おまかせ (ランダムに選ぶ)',
      random_title: '使えるデザインからランダムに 1 つ選びます',
      random_title_big: '使えるデザインからランダムに選びます',
      chips_aria: 'デザインの系統で絞り込む',
      chip_all: 'すべて',
      chip_fav: 'お気に入り',
      clear_filters: '絞り込みを解除',
      only_free: '使えるデザインだけ表示',
      count_filtered: '{vis} / {total} 種類を表示中',
      count_all: '全 {total} 種類',
      group_count: '{n} 種類',
      empty_fav: 'お気に入りはまだありません。カードの ☆ (キーボードでは F キー) を押すと、ここに集まります。',
      empty_none: 'この条件に合うデザインがありません。',
      paid_tag: '有料版',
      locked_suffix_css: ' ・有料版',
      locked_aria: '{name} (有料版のデザイン)',
      paid_design: '有料版のデザインです',
      fav_add: 'お気に入りに追加 (F キー)',
      fav_remove: 'お気に入りから外す (F キー)',
      fav_add_aria: '{name}をお気に入りに追加',
      fav_remove_aria: '{name}をお気に入りから外す',
      toast_fav_added: '「{name}」をお気に入りに追加しました',
      toast_fav_removed: '「{name}」をお気に入りから外しました',
      toast_reset_colors: '色とフォントをこのデザインの標準に戻しました',

      /* --- 有料版の案内ダイアログ --- */
      paid_dialog_title: '「{name}」は有料版のデザインです',
      paid_dialog_body: '無料版で使えるのは、{list}の {n} 種類です。有料版では全 {total} 種類のデザインのほか、色・フォント・フチ・時刻の変わり方も自由に変えられます。',
      list_sep: '・',
      see_paid: '有料版を見る',

      /* --- ② 好みに調整 (共通部品) --- */
      h_adjust: '好みに調整',
      autosave: '設定は自動で保存されます',
      off_sup: 'このデザインでは変えられません',
      off_paid: '有料版で変えられます',
      lock_note: '無料版では固定です',
      reset_item: '元に戻す',
      reset_item_title: '最初の状態に戻す',
      reset_item_aria: '{label}を元に戻す',
      hex_aria: '{label} (HEX)',
      number_aria: '{label} (数値)',
      quick_aria: '{label}をすばやく選ぶ',

      /* --- 表示 --- */
      sec_display: '表示',
      tg_aria: '表示するもの',
      tg_sec: '秒',
      tg_sec_title: '秒を出す (オフで時計が小さくなります)',
      tg_date: '日付',
      tg_date_title: '時計に日付も出す',
      tg_h12: '12 時間表示',
      tg_h12_title: '18:30 ではなく 6:30 PM のように出す',
      tnote_h12_off: '12 時間表示は、{reason}',
      df_label: '日付の書き方',
      df_hint: 'ボタンは表示例です',
      df_tanzaku_off: '短冊では日本語の書式になります',
      lay_label: '日付の場所',
      lay_hint: '時刻から見た位置',
      lay_v: '上',
      lay_vr: '下',
      lay_h: '左',
      lay_hr: '右',
      ap_label: 'AM/PM の書き方',
      ap_en: 'AM / PM',
      ap_jp: '午前 / 午後',
      ap_off: '出さない',
      clock_lang_label: '時計の言葉',
      clock_lang_hint: '曜日や午前/午後などを何語で出すか',
      label_label: 'ひとこと',
      label_hint: '時計に添える短い文字',
      label_placeholder: '例: JST / 配信中',
      label_count: '{n} / 30',

      /* --- 色 --- */
      sec_color: '色',
      sec_color_sub: 'まずはおすすめ配色から',
      pal_label: 'おすすめ配色',
      pal_original: '標準',
      pal_original_title: 'このデザインの標準の色',
      pal_title: 'おすすめ配色「{name}」',
      pal_fallback_name: '配色',
      fold_colors: '1 色ずつ変える',
      color_generic: '色',
      color_n: '色{n}',
      color_note: '色見本をクリック、または #ff8800 のように入力します。',

      /* --- フォント --- */
      sec_font: 'フォント',
      sec_font_sub: '文字の形',
      font_default: 'このデザインの標準',
      font_std: '標準',
      font_own: 'このデザイン専用',
      font_default_title: 'このデザインの標準のフォント',
      font_own_title: 'このデザイン専用のフォントです',
      fonts_collapse: 'たたむ',
      fonts_more: 'ほかのフォントも見る (あと {n} 種類)',
      font_note: 'フォントはネットから読み込みます。つながっていないときは代わりのフォントになります。',

      /* --- 大きさ --- */
      sec_size: '大きさ',
      size_label: '時計の大きさ',
      size_hint: '100% が標準',

      /* --- くわしい設定 --- */
      more_title: 'くわしい設定',
      more_changed: '{n} 項目を変更中',
      more_sub: 'フチ・影・時刻の変わり方・位置 など',
      more_locknote: '鍵マークの項目は有料版で変えられます',
      sup_note: 'このデザインでは、{names} は変えられません (薄い表示の項目)。',
      ol_label: '文字のフチ',
      ol_hint: 'ゲーム画面の上でも読みやすく',
      olc_label: 'フチの色',
      olc_hint: '背景と反対の色が目立ちます',
      olc_black: '黒',
      olc_white: '白',
      sh_label: '影',
      sh_hint: '文字や板の後ろに影をつけます',
      sh_switch: 'つける',
      anim_label: '時刻の変わり方',
      anim_hint: '数字が切り替わるときの動き',
      anim_none: '動かさない',
      anim_fade: 'ふわっと',
      anim_slide: 'スライド',
      anim_pop: 'ぽんっと',
      blink_label: 'コロンの点滅',
      blink_hint: '「:」を 1 秒ごとに点滅',
      blink_switch: '点滅させる',
      pad_label: '9 時台の書き方',
      pad_hint: '1 けたの時に 0 をつけるか',
      pos_label: '枠の中の位置',
      pos_hint: 'ふつうは「まん中」で OK',
      pos_aria: 'OBS の枠の中で時計を寄せる位置',
      pos_tl: '左上', pos_tc: '上', pos_tr: '右上',
      pos_ml: '左', pos_mc: 'まん中', pos_mr: '右',
      pos_bl: '左下', pos_bc: '下', pos_br: '右下',
      pos_now: 'いまは「{name}」',
      pos_info: '破線の四角が OBS の枠です。枠をおすすめより大きくしたときに効きます。',
      tz_label: 'タイムゾーン',
      tz_hint: '海外の時刻を出したいときに',
      reset_all: 'すべて最初の状態に戻す',
      reset_all_note: 'デザインも含めて最初の状態 (プレーン) に戻します。',

      /* --- タイムゾーンの選択肢 (キーは IANA 名を小文字 + _ にしたもの) --- */
      tz_local: 'この PC の時刻 (標準)',
      tz_asia_tokyo: '日本 (東京)',
      tz_asia_seoul: '韓国 (ソウル)',
      tz_asia_shanghai: '中国 (上海)',
      tz_asia_taipei: '台湾 (台北)',
      tz_asia_hong_kong: '香港',
      tz_asia_singapore: 'シンガポール',
      tz_asia_bangkok: 'タイ (バンコク)',
      tz_asia_kolkata: 'インド',
      tz_asia_dubai: 'ドバイ',
      tz_europe_london: 'イギリス (ロンドン)',
      tz_europe_paris: 'フランス (パリ)',
      tz_europe_berlin: 'ドイツ (ベルリン)',
      tz_europe_moscow: 'ロシア (モスクワ)',
      tz_america_new_york: 'アメリカ東部 (ニューヨーク)',
      tz_america_chicago: 'アメリカ中部 (シカゴ)',
      tz_america_denver: 'アメリカ山岳部 (デンバー)',
      tz_america_los_angeles: 'アメリカ西部 (ロサンゼルス)',
      tz_america_sao_paulo: 'ブラジル (サンパウロ)',
      tz_pacific_honolulu: 'ハワイ',
      tz_australia_sydney: 'オーストラリア (シドニー)',
      tz_pacific_auckland: 'ニュージーランド',
      tz_utc: 'UTC (協定世界時)',

      /* --- すべて戻す (確認ダイアログ) --- */
      reset_title: 'すべて最初の状態に戻しますか?',
      reset_body: 'デザインも含めて、すべての設定を最初の状態 (プレーン) に戻します。OBS に貼ってある URL はそのままです。',
      reset_yes: '戻す',
      toast_reset_all: 'すべて最初の状態に戻しました',

      /* --- ③ OBS に入れる --- */
      h_obs: 'OBS に入れる',
      howto_link: 'OBS への入れ方',
      import_link: 'OBS の URL から読み込む',
      import_link_short: 'URL から読み込む',
      import_link_title: 'OBS に貼ってある URL から設定を読み込みます',
      import_link_vh: '(OBS に貼ってある URL から設定を読み込む)',
      copy_url: 'URL をコピー',
      copied: 'コピーしました',
      copy_failed: 'コピーできませんでした',
      width: '幅',
      height: '高さ',
      copy_w_title: '幅をコピー',
      copy_h_title: '高さをコピー',
      copy_w_aria: '幅 {n} をコピー',
      copy_h_aria: '高さ {n} をコピー',
      sizebox_title: 'OBS のブラウザソースに入れる幅と高さ (数字をクリックでコピー)',
      url_aria: 'OBS 用の URL (クリックで全部選択)',
      url_title: 'クリックで全部選択',
      open_url: 'この URL をブラウザで開いて確認',
      obs_idle: '設定を変えたときは、URL をコピーし直して OBS に貼り直します。',
      copy_ok_msg: 'コピーしました。OBS の URL 欄に貼り付け、{size} を入れてください {mac}',
      size_wh: '幅 {w} × 高さ {h}',
      mac_paste: '(Mac は ⌘ + V)',
      copy_ng_msg: 'コピーできませんでした。URL 欄の文字を選んだので、{keys} {mac} でコピーしてください。',
      mac_copy: '(Mac は ⌘ + C)',
      over_msg: '配信画面 (1920×1080) より大きくなっています。大きさを下げてください。',
      credit_head: '無料版はクレジット表記をお願いします（配信・動画の概要欄などに）',
      credit_line1: '時計素材: きせかえ時計 Clock Studio（雨峰あまね）',
      credit_copy: 'クレジットをコピー',
      credit_copied: 'クレジットをコピーしました',
      credit_box_aria: 'コピー用のクレジット文',
      credit_rt: '{link}のリポスト (RT) でも OK です。',
      credit_rt_link: '告知ポスト',
      credit_paid: '有料版はクレジット不要',
      credit_close: '閉じる',

      /* --- OBS への入れ方 (ダイアログ) --- */
      howto_lead: 'OBS の「ブラウザ」ソースの画面は、こんな見た目です。番号の場所を、手順どおりに設定します。',
      mock_aria: 'OBS のブラウザソースのプロパティ画面の図',
      mock_sources: 'ソース',
      mock_pick_browser: '→「ブラウザ」を選ぶ',
      mock_props_title: '「ブラウザ」のプロパティ',
      mock_local_file: 'ローカルファイル',
      mock_unchecked: '← チェックなし',
      mock_url: 'URL',
      mock_click_copy_title: 'クリックで数字をコピー',
      mock_click_copy: 'クリックでコピー',
      mock_ok: 'OK',
      mock_cancel: 'キャンセル',
      mock_caption: '※ 図の幅と高さには、いまの設定のおすすめサイズが入っています。',
      step1_html: 'この画面の <b>URL をコピー</b> を押します。',
      step_done: '済み',
      step2_html: 'OBS の「ソース」の <b>+</b> を押し、<b>ブラウザ</b> を選んで追加します。(名前は何でも OK)',
      step3_html: '<b>ローカルファイル</b> のチェックを外します。<b>URL</b> 欄に最初から入っている文字を消してから、コピーした URL を貼り付けます。(Ctrl + V)',
      step4_html: '<b>幅</b> と <b>高さ</b> に、下の数字を入れて OK を押します。',
      sizecard_title: 'いまの設定のおすすめサイズ (数字をクリックでコピー)',
      size_note_measured: '時計の実際の大きさに、上下左右 {m}px ずつの余白を足した値です。秒や日付を変えると数字も変わります。',
      size_note_estimate: 'おおよその目安です (プレビューの計測が終わると正確な値に変わります)。',
      howto_h_noconfig: '設定を変えずに、そのまま使うなら',
      howto_noconfig: 'OBS のブラウザソースで「ローカルファイル」にチェックを入れ、このフォルダの clock.html を選ぶだけで、標準のデザイン (プレーン) の時計が出ます。(幅・高さの目安: 幅 350 × 高さ 130)',
      howto_noconfig_web: 'OBS のブラウザソースの URL 欄に {url} を貼るだけで、標準のデザイン (プレーン) の時計が出ます。(幅・高さの目安: 幅 350 × 高さ 130)',
      howto_h_later: 'あとで設定を変えたいとき',
      howto_later: 'この画面の「{link}」に OBS に貼ってある URL を貼ると、そのときの設定から続きを直せます。直したら、URL をコピーし直して OBS に貼り直します。',
      howto_h_trouble: 'うまくいかないとき',
      trouble_1_q: 'URL を貼っても、設定が OBS に反映されない',
      trouble_1_a: 'ブラウザソースの「ローカルファイル」のチェックが入ったままだと、URL は使われません。チェックを外してから、URL を貼り付けてください。設定を変えたあとは、URL もコピーし直して貼り直します。',
      trouble_2_q: '文字や飾りが切れる・はみ出す',
      trouble_2_a: '幅と高さが小さすぎます。この画面の「幅 × 高さ」の数字を入れ直してください。秒や日付を足したり、大きさを変えたりすると、おすすめサイズも変わります。',
      trouble_3_q: 'フォントが設定と違う',
      trouble_3_a: 'フォントはインターネットから読み込みます。ネットにつながっていないと、代わりのフォントで表示されます。つながっている状態で、ブラウザソースの「現在のページのキャッシュを更新」を押してみてください。',
      trouble_4_q: 'フォルダを動かしたら表示されなくなった',
      trouble_4_a: 'URL にはファイルの置き場所が入っています。フォルダを動かしたり名前を変えたりしたときは、この設定画面を開き直して URL を作り直し、OBS に貼り直してください。',
      trouble_4_q_web: '配信中に時計が消えた / 表示されない',
      trouble_4_a_web: 'Web 版はインターネット経由で読み込みます。回線が切れていると表示されません。手元のファイルで動かしたい場合は {link} をどうぞ。',
      trouble_4_link_web: 'BOOTH の ZIP 版 (無料)',

      /* --- URL から読み込む (ダイアログ) --- */
      import_title: 'OBS に貼ってある URL から設定を読み込む',
      import_body: 'OBS のブラウザソースの URL 欄からコピーした URL を貼ると、そのときの設定を読み込んで続きから直せます。いまの設定は置き換わります (読み込んだあとに「元に戻す」で戻せます)。直したら、URL をコピーし直して OBS に貼り直します。',
      import_placeholder: 'OBS に貼ってある URL をここに貼り付け (…/clock.html?… の形)',
      import_aria: '読み込む URL',
      import_go: '読み込む',
      import_empty: 'URL を貼り付けてください。',
      import_bad: 'この URL は時計の URL ではないようです。OBS のブラウザソースの URL 欄 (clock.html で終わり、? のあとに設定が続くもの) をコピーして貼ってください。',
      import_done: '設定を読み込みました。続きから直せます。',
      import_paid_design: '「{name}」は有料版のデザインなので、{fallback}で読み込みました',
      import_paid_dropped_suffix: '。色・フォントなど有料版の設定も外しました',
      import_dropped: '設定を読み込みました。色・フォントなど有料版の設定は外しました',
      import_undo: '元に戻す',
      import_undone: '読み込む前の設定に戻しました',

      /* --- この画面の使い方 (ダイアログ) --- */
      usage_title: 'この画面の使い方',
      usage_1_t: 'デザインを選ぶ (左)',
      usage_1_d: 'カードをクリックで決定。マウスを乗せると、プレビューで試し表示できます。プレビューの ◀ ▶ でも順番に切り替えられます。キーボードでは矢印キーで選び、F キーでお気に入りに追加・削除できます。',
      usage_2_t: '好みに調整 (右)',
      usage_2_d: '秒・日付・色・フォント・大きさなど。設定は自動で保存されます。',
      usage_3_t: 'OBS に入れる (中央下)',
      usage_3_d: '「URL をコピー」を押し、OBS のブラウザソースの URL 欄に貼ります。幅と高さは横の数字を入れます。',
      usage_howto_btn: 'OBS への入れ方を見る'
    },

    en: {
      page_title: 'Kisekae Clock Studio – Settings',
      app_title: 'Kisekae Clock Studio',
      ver_suffix: 'v{ver} · Settings',
      edition_free: 'Free',
      edition_paid: 'Full',
      hint_intro_html: 'Quick start: <b>①</b> Pick a design on the left → <b>②</b> Adjust it on the right → <b>③</b> Click “Copy URL” (bottom center) and paste it into OBS',
      hint_short_html: '<b>①</b> Pick → <b>②</b> Adjust → <b>③</b> Copy',
      hint_narrow: 'Quick start: Pick a design → Adjust → Paste the URL from “Copy URL” above into OBS',
      hint_close_aria: 'Close this tip',
      close: 'Close',
      cancel: 'Cancel',
      help_btn: 'Help',
      help_aria: 'How to use this page',
      theme_dark: 'Dark',
      theme_light: 'Light',
      theme_to_dark: 'Switch to dark theme',
      theme_to_light: 'Switch to light theme',
      lang_label: 'Language',
      lang_aria: 'Change page language',

      preview: 'Preview',
      frame_toggle: 'Show OBS frame',
      frame_toggle_short: 'Frame',
      frame_toggle_title: 'Overlay the Browser source bounds (dashed line) on the preview',
      preview_iframe_title: 'Clock preview',
      scale_shrunk: 'Scaled to {p}%',
      trial_prefix: 'Previewing: ',
      trial_click: 'Click to apply',
      nav_prev: 'Previous design',
      nav_next: 'Next design',
      nav_pos: '{i} / {n}',
      nav_pos_group: ' ({group})',
      nav_pos_fav: ' (Favorites)',
      nav_pos_filtered: ' (Filtered)',
      mtabs_aria: 'Switch panels',
      mtab_design: 'Design',
      mtab_adjust: 'Adjust',

      h_design: 'Pick a design',
      big_btn: 'Browse large',
      big_btn_title: 'Show all designs in a large full-screen grid',
      gal_title: 'Browse designs in a large grid',
      search_placeholder: 'Search (e.g. neon)',
      search_aria: 'Search designs by name',
      random: 'Surprise me',
      random_aria: 'Surprise me (pick at random)',
      random_title: 'Pick one available design at random',
      random_title_big: 'Pick an available design at random',
      chips_aria: 'Filter by style',
      chip_all: 'All',
      chip_fav: 'Favorites',
      clear_filters: 'Clear filters',
      only_free: 'Show only available designs',
      count_filtered: 'Showing {vis} / {total}',
      count_all: '{total} designs',
      group_count: '{n}',
      empty_fav: 'No favorites yet. Click the ☆ on a card (or press F) to add it here.',
      empty_none: 'No designs match these filters.',
      paid_tag: 'Full version',
      locked_suffix_css: ' · Full version',
      locked_aria: '{name} (Full version design)',
      paid_design: 'This design is in the full version',
      fav_add: 'Add to favorites (F)',
      fav_remove: 'Remove from favorites (F)',
      fav_add_aria: 'Add {name} to favorites',
      fav_remove_aria: 'Remove {name} from favorites',
      toast_fav_added: 'Added “{name}” to favorites',
      toast_fav_removed: 'Removed “{name}” from favorites',
      toast_reset_colors: "Colors and font reset to this design's defaults",

      paid_dialog_title: '“{name}” is a full-version design',
      paid_dialog_body: 'The free version includes {n} designs: {list}. The full version unlocks all {total} designs, plus custom colors, fonts, outlines and digit animations.',
      list_sep: ', ',
      see_paid: 'See full version',

      h_adjust: 'Adjust',
      autosave: 'Settings are saved automatically',
      off_sup: "Not available for this design",
      off_paid: 'Available in the full version',
      lock_note: 'Fixed in the free version',
      reset_item: 'Reset',
      reset_item_title: 'Reset to default',
      reset_item_aria: 'Reset {label}',
      hex_aria: '{label} (HEX)',
      number_aria: '{label} (number)',
      quick_aria: '{label} presets',

      sec_display: 'Display',
      tg_aria: 'What to show',
      tg_sec: 'Seconds',
      tg_sec_title: 'Show seconds (turn off for a smaller clock)',
      tg_date: 'Date',
      tg_date_title: 'Show the date with the clock',
      tg_h12: '12-hour',
      tg_h12_title: 'Show 6:30 PM instead of 18:30',
      tnote_h12_off: '12-hour: {reason}',
      df_label: 'Date format',
      df_hint: 'Buttons show examples',
      df_tanzaku_off: 'Tanzaku always uses a Japanese date format',
      lay_label: 'Date position',
      lay_hint: 'Relative to the time',
      lay_v: 'Above',
      lay_vr: 'Below',
      lay_h: 'Left',
      lay_hr: 'Right',
      ap_label: 'AM/PM style',
      ap_en: 'AM / PM',
      ap_jp: 'AM / PM',
      ap_off: 'Hide',
      clock_lang_label: 'Clock language',
      clock_lang_hint: 'Language for weekdays, AM/PM, etc.',
      label_label: 'Caption',
      label_hint: 'Short text shown with the clock',
      label_placeholder: 'e.g. JST / LIVE',
      label_count: '{n} / 30',

      sec_color: 'Colors',
      sec_color_sub: 'Start with a preset',
      pal_label: 'Color presets',
      pal_original: 'Default',
      pal_original_title: 'This design\'s default colors',
      pal_title: 'Color preset “{name}”',
      pal_fallback_name: 'Preset',
      fold_colors: 'Edit colors one by one',
      color_generic: 'Color',
      color_n: 'Color {n}',
      color_note: 'Click the swatch, or type a value like #ff8800.',

      sec_font: 'Font',
      sec_font_sub: 'Letter style',
      font_default: "Design's default",
      font_std: 'Default',
      font_own: 'Design\'s own',
      font_default_title: "This design's default font",
      font_own_title: 'This design uses its own lettering',
      fonts_collapse: 'Show less',
      fonts_more: 'More fonts ({n} more)',
      font_note: 'Fonts are loaded from the internet. When you\'re offline, a fallback font is used.',

      sec_size: 'Size',
      size_label: 'Clock size',
      size_hint: '100% is the default',

      more_title: 'More settings',
      more_changed: '{n} changed',
      more_sub: 'Outline, shadow, digit animation, position, etc.',
      more_locknote: 'Items with a lock can be changed in the full version',
      sup_note: 'This design can\'t change: {names} (grayed out).',
      ol_label: 'Text outline',
      ol_hint: 'Keeps text readable over gameplay',
      olc_label: 'Outline color',
      olc_hint: 'A color opposite to the background stands out',
      olc_black: 'Black',
      olc_white: 'White',
      sh_label: 'Shadow',
      sh_hint: 'Adds a shadow behind the text or plate',
      sh_switch: 'On',
      anim_label: 'Digit animation',
      anim_hint: 'How digits change',
      anim_none: 'None',
      anim_fade: 'Fade',
      anim_slide: 'Slide',
      anim_pop: 'Pop',
      blink_label: 'Blinking colon',
      blink_hint: 'Blink the “:” every second',
      blink_switch: 'Blink',
      pad_label: 'Leading zero',
      pad_hint: 'Add a 0 to single-digit hours',
      pos_label: 'Position in frame',
      pos_hint: '“Center” works for most setups',
      pos_aria: 'Where the clock sits inside the OBS source bounds',
      pos_tl: 'Top left', pos_tc: 'Top', pos_tr: 'Top right',
      pos_ml: 'Left', pos_mc: 'Center', pos_mr: 'Right',
      pos_bl: 'Bottom left', pos_bc: 'Bottom', pos_br: 'Bottom right',
      pos_now: 'Now: {name}',
      pos_info: 'The dashed box is the OBS source bounds. This matters when the source is larger than recommended.',
      tz_label: 'Time zone',
      tz_hint: 'To show the time somewhere else',
      reset_all: 'Reset everything',
      reset_all_note: 'Resets all settings, including the design (Plain).',

      tz_local: "This PC's time (default)",
      tz_asia_tokyo: 'Japan (Tokyo)',
      tz_asia_seoul: 'South Korea (Seoul)',
      tz_asia_shanghai: 'China (Shanghai)',
      tz_asia_taipei: 'Taiwan (Taipei)',
      tz_asia_hong_kong: 'Hong Kong',
      tz_asia_singapore: 'Singapore',
      tz_asia_bangkok: 'Thailand (Bangkok)',
      tz_asia_kolkata: 'India',
      tz_asia_dubai: 'Dubai',
      tz_europe_london: 'UK (London)',
      tz_europe_paris: 'France (Paris)',
      tz_europe_berlin: 'Germany (Berlin)',
      tz_europe_moscow: 'Russia (Moscow)',
      tz_america_new_york: 'US Eastern (New York)',
      tz_america_chicago: 'US Central (Chicago)',
      tz_america_denver: 'US Mountain (Denver)',
      tz_america_los_angeles: 'US Pacific (Los Angeles)',
      tz_america_sao_paulo: 'Brazil (São Paulo)',
      tz_pacific_honolulu: 'Hawaii',
      tz_australia_sydney: 'Australia (Sydney)',
      tz_pacific_auckland: 'New Zealand',
      tz_utc: 'UTC (Coordinated Universal Time)',

      reset_title: 'Reset everything?',
      reset_body: 'All settings, including the design, go back to the defaults (Plain). The URL already pasted in OBS is not affected.',
      reset_yes: 'Reset',
      toast_reset_all: 'Everything has been reset',

      h_obs: 'Add to OBS',
      howto_link: 'How to add to OBS',
      import_link: 'Load from OBS URL',
      import_link_short: 'Load from URL',
      import_link_title: 'Load settings from the URL pasted in OBS',
      import_link_vh: '(Load settings from the URL pasted in OBS)',
      copy_url: 'Copy URL',
      copied: 'Copied',
      copy_failed: "Couldn't copy",
      width: 'Width',
      height: 'Height',
      copy_w_title: 'Copy width',
      copy_h_title: 'Copy height',
      copy_w_aria: 'Copy width {n}',
      copy_h_aria: 'Copy height {n}',
      sizebox_title: 'Width and height for the OBS Browser source (click a number to copy)',
      url_aria: 'URL for OBS (click to select all)',
      url_title: 'Click to select all',
      open_url: 'Open this URL in your browser to check',
      obs_idle: 'After changing settings, copy the URL again and paste it into OBS.',
      copy_ok_msg: 'Copied! Paste it into the URL field in OBS, then set {size} {mac}',
      size_wh: 'Width {w} × Height {h}',
      mac_paste: '(Mac: ⌘ + V)',
      copy_ng_msg: 'Couldn\'t copy. The URL field is now selected, so press {keys} {mac} to copy it.',
      mac_copy: '(Mac: ⌘ + C)',
      over_msg: 'This is larger than the stream canvas (1920×1080). Please lower the size.',
      credit_head: 'The free version requires a credit (e.g. in your stream or video description)',
      credit_line1: 'Clock: Kisekae Clock Studio (Amemine Amane)',
      credit_copy: 'Copy credit',
      credit_copied: 'Credit copied',
      credit_box_aria: 'Credit text to copy',
      credit_rt: 'Reposting (RT) the {link} is also fine.',
      credit_rt_link: 'announcement post',
      credit_paid: 'The full version needs no credit',
      credit_close: 'Close',

      howto_lead: "This is what the Browser source properties look like in OBS. Set the numbered fields in order.",
      mock_aria: 'Diagram of the OBS Browser source properties window',
      mock_sources: 'Sources',
      mock_pick_browser: '→ choose “Browser”',
      mock_props_title: "Properties for 'Browser'",
      mock_local_file: 'Local file',
      mock_unchecked: '← unchecked',
      mock_url: 'URL',
      mock_click_copy_title: 'Click to copy the number',
      mock_click_copy: 'Click to copy',
      mock_ok: 'OK',
      mock_cancel: 'Cancel',
      mock_caption: '* The width and height in the diagram are the recommended size for your current settings.',
      step1_html: 'Click <b>Copy URL</b> on this page.',
      step_done: 'Done',
      step2_html: 'In OBS, click <b>+</b> under “Sources”, choose <b>Browser</b> and add it. (Any name is fine)',
      step3_html: 'Uncheck <b>Local file</b>. Delete the text already in the <b>URL</b> field, then paste the copied URL. (Ctrl + V)',
      step4_html: 'Enter the numbers below into <b>Width</b> and <b>Height</b>, then click OK.',
      sizecard_title: 'Recommended size for your current settings (click a number to copy)',
      size_note_measured: 'The actual clock size plus {m}px of padding on each side. It changes when you toggle seconds or the date.',
      size_note_estimate: 'Rough estimate (it updates to the exact value once the preview is measured).',
      howto_h_noconfig: 'Using it as is, without settings',
      howto_noconfig: 'In the OBS Browser source, check “Local file” and select clock.html in this folder. The clock appears in the default design (Plain). (Suggested size: Width 350 × Height 130)',
      howto_noconfig_web: 'Just paste {url} into the URL field of an OBS Browser source. The clock appears in the default design (Plain). (Suggested size: Width 350 × Height 130)',
      howto_h_later: 'Changing settings later',
      howto_later: 'Paste the URL from OBS into “{link}” on this page to pick up where you left off. After editing, copy the URL again and paste it into OBS.',
      howto_h_trouble: 'Troubleshooting',
      trouble_1_q: "Pasted the URL, but OBS doesn't show my settings",
      trouble_1_a: 'If “Local file” is still checked in the Browser source, the URL is ignored. Uncheck it, then paste the URL. After changing settings, copy and paste the URL again.',
      trouble_2_q: 'Text or decorations are cut off',
      trouble_2_a: 'The width and height are too small. Enter the “Width × Height” numbers from this page again. The recommended size changes when you add seconds or the date, or change the size.',
      trouble_3_q: "The font doesn't match my settings",
      trouble_3_a: 'Fonts are loaded from the internet. When offline, a fallback font is shown. Once you are online, try “Refresh cache of current page” in the Browser source.',
      trouble_4_q: 'The clock disappeared after moving the folder',
      trouble_4_a: 'The URL contains the file location. If you move or rename the folder, reopen this settings page, copy a new URL and paste it into OBS again.',
      trouble_4_q_web: 'The clock disappeared or does not show during a stream',
      trouble_4_a_web: 'The web version loads over the internet, so it will not show while your connection is down. To run it from files on your PC, use the {link}.',
      trouble_4_link_web: 'ZIP version on BOOTH (free)',

      import_title: 'Load settings from the URL in OBS',
      import_body: 'Paste the URL copied from the Browser source\'s URL field to load those settings and keep editing. Your current settings will be replaced (you can undo with “Undo” after loading). After editing, copy the URL again and paste it into OBS.',
      import_placeholder: 'Paste the URL from OBS here (…/clock.html?…)',
      import_aria: 'URL to load',
      import_go: 'Load',
      import_empty: 'Please paste a URL.',
      import_bad: 'This doesn\'t look like a clock URL. Copy the URL from the Browser source\'s URL field in OBS (it ends in clock.html, followed by ? and the settings) and paste it here.',
      import_done: 'Settings loaded. You can keep editing.',
      import_paid_design: '“{name}” is a full-version design, so it was loaded as {fallback}',
      import_paid_dropped_suffix: '. Full-version settings such as colors and fonts were also removed',
      import_dropped: 'Settings loaded. Full-version settings such as colors and fonts were removed',
      import_undo: 'Undo',
      import_undone: 'Restored the settings from before loading',

      usage_title: 'How to use this page',
      usage_1_t: 'Pick a design (left)',
      usage_1_d: 'Click a card to choose it. Hover to preview it. You can also step through designs with ◀ ▶ on the preview. With the keyboard, use the arrow keys to choose and F to add or remove a favorite.',
      usage_2_t: 'Adjust (right)',
      usage_2_d: 'Seconds, date, colors, font, size and more. Settings are saved automatically.',
      usage_3_t: 'Add to OBS (bottom center)',
      usage_3_d: 'Click “Copy URL” and paste it into the URL field of an OBS Browser source. Enter the width and height shown next to it.',
      usage_howto_btn: 'How to add to OBS'
    },

    'zh-TW': {
      page_title: '換裝時鐘 Clock Studio 設定',
      app_title: '換裝時鐘 Clock Studio',
      ver_suffix: 'v{ver} · 設定畫面',
      edition_free: '免費版',
      edition_paid: '付費版',
      hint_intro_html: '開始使用：<b>①</b> 在左邊選設計 → <b>②</b> 在右邊調整 → <b>③</b> 按下方中間的「複製網址」，貼到 OBS',
      hint_short_html: '<b>①</b> 左邊選 → <b>②</b> 右邊調 → <b>③</b> 下方複製',
      hint_narrow: '開始使用：選擇設計 → 調整 → 按上方的「複製網址」貼到 OBS',
      hint_close_aria: '關閉這則提示',
      close: '關閉',
      cancel: '取消',
      help_btn: '使用說明',
      help_aria: '這個畫面的使用說明',
      theme_dark: '深色',
      theme_light: '淺色',
      theme_to_dark: '切換成深色主題',
      theme_to_light: '切換成淺色主題',
      lang_label: '語言',
      lang_aria: '切換畫面語言',

      preview: '預覽',
      frame_toggle: '顯示 OBS 外框',
      frame_toggle_short: '顯示外框',
      frame_toggle_title: '在預覽上疊加 OBS 瀏覽器來源的範圍 (虛線)',
      preview_iframe_title: '時鐘預覽',
      scale_shrunk: '已縮小為 {p}% 顯示',
      trial_prefix: '試看：',
      trial_click: '點一下套用',
      nav_prev: '上一個設計',
      nav_next: '下一個設計',
      nav_pos: '{i} / {n}',
      nav_pos_group: ' ({group})',
      nav_pos_fav: ' (我的最愛)',
      nav_pos_filtered: ' (篩選中)',
      mtabs_aria: '切換設定面板',
      mtab_design: '設計',
      mtab_adjust: '調整',

      h_design: '選擇設計',
      big_btn: '大圖瀏覽',
      big_btn_title: '用整個畫面大圖排列來選',
      gal_title: '大圖瀏覽設計',
      search_placeholder: '依名稱搜尋 (例：霓虹)',
      search_aria: '依名稱搜尋設計',
      random: '隨機',
      random_aria: '隨機 (隨機選一個)',
      random_title: '從可用的設計中隨機選一個',
      random_title_big: '從可用的設計中隨機選',
      chips_aria: '依風格篩選設計',
      chip_all: '全部',
      chip_fav: '我的最愛',
      clear_filters: '清除篩選',
      only_free: '只顯示可用的設計',
      count_filtered: '顯示 {vis} / {total} 種',
      count_all: '共 {total} 種',
      group_count: '{n} 種',
      empty_fav: '還沒有我的最愛。按卡片上的 ☆ (鍵盤按 F 鍵)，就會集中到這裡。',
      empty_none: '沒有符合條件的設計。',
      paid_tag: '付費版',
      locked_suffix_css: ' ・付費版',
      locked_aria: '{name} (付費版設計)',
      paid_design: '這是付費版的設計',
      fav_add: '加入我的最愛 (F 鍵)',
      fav_remove: '從我的最愛移除 (F 鍵)',
      fav_add_aria: '將{name}加入我的最愛',
      fav_remove_aria: '將{name}從我的最愛移除',
      toast_fav_added: '已將「{name}」加入我的最愛',
      toast_fav_removed: '已將「{name}」從我的最愛移除',
      toast_reset_colors: '已將顏色和字型恢復為這個設計的預設',

      paid_dialog_title: '「{name}」是付費版的設計',
      paid_dialog_body: '免費版可以使用 {list} 共 {n} 種。付費版除了全部 {total} 種設計，還能自由更改顏色、字型、外框和數字切換動畫。',
      list_sep: '、',
      see_paid: '查看付費版',

      h_adjust: '調整',
      autosave: '設定會自動儲存',
      off_sup: '這個設計無法更改',
      off_paid: '付費版可以更改',
      lock_note: '免費版為固定',
      reset_item: '還原',
      reset_item_title: '恢復成預設',
      reset_item_aria: '還原{label}',
      hex_aria: '{label} (HEX)',
      number_aria: '{label} (數值)',
      quick_aria: '快速選擇{label}',

      sec_display: '顯示',
      tg_aria: '要顯示的項目',
      tg_sec: '秒',
      tg_sec_title: '顯示秒數 (關閉後時鐘會變小)',
      tg_date: '日期',
      tg_date_title: '在時鐘上一起顯示日期',
      tg_h12: '12 小時制',
      tg_h12_title: '顯示為 下午 6:30，而不是 18:30',
      tnote_h12_off: '12 小時制：{reason}',
      df_label: '日期格式',
      df_hint: '按鈕上是顯示範例',
      df_tanzaku_off: '短冊設計固定使用日文的日期格式',
      lay_label: '日期位置',
      lay_hint: '相對於時間的位置',
      lay_v: '上',
      lay_vr: '下',
      lay_h: '左',
      lay_hr: '右',
      ap_label: '上午/下午 的寫法',
      ap_en: 'AM / PM',
      ap_jp: '上午 / 下午',
      ap_off: '不顯示',
      clock_lang_label: '時鐘語言',
      clock_lang_hint: '星期、上午/下午等用哪種語言顯示',
      label_label: '附加文字',
      label_hint: '和時鐘一起顯示的短文字',
      label_placeholder: '例：JST / 直播中',
      label_count: '{n} / 30',

      sec_color: '顏色',
      sec_color_sub: '先從推薦配色開始',
      pal_label: '推薦配色',
      pal_original: '預設',
      pal_original_title: '這個設計的預設顏色',
      pal_title: '推薦配色「{name}」',
      pal_fallback_name: '配色',
      fold_colors: '逐一更改顏色',
      color_generic: '顏色',
      color_n: '顏色 {n}',
      color_note: '點選色塊，或輸入 #ff8800 這樣的色碼。',

      sec_font: '字型',
      sec_font_sub: '文字的樣式',
      font_default: '這個設計的預設',
      font_std: '預設',
      font_own: '設計專用',
      font_default_title: '這個設計的預設字型',
      font_own_title: '這是這個設計專用的字型',
      fonts_collapse: '收起',
      fonts_more: '查看更多字型 (還有 {n} 種)',
      font_note: '字型會從網路載入。沒有連網時，會改用替代字型。',

      sec_size: '大小',
      size_label: '時鐘大小',
      size_hint: '100% 為預設',

      more_title: '進階設定',
      more_changed: '已更改 {n} 項',
      more_sub: '外框・陰影・數字切換動畫・位置 等',
      more_locknote: '有鎖頭圖示的項目在付費版可以更改',
      sup_note: '這個設計無法更改：{names} (顯示為淡色的項目)。',
      ol_label: '文字外框',
      ol_hint: '疊在遊戲畫面上也清楚好讀',
      olc_label: '外框顏色',
      olc_hint: '和背景相反的顏色比較顯眼',
      olc_black: '黑',
      olc_white: '白',
      sh_label: '陰影',
      sh_hint: '在文字或底板後面加上陰影',
      sh_switch: '開啟',
      anim_label: '數字切換動畫',
      anim_hint: '數字變化時的動態',
      anim_none: '無',
      anim_fade: '淡入',
      anim_slide: '滑動',
      anim_pop: '彈跳',
      blink_label: '冒號閃爍',
      blink_hint: '「:」每秒閃爍一次',
      blink_switch: '閃爍',
      pad_label: '個位數小時補 0',
      pad_hint: '小時只有 1 位數時是否補 0',
      pos_label: '外框內的位置',
      pos_hint: '一般選「正中間」就可以',
      pos_aria: '時鐘在 OBS 來源範圍內靠齊的位置',
      pos_tl: '左上', pos_tc: '上', pos_tr: '右上',
      pos_ml: '左', pos_mc: '正中間', pos_mr: '右',
      pos_bl: '左下', pos_bc: '下', pos_br: '右下',
      pos_now: '目前：「{name}」',
      pos_info: '虛線方框就是 OBS 的來源範圍。來源設得比建議尺寸大時才有作用。',
      tz_label: '時區',
      tz_hint: '想顯示其他地區的時間時使用',
      reset_all: '全部恢復成預設',
      reset_all_note: '包含設計在內，全部恢復成預設 (基本)。',

      tz_local: '這台電腦的時間 (預設)',
      tz_asia_tokyo: '日本 (東京)',
      tz_asia_seoul: '韓國 (首爾)',
      tz_asia_shanghai: '中國 (上海)',
      tz_asia_taipei: '台灣 (台北)',
      tz_asia_hong_kong: '香港',
      tz_asia_singapore: '新加坡',
      tz_asia_bangkok: '泰國 (曼谷)',
      tz_asia_kolkata: '印度',
      tz_asia_dubai: '杜拜',
      tz_europe_london: '英國 (倫敦)',
      tz_europe_paris: '法國 (巴黎)',
      tz_europe_berlin: '德國 (柏林)',
      tz_europe_moscow: '俄羅斯 (莫斯科)',
      tz_america_new_york: '美國東部 (紐約)',
      tz_america_chicago: '美國中部 (芝加哥)',
      tz_america_denver: '美國山區 (丹佛)',
      tz_america_los_angeles: '美國西部 (洛杉磯)',
      tz_america_sao_paulo: '巴西 (聖保羅)',
      tz_pacific_honolulu: '夏威夷',
      tz_australia_sydney: '澳洲 (雪梨)',
      tz_pacific_auckland: '紐西蘭',
      tz_utc: 'UTC (世界協調時間)',

      reset_title: '要全部恢復成預設嗎？',
      reset_body: '包含設計在內，所有設定都會恢復成預設 (基本)。已經貼到 OBS 的網址不會改變。',
      reset_yes: '恢復',
      toast_reset_all: '已全部恢復成預設',

      h_obs: '放進 OBS',
      howto_link: '如何放進 OBS',
      import_link: '從 OBS 的網址讀取',
      import_link_short: '從網址讀取',
      import_link_title: '從貼在 OBS 的網址讀取設定',
      import_link_vh: '(從貼在 OBS 的網址讀取設定)',
      copy_url: '複製網址',
      copied: '已複製',
      copy_failed: '無法複製',
      width: '寬度',
      height: '高度',
      copy_w_title: '複製寬度',
      copy_h_title: '複製高度',
      copy_w_aria: '複製寬度 {n}',
      copy_h_aria: '複製高度 {n}',
      sizebox_title: '要填入 OBS 瀏覽器來源的寬度和高度 (點數字即可複製)',
      url_aria: 'OBS 用的網址 (點一下全選)',
      url_title: '點一下全選',
      open_url: '在瀏覽器開啟這個網址確認',
      obs_idle: '更改設定後，請重新複製網址並貼到 OBS。',
      copy_ok_msg: '已複製。請貼到 OBS 的網址欄位，並填入 {size} {mac}',
      size_wh: '寬度 {w} × 高度 {h}',
      mac_paste: '(Mac 為 ⌘ + V)',
      copy_ng_msg: '無法複製。已經幫你選取網址欄位的文字，請按 {keys} {mac} 複製。',
      mac_copy: '(Mac 為 ⌘ + C)',
      over_msg: '已經超過直播畫面 (1920×1080)。請把大小調小。',
      credit_head: '免費版請標註出處 (Credit)（直播・影片的資訊欄等）',
      credit_line1: '時鐘素材：換裝時鐘 Clock Studio (雨峰あまね / Amemine Amane)',
      credit_copy: '複製出處文字',
      credit_copied: '已複製出處文字',
      credit_box_aria: '可複製的出處文字',
      credit_rt: '轉發 (RT) {link}也可以。',
      credit_rt_link: '宣傳貼文',
      credit_paid: '付費版免標註出處',
      credit_close: '關閉',

      howto_lead: 'OBS「瀏覽器」來源的畫面長這樣。依照步驟設定有編號的地方。',
      mock_aria: 'OBS 瀏覽器來源屬性視窗的示意圖',
      mock_sources: '來源',
      mock_pick_browser: '→ 選擇「瀏覽器」',
      mock_props_title: '屬性「瀏覽器」',
      mock_local_file: '本機檔案',
      mock_unchecked: '← 不要勾選',
      mock_url: '網址',
      mock_click_copy_title: '點一下複製數字',
      mock_click_copy: '點一下複製',
      mock_ok: '確定',
      mock_cancel: '取消',
      mock_caption: '※ 圖中的寬度和高度是目前設定的建議尺寸。',
      step1_html: '按下這個畫面的 <b>複製網址</b>。',
      step_done: '完成',
      step2_html: '在 OBS 的「來源」按 <b>+</b>，選擇 <b>瀏覽器</b> 並新增。(名稱隨意)',
      step3_html: '取消勾選 <b>本機檔案</b>。先刪除 <b>網址</b> 欄位裡原本的文字，再貼上剛才複製的網址。(Ctrl + V)',
      step4_html: '在 <b>寬度</b> 和 <b>高度</b> 填入下面的數字，然後按確定。',
      sizecard_title: '目前設定的建議尺寸 (點數字即可複製)',
      size_note_measured: '這是時鐘實際大小，再加上上下左右各 {m}px 的留白。開關秒數或日期時，數字也會跟著變。',
      size_note_estimate: '這是大概的參考值 (預覽量測完成後會變成準確的數值)。',
      howto_h_noconfig: '不改設定，直接使用',
      howto_noconfig: '在 OBS 的瀏覽器來源勾選「本機檔案」，選擇這個資料夾裡的 clock.html，就會顯示預設設計 (基本) 的時鐘。(建議尺寸：寬度 350 × 高度 130)',
      howto_noconfig_web: '只要在 OBS 瀏覽器來源的網址欄位貼上 {url}，就會顯示預設設計 (基本) 的時鐘。(建議尺寸：寬度 350 × 高度 130)',
      howto_h_later: '之後想更改設定時',
      howto_later: '把貼在 OBS 的網址貼到這個畫面的「{link}」，就能從當時的設定繼續修改。改好後，請重新複製網址並貼到 OBS。',
      howto_h_trouble: '遇到問題時',
      trouble_1_q: '貼上網址後，OBS 沒有套用設定',
      trouble_1_a: '如果瀏覽器來源的「本機檔案」還是勾選狀態，就不會使用網址。請先取消勾選，再貼上網址。更改設定後，也要重新複製網址並貼上。',
      trouble_2_q: '文字或裝飾被切掉、超出範圍',
      trouble_2_a: '寬度和高度太小了。請重新填入這個畫面上「寬度 × 高度」的數字。加上秒數、日期或改變大小後，建議尺寸也會改變。',
      trouble_3_q: '字型和設定的不一樣',
      trouble_3_a: '字型是從網路載入的。沒有連網時，會用替代字型顯示。請在連網狀態下，按瀏覽器來源的「更新當前頁面快取」試試看。',
      trouble_4_q: '移動資料夾後就不顯示了',
      trouble_4_a: '網址裡包含檔案的位置。移動資料夾或改名後，請重新開啟這個設定畫面產生新網址，再重新貼到 OBS。',
      trouble_4_q_web: '直播中時鐘消失了／沒有顯示',
      trouble_4_a_web: '網頁版是透過網路讀取的，網路斷線時就不會顯示。如果想用電腦裡的檔案執行，請改用 {link}。',
      trouble_4_link_web: 'BOOTH 的 ZIP 版 (免費)',

      import_title: '從貼在 OBS 的網址讀取設定',
      import_body: '貼上從 OBS 瀏覽器來源網址欄位複製的網址，就能讀取當時的設定並繼續修改。目前的設定會被取代 (讀取後可以按「復原」還原)。改好後，請重新複製網址並貼到 OBS。',
      import_placeholder: '在這裡貼上 OBS 裡的網址 (…/clock.html?… 的形式)',
      import_aria: '要讀取的網址',
      import_go: '讀取',
      import_empty: '請貼上網址。',
      import_bad: '這個網址看起來不是時鐘的網址。請從 OBS 瀏覽器來源的網址欄位 (以 clock.html 結尾，? 後面接著設定的那個) 複製後貼上。',
      import_done: '已讀取設定，可以繼續修改。',
      import_paid_design: '「{name}」是付費版的設計，所以改用{fallback}讀取',
      import_paid_dropped_suffix: '。也移除了顏色、字型等付費版的設定',
      import_dropped: '已讀取設定。顏色、字型等付費版的設定已移除',
      import_undo: '復原',
      import_undone: '已恢復成讀取前的設定',

      usage_title: '這個畫面的使用說明',
      usage_1_t: '選擇設計 (左)',
      usage_1_d: '點卡片即可選定。滑鼠移到卡片上，可以在預覽中試看。也可以用預覽的 ◀ ▶ 依序切換。使用鍵盤時，用方向鍵選擇，按 F 鍵加入或移除我的最愛。',
      usage_2_t: '調整 (右)',
      usage_2_d: '秒數、日期、顏色、字型、大小等。設定會自動儲存。',
      usage_3_t: '放進 OBS (中間下方)',
      usage_3_d: '按「複製網址」，貼到 OBS 瀏覽器來源的網址欄位。寬度和高度填入旁邊的數字。',
      usage_howto_btn: '查看如何放進 OBS'
    }
  },

  /*
   * ui の文字列を引く。lang に無ければ ja、ja にも無ければ key をそのまま返す。
   * vars: { name: 'ネオン', n: 3 } → '{name}' '{n}' を置換 (vars に無い {x} はそのまま残す)
   */
  t: function (lang, key, vars) {
    var d = L.ui[lang], s = d && d.hasOwnProperty(key) ? d[key] : null;
    if (s == null) s = L.ui[L.DEFAULT].hasOwnProperty(key) ? L.ui[L.DEFAULT][key] : key;
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars.hasOwnProperty(k) ? String(vars[k]) : m; });
  },
  /*
   * 文の途中に DOM 部品 (ボタンや <span class="nw">) を差し込む文言用。
   * slots に名前を挙げた {x} で文字列を切り、[ '文字', {slot:'link'}, '文字' ] の配列で返す (それ以外の {x} は vars で置換)。
   *   例: parts('ja', 'howto_later', null, ['link']) → ['この画面の「', {slot:'link'}, '」に OBS に…']
   *       parts('en', 'copy_ok_msg', null, ['size', 'mac'])
   */
  parts: function (lang, key, vars, slots) {
    var s = L.t(lang, key, vars), out = [], re = /\{(\w+)\}/g, last = 0, m;
    slots = slots || [];
    while ((m = re.exec(s))) {
      if (slots.indexOf(m[1]) < 0) continue;
      if (m.index > last) out.push(s.slice(last, m.index));
      out.push({ slot: m[1] });
      last = re.lastIndex;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  },
  /* タイムゾーンの選択肢のキー: 'America/New_York' → 'tz_america_new_york'、'' → 'tz_local' */
  tzKey: function (iana) { return iana ? 'tz_' + String(iana).toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'tz_local'; }
};
})();
