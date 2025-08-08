# VTK Scalar Visualizer VS Code Extension

VTKファイル内のスカラーデータを可視化するVS Code拡張機能です。インタラクティブなカラーマップと凡例を使用して、2D構造格子データを表示します。

## 機能

- **VTKファイルの自動認識**: `.vtk`ファイルを開くと自動的にビジュアライザーが起動
- **複数スカラーフィールド対応**: ファイル内の全てのスカラーデータを切り替え表示
- **豊富なカラーマップ**: 13種類のD3.jsカラースキーム（Viridis、Plasma、Inferno等）
- **範囲調整機能**: 自動範囲設定または手動での最小値・最大値設定
- **インタラクティブな凡例**: カラースケールと値のラベル表示
- **ファイル間ナビゲーション**: 同一ディレクトリ内のVTKファイルシーケンスを順次表示
- **スパース番号対応**: 飛び飛びの番号（例：000500, 001000, 001500）のファイルシーケンスに対応
- **タブタイトル更新**: 現在表示中のファイル名がVS Codeのタブに表示
- **設定保持機能**: ナビゲーション時にカラーレンジやスカラーフィールドの設定を保持
- **VS Codeテーマ対応**: エディタのテーマに合わせた統一的な外観

## インストール方法

### 前提条件
- Node.js 16.x 以上
- VS Code 1.60.0 以上

### 開発環境でのインストール

1. このリポジトリをクローンまたはダウンロード
2. ターミナルで拡張機能のディレクトリに移動
3. 依存関係をインストール:
   ```bash
   npm install
   ```
4. VS Codeで拡張機能フォルダを開く
5. `F5`キーを押して拡張機能をデバッグモードで実行

### パッケージ化してインストール

1. VS Code Extension Manager (vsce)をインストール:
   ```bash
   npm install -g vsce
   ```
2. 拡張機能をパッケージ化:
   ```bash
   vsce package
   ```
3. 生成された`.vsix`ファイルをVS Codeにインストール:
   - VS Codeのコマンドパレット（`Ctrl+Shift+P`）を開く
   - 「Extensions: Install from VSIX...」を選択
   - 生成された`.vsix`ファイルを選択

## 使い方

### VTKファイルを開く

1. **方法1**: エクスプローラーで`.vtk`ファイルをクリック
   - 自動的にVTK Visualizerで開きます

2. **方法2**: 右クリックメニューから開く
   - `.vtk`ファイルを右クリック
   - 「Open with VTK Visualizer」を選択

3. **方法3**: コマンドパレットから開く
   - ファイルを通常のテキストエディタで開いた状態で
   - コマンドパレット（`Ctrl+Shift+P`）を開く
   - 「VTK: Open with VTK Visualizer」を実行

### ビジュアライザーの操作

1. **スカラーデータの選択**
   - 上部のドロップダウンメニューから表示したいスカラーフィールドを選択

2. **カラーマップの変更**
   - Color Mapドロップダウンから好みのカラースキームを選択
   - 利用可能なカラーマップ:
     - Scientific: Viridis, Plasma, Inferno, Magma, Cividis, Turbo
     - Diverging: Rainbow, Cool, Warm
     - Sequential: Blues, Greens, Reds, Greys

3. **値の範囲調整**
   - **自動範囲**: 「Auto Range」チェックボックスをオン（デフォルト）
   - **手動範囲**: 
     1. 「Auto Range」チェックボックスをオフ
     2. Min/Max値を入力
     3. 「Apply」ボタンをクリック

4. **ファイル間ナビゲーション**
   - **Next/Previousボタン**: 同一ディレクトリ内のVTKファイルシーケンスを順次表示
   - **対応パターン**: `filename_001.vtk`, `karman_vortex_000500.vtk` など
   - **スパース番号**: 連続しない番号（000500, 001000, 001500...）にも対応
   - **シーケンス表示**: ファイル名の下に位置情報（例：2/5）を表示
   - **設定保持**: 同じスカラーフィールドでのナビゲーション時は手動範囲設定を保持

## サポートされるVTKファイル形式

現在、以下の形式のVTKファイルをサポートしています:

- VTK Legacy ASCII形式
- STRUCTURED_POINTSデータセット
- POINT_DATAセクション
- SCALARSデータ（float型）

### サンプルVTKファイル形式

```vtk
# vtk DataFile Version 2.0
Sample Temperature Data
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS 100 100 1
SPACING 1.0 1.0 1.0
ORIGIN 0.0 0.0 0.0
POINT_DATA 10000
SCALARS temperature float 1
LOOKUP_TABLE default
23.5 24.1 25.2 26.3 27.4 ...
```

## トラブルシューティング

### ファイルが開かない場合
- VTKファイルがASCII形式であることを確認
- STRUCTURED_POINTSとPOINT_DATAセクションが含まれていることを確認

### 可視化が表示されない場合
- ブラウザの開発者ツール（F12）でエラーメッセージを確認
- VTKファイルの形式が正しいことを確認

### ナビゲーションボタンが動作しない場合
- 同一ディレクトリに他のVTKファイルが存在することを確認
- ファイル名が `basename_number.vtk` パターンに準拠していることを確認
- 例：`data_001.vtk`, `karman_vortex_000500.vtk`

### 設定が保持されない場合
- 同じスカラーフィールド間でのナビゲーション時のみ設定が保持されます
- スカラーフィールドが変わると自動的にAuto Rangeに戻ります

### パフォーマンスが悪い場合
- 大きなVTKファイル（数万点以上）では読み込みに時間がかかる場合があります
- ブラウザのメモリ制限により、非常に大きなデータセットは表示できない場合があります

## 開発者向け情報

### プロジェクト構造
```
vtk_visualizer/
├── src/
│   ├── extension.js         # 拡張機能のエントリーポイント
│   ├── vtkVisualizerProvider.js # カスタムエディタープロバイダー
│   └── webview/
│       ├── main.js          # WebViewのメインロジック
│       ├── style.css        # スタイルシート
│       └── vtkParser.js     # VTKパーサー
├── test/                    # テストファイル
│   ├── fixtures/           # テスト用サンプルファイル
│   ├── mocks/             # モックオブジェクト
│   ├── suite/             # テストスイート
│   ├── extension.test.js   # 拡張機能テスト
│   ├── vtkParser.test.js   # VTKパーサーテスト
│   ├── vtkVisualizerProvider.test.js # プロバイダーテスト
│   ├── webview.test.js     # WebViewテスト
│   ├── integration.test.js # 統合テスト
│   └── runTest.js         # テストランナー
├── media/                  # アイコンなどのメディアファイル
├── reference/             # 参考資料
├── package.json           # 拡張機能の設定
├── .gitignore            # Git除外設定
├── .mocharc.json         # Mochaテスト設定
└── README.md             # このファイル
```

### テストの実行

#### 全てのテストを実行
```bash
npm test
```

#### 個別のテストを実行
```bash
# VTKパーサーのテストのみ
npm run test-parser

# ナビゲーション機能のテストのみ  
npm run test-provider

# WebViewのテストのみ
npm run test-webview

# 統合テストを含む全てのユニットテスト
npm run test-all
```

#### テストファイル
- `test/extension.test.js` - VS Code拡張機能の基本テスト
- `test/vtkParser.test.js` - VTKファイルのパース機能
- `test/vtkVisualizerProvider.test.js` - ファイルナビゲーション機能
- `test/webview.test.js` - WebViewのUI機能
- `test/integration.test.js` - 統合テスト
- `test/fixtures/` - テスト用のサンプルVTKファイル
- `test/mocks/` - VS Code APIのモックオブジェクト

## ライセンス

[MITライセンス](LICENSE)
