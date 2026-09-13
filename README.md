# rec+ — CHUNITHM 譜面フィルタ

chunirec のデータを参照し、CHUNITHM の **MASTER / ULTIMA** 譜面を絞り込み条件で一覧表示する Web ページ。
ChuniRandomTool のデザイン・絞り込みを参考に、Vue 3 + TypeScript + Tailwind CSS v4 で再構築。

## 機能

- chunirec ベースの全曲取得 API から MASTER / ULTIMA 譜面を取得
- chunirec ユーザー ID を入力すると、譜面ごとのスコア・達成状況を反映（任意）
- 絞り込み（ChuniRandomTool 相当 + 動画の長さ）
  - レベル / 定数の範囲
  - ULTIMA を含むか
  - ジャンル（7 ジャンル）
  - 達成済 / 未達成（理論値・99AJ・AJ・SSS+・SSS・SS+・SS）
  - スコア範囲
  - **動画の長さ（秒）** ← 本ツールで追加
  - 未プレイ除外
- 該当譜面を **すべて** 表示（100 件ごとにページング）
- 各行に **譜面保管所（★ → sdvx.in）** と **譜面動画（★ → 動画 URL）** のリンク

## 公開先

https://nurunchu.com/recplus/ （Cloudflare Workers + Static Assets、`wrangler.jsonc`）

## 開発

```bash
npm install
npm run dev         # 開発サーバ (http://localhost:5173/recplus/)
npm run test        # ユニットテスト (動画・統計のマージ)
npm run build       # 型チェック + 本番ビルド (dist/)
npm run dev:worker  # ビルド結果を Worker 経由で確認 (http://localhost:8787/recplus/)
npm run deploy      # ビルドして nurunchu.com/recplus/ にデプロイ
```

## 使用 API

nurunchu.com API（ドキュメント: https://nurunchu.com/docs/api/ ）。URL は `src/api.ts` に定義。

| 用途 | エンドポイント |
|---|---|
| 全曲取得（chunirec ベース） | `GET /api/v1/otoge-music/chunithm` |
| 譜面動画情報 | `GET /api/v1/otoge-music/files/musics/chunithm-videos.json` |
| 達成人数の統計 | `GET /api/v1/otoge-music/files/stats/records_stat_{mas,ult}_num.csv` |
| ユーザーデータ（chunirec / chunisupport プロキシ） | `GET /api/v1/chunithm-userdata-proxy?user_name=<ユーザーID>&source=rec\|support` |

動画情報と統計は `src/musicData.ts` でクライアント側にマージする（旧 GAS API の `includeVideos` / `stat` 相当）。
どちらも無い場合は該当列が空になるだけで、一覧表示は動く。

> 旧 GitHub Pages 版（`docs/`）は GAS の API を参照しており、GAS 停止後は動かなくなる。

## データ仕様メモ

- 対象は各曲の `data.MAS` / `data.ULT`。`WORLD'S END` はジャンル・難易度ともに対象外。
- 譜面ごとのユーザースコアは `id + diff` で全曲データにマージ。
- 動画の長さ（`meta.videoLengthSec`）が無い譜面は、動画長フィルタ指定時に除外。
