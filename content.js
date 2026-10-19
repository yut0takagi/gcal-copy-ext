
(function () {
  'use strict';

  const LINE = '-'.repeat(99);
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  let lastEventId = null;

  // 予定チップをクリックしたときに eventid を覚えておく
  document.addEventListener('click', (e) => {
    const chip = e.target.closest && e.target.closest('[data-eventid]');
    if (chip) lastEventId = chip.getAttribute('data-eventid');
  }, true);

  const pad = (n) => String(n).padStart(2, '0');
  const txt = (el) => (el ? el.innerText.trim() : '');

  function viewYear() {
    const m = location.pathname.match(/\/(\d{4})\/\d{1,2}\/\d{1,2}/);
    return m ? +m[1] : new Date().getFullYear();
  }

  // 「10月1日 (木曜日)⋅10:30～11:30」等から期間を作る
  function parsePeriod(text) {
    const d = text.match(/(?:(\d{4})年)?\s*(\d{1,2})月\s*(\d{1,2})日/);
    const t = text.match(/(午前|午後)?\s*(\d{1,2}):(\d{2})\s*[～〜~\-–]\s*(午前|午後)?\s*(\d{1,2}):(\d{2})/);
    if (!d) return text.replace(/\s+/g, ' ');
    const y = d[1] ? +d[1] : viewYear();
    const dt = new Date(y, +d[2] - 1, +d[3]);
    const head = `${y}/${pad(d[2])}/${pad(d[3])}(${DOW[dt.getDay()]})`;
    if (!t) return `${head} 終日`;
    // 午前/午後を24時間表記に。終了側に表記が無ければ開始側を引き継ぐ(例: 午後7:00～9:00)
    const to24 = (ampm, h) => {
      h = +h;
      if (ampm === '午後' && h < 12) h += 12;
      if (ampm === '午前' && h === 12) h = 0;
      return pad(h);
    };
    const ap1 = t[1], ap2 = t[4] || t[1];
    return `${head} ${to24(ap1, t[2])}:${t[3]} - ${to24(ap2, t[5])}:${t[6]}`;
  }

  function findDialog() {
    return document.querySelector('[role="dialog"][data-eventid], [role="dialog"]');
  }

  // 「Google Meet に参加」リンクから会議URLを取る(クエリは外す)。無ければ本文から探す
  function findMeetUrl(dlg) {
    const a = dlg.querySelector('a[href*="meet.google.com/"]');
    const raw = a ? a.href : ((dlg.innerText.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i) || [])[0] || '');
    const m = raw.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i);
    return m ? m[0] : '';
  }

  function extract(dlg) {
    const eid = dlg.getAttribute('data-eventid') || lastEventId || '';
    const url = eid ? `https://www.google.com/calendar/event?eid=${eid}` : '';
    const q = (sels) => { for (const s of sels) { const el = dlg.querySelector(s); if (el) return el; } return null; };

    const title = txt(q(['#rAECCd', '[role="heading"]', 'h1', 'h2']));
    const whenEl = q(['#xDetDlgWhen', '[data-dragsource-type] time']);
    let when = txt(whenEl);
    if (!when) {
      // フォールバック: ダイアログ全文から日付・時間っぽい行を探す
      const line = dlg.innerText.split('\n').find((l) => /\d{1,2}月\s*\d{1,2}日/.test(l) && /\d{1,2}:\d{2}/.test(l));
      when = line || '';
    }
    const loc = txt(q(['#xDetDlgLoc', '[aria-label^="場所"]']));
    const desc = txt(q(['#xDetDlgDesc', '[aria-label^="説明"]']));
    const meet = findMeetUrl(dlg);

    // 参加者: メール属性を持つ要素から名前を拾う
    const names = [];
    dlg.querySelectorAll('[data-email], [data-hovercard-id]').forEach((el) => {
      const n = txt(el).split('\n')[0];
      if (n && !n.includes('@') && !names.includes(n)) names.push(n);
    });

    return { title, period: parsePeriod(when), guests: names.join(','), loc, meet, desc, url };
  }

  function format(x) {
    return [
      LINE,
      `[ タイトル ]: ${x.title}`,
      `[ 期間 ]: ${x.period}`,
      `[ 参加者 ]: ${x.guests}`,
      `[ 場所 ]: ${x.loc}`,
      `[ ※Meet URL ]: ${x.meet}`,
      `[ 説明 ]: ${x.desc}`,
      `[ スケジュールURL ]: ${x.url}`,
      LINE,
    ].join('\n');
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
  }

  // ---- ボタン配置 ----
  // メール送信ボタンを複製して、アイコンだけ差し替える(サイズ・色・余白を本家とそろえるため)
  const PATH_COPY = 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z';
  const PATH_DONE = 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
  const LABEL = '予定をコピー';

  function isOurs(el) { return !!(el.closest && el.closest('.gcal-copy-wrap, .gcal-copy-fallback')); }

  const labelOf = (b) => [b.getAttribute('aria-label'), b.getAttribute('data-tooltip'), b.getAttribute('title')]
    .filter(Boolean).join(' ');

  // ヘッダー行(×ボタンと同じ高さ)にあるボタンだけを返す。
  // ゲスト欄の「ゲストにメール」などヘッダー外のボタンを拾わないため。
  function headerButtons(dlg) {
    const all = [...dlg.querySelectorAll('button, [role="button"]')].filter((b) => !isOurs(b));
    const close = all.find((b) => /閉じる|close/i.test(labelOf(b)));
    if (!close) return [];
    const cr = close.getBoundingClientRect();
    const cy = cr.top + cr.height / 2;
    return all.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.height > 0 && Math.abs(r.top + r.height / 2 - cy) < cr.height / 2;
    });
  }

  // ヘッダー内の「メールで送信」→「削除」→「編集」の順に、右隣に置く基準ボタンを探す
  function findAnchorBtn(dlg) {
    const btns = headerButtons(dlg);
    for (const re of [/メール|mail/i, /削除|delete/i, /編集|edit/i]) {
      const b = btns.find((x) => re.test(labelOf(x)));
      if (b) return b;
    }
    return null;
  }

  // Google 側の JS(ツールチップ・クリック処理)が複製に反応しないよう属性を外す
  function scrub(root) {
    root.querySelectorAll('[role="tooltip"]').forEach((el) => el.remove());
    [root, ...root.querySelectorAll('*')].forEach((el) => {
      for (const a of [...el.attributes]) {
        const n = a.name;
        if (n.startsWith('js') || n === 'id' || n.startsWith('data-tooltip') ||
            n === 'aria-describedby' || n === 'aria-labelledby' || n === 'aria-pressed' || n === 'href') {
          el.removeAttribute(n);
        }
      }
    });
  }

  function setIcon(wrap, done) {
    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = `<path d="${done ? PATH_DONE : PATH_COPY}"/>`;
      return;
    }
    // Material Icons のフォント(ligature)で描いている場合
    const icon = wrap.querySelector('i, .google-material-icons, .material-icons, .material-symbols-outlined');
    if (icon) icon.textContent = done ? 'check' : 'content_copy';
  }

  function createClone(dlg, anchorBtn) {
    const base = anchorBtn.closest('[data-is-tooltip-wrapper]') || anchorBtn;
    const wrap = base.cloneNode(true);
    scrub(wrap);
    wrap.classList.add('gcal-copy-wrap');
    const btn = wrap.matches('button, [role="button"]') ? wrap : wrap.querySelector('button, [role="button"]');
    btn.setAttribute('aria-label', LABEL);
    btn.title = LABEL;
    setIcon(wrap, false);
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await copy(format(extract(dlg)));
      setIcon(wrap, true);
      setTimeout(() => setIcon(wrap, false), 1500);
    }, true);
    return { wrap, base };
  }

  // ヘッダーが見つからないときだけ出す、ポップアップ下部のテキストボタン
  function createFallback(dlg) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gcal-copy-fallback';
    btn.textContent = '📋 コピー';
    btn.style.cssText = 'margin:8px 16px;padding:6px 12px;border-radius:16px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;font-size:13px;';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copy(format(extract(dlg)));
      btn.textContent = '✅ コピーしました';
      setTimeout(() => (btn.textContent = '📋 コピー'), 1500);
    });
    return btn;
  }

  // 新規作成(クイック作成)ダイアログか: タイトル入力欄や「保存」ボタンがある
  function isCreateDialog(dlg) {
    if (dlg.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) return true;
    return [...dlg.querySelectorAll('button, [role="button"]')].some((b) =>
      /^(保存|save)$/i.test((labelOf(b) || b.innerText || '').trim()));
  }

  function inject(dlg) {
    const existing = dlg.querySelector('.gcal-copy-wrap');
    const fallback = dlg.querySelector('.gcal-copy-fallback');
    if (isCreateDialog(dlg)) {
      if (existing) existing.remove();
      if (fallback) fallback.remove();
      return;
    }
    const anchorBtn = findAnchorBtn(dlg);

    if (anchorBtn) {
      const base = anchorBtn.closest('[data-is-tooltip-wrapper]') || anchorBtn;
      // すでに正しい位置なら何もしない(MutationObserver の無限ループ防止)
      if (existing && base.nextElementSibling === existing) return;
      if (existing) existing.remove();
      if (fallback) fallback.remove();
      const { wrap } = createClone(dlg, anchorBtn);
      base.insertAdjacentElement('afterend', wrap);
    } else if (!existing && !fallback) {
      // ヘッダーのボタンがまだ描画されていない/見つからないときの仮置き
      dlg.appendChild(createFallback(dlg));
    }
  }

  new MutationObserver(() => {
    const dlg = findDialog();
    if (dlg && dlg.innerText.trim()) inject(dlg);
  }).observe(document.body, { childList: true, subtree: true });
})();
