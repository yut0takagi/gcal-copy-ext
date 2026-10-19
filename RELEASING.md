# リリース手順

バージョン番号のタグを push すると、GitHub Actions（[release.yml](.github/workflows/release.yml)）が次の順に処理します。

1. タグと manifest.json の `version` が一致するか確かめる
2. 開発用のファイル（`.github/`、`*.md`、`.gitignore`）を除いて zip にする
3. zip に出どころの署名（attestation）を付ける
4. Chrome ウェブストアに zip をアップロードし、審査に提出する
5. GitHub Release を作り、zip を添付する

審査に提出するときは `STAGED_PUBLISH` を指定しています。審査に通っても自動では公開されないので、デベロッパー ダッシュボードから手動で公開します。

## 新しいバージョンを出す

1. manifest.json の `version` を上げる。番号は `0.5.1` のように3桁で書く。ストアにある版より大きい番号でないと、アップロードが失敗する
2. コミットしてから、同じ番号のタグを付けて push する

   ```bash
   git commit -am "Bump version to 0.5.1"
   git tag 0.5.1
   git push origin main 0.5.1
   ```

3. GitHub の Actions 画面で、ワークフローが最後まで通ったか確かめる
4. 審査に通ったという通知が届いたら、デベロッパー ダッシュボードで公開する

## 最初に1回だけ必要な準備

GitHub に秘密鍵や refresh token は置きません。GitHub Actions が発行する OIDC トークンを Workload Identity Federation（WIF）で Google Cloud の短命なトークンに替え、サービスアカウントとして API を呼びます。

### 1. Google Cloud にサービスアカウントと WIF を作る

`PROJECT_ID` には、使う Google Cloud プロジェクトの ID を入れてください。

```bash
PROJECT_ID=<プロジェクト ID>
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REPO=yut0takagi/gcal-copy-ext

gcloud services enable chromewebstore.googleapis.com iamcredentials.googleapis.com \
  --project "$PROJECT_ID"

gcloud iam service-accounts create cws-publisher --project "$PROJECT_ID"

gcloud iam workload-identity-pools create github \
  --project "$PROJECT_ID" --location global

# このリポジトリの、タグの push で動いたワークフローにだけトークンを出す
gcloud iam workload-identity-pools providers create-oidc gcal-copy-ext \
  --project "$PROJECT_ID" --location global --workload-identity-pool github \
  --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository == '${REPO}' && assertion.ref.startsWith('refs/tags/')"

gcloud iam service-accounts add-iam-policy-binding \
  "cws-publisher@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}"
```

プロジェクトにすでに `github` という名前のプールがあれば、プールの作成は飛ばして、そのプールにプロバイダを追加します。

### 2. Chrome ウェブストアにサービスアカウントを登録する

デベロッパー ダッシュボードの設定ページで、サービスアカウントのメールアドレス（`cws-publisher@<プロジェクト ID>.iam.gserviceaccount.com`）を登録します。登録できるサービスアカウントは、パブリッシャーごとに1つだけです。

### 3. GitHub のリポジトリ変数を設定する

どれも秘密情報ではないので、Secrets ではなく Variables に入れます。

| 変数 | 値 | 確認する場所 |
|---|---|---|
| `CWS_PUBLISHER_ID` | パブリッシャー ID | ダッシュボードの「パブリッシャー > 設定」 |
| `CWS_EXTENSION_ID` | 拡張機能のアイテム ID（32 文字） | ダッシュボードのアイテム一覧 |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<プロジェクト番号>/locations/global/workloadIdentityPools/github/providers/gcal-copy-ext` | 手順 1 の `PROJECT_NUMBER` |
| `GCP_SERVICE_ACCOUNT` | `cws-publisher@<プロジェクト ID>.iam.gserviceaccount.com` | 手順 1 で作ったもの |

```bash
gh variable set CWS_PUBLISHER_ID --body "<パブリッシャー ID>"
gh variable set CWS_EXTENSION_ID --body "<アイテム ID>"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --body "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/gcal-copy-ext"
gh variable set GCP_SERVICE_ACCOUNT --body "cws-publisher@${PROJECT_ID}.iam.gserviceaccount.com"
```

## 参考

- [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
- [Use a service account with the Chrome Web Store API](https://developer.chrome.com/docs/webstore/service-accounts)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)
