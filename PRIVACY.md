# プライバシーポリシー

最終更新日: 2026年10月19日

Chrome 拡張機能「GCal 予定コピー」（以下、本拡張機能）が扱うデータについて説明します。

## 読み取る情報

本拡張機能は、Google カレンダー（`https://calendar.google.com/calendar/*`）の予定ポップアップに表示されている次の情報を読み取ります。

- 予定のタイトル、日時、場所、説明
- 参加者の表示名
- Google Meet の URL と予定の URL

## 使い道

予定の内容を取り出すのは、ユーザーがコピーボタンを押したときだけです。
取り出した情報は書式を整えたテキストにして、ユーザーのクリップボードへ書き込みます。用途はこれだけです。

このほか、コピーボタンを置く位置を決めるためにポップアップの画面構成を読み取ります。
また、予定の URL を作るために、クリックした予定の ID をページを開いている間だけメモリ上に持ちます。

## 保存と送信

- 読み取った情報を外部のサーバーへ送信しません
- ブラウザのストレージやファイルにも保存しません。ページを閉じると、メモリ上の情報も消えます
- 第三者への提供・販売や、広告への利用はしません
- アクセス解析やトラッキングの仕組みは入っていません

クリップボードに書き込んだテキストをどこへ貼り付けるかは、ユーザーが決めます。

## 動作するページ

本拡張機能が動作するのは `https://calendar.google.com/calendar/*` のページだけです。ほかのサイトのページにはアクセスしません。

## ポリシーの変更

内容を変えるときは、このページを更新します。過去の版は GitHub のコミット履歴で確認できます。

## 問い合わせ

[GitHub の Issues](https://github.com/yut0takagi/gcal-copy-ext/issues) からご連絡ください。

---

## Privacy Policy (English)

Last updated: October 19, 2026

**What it reads.** GCal 予定コピー reads the event details shown in the Google Calendar event popup (`https://calendar.google.com/calendar/*`): title, date and time, location, description, guest display names, Google Meet URL, and event URL.

**How it is used.** Event details are extracted only when the user clicks the copy button. They are formatted as text and written to the user's clipboard. That is the only use. The extension also reads the popup layout to place the button, and keeps the ID of the clicked event in memory while the page is open in order to build the event URL.

**Storage and transmission.** The extension does not send any data to external servers, does not store data in browser storage or files, does not sell or share data with third parties, and contains no analytics or tracking.

**Scope.** The extension runs only on `https://calendar.google.com/calendar/*`.

**Contact.** Please open an issue at <https://github.com/yut0takagi/gcal-copy-ext/issues>.
