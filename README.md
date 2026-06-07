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

## 開発

```bash
npm install
npm run dev      # 開発サーバ
npm run build    # 型チェック + 本番ビルド (dist/)
npm run preview  # ビルド結果のプレビュー
```

## 使用 API

| 用途 | エンドポイント |
|---|---|
| 全曲取得（chunirec ベース, 動画込み） | `.../exec?gameType=chunithm&includeVideos=true` |
| ユーザーデータ（chunirec showall プロキシ） | `.../exec?user_name=<ユーザーID>` |

URL は `src/api.ts` に定義。

> **注意:** ユーザーデータ用プロキシ（`GAS/ChunirecUserDataProxy`）は、
> 譜面ごとのスコアを返す `records/showall.json` をプロキシするよう更新済みです。
> **GAS 側を再デプロイ** すると、達成状況・スコア・未プレイ除外の絞り込みが有効になります。
> 再デプロイ前は `records/profile.json` を返すため、これらの機能は無効化されます
> （`records` が無いレスポンスは自動でスコア無効モードにフォールバック）。

## データ仕様メモ

- 対象は各曲の `data.MAS` / `data.ULT`。`WORLD'S END` はジャンル・難易度ともに対象外。
- 譜面ごとのユーザースコアは `id + diff` で全曲データにマージ。
- 動画の長さ（`meta.videoLengthSec`）が無い譜面は、動画長フィルタ指定時に除外。
