# BURRALY GAS
本リポジトリにはGAS（Google Apps Script）に関するコードが含まれています。
## ブランチモデル
本リポジトリでは、数あるブランチ戦略の中でも比較的シンプルな`GitHub Flow`を採用します。

![image](https://user-images.githubusercontent.com/39579511/221331442-e1a4f83f-4e5c-4e47-a1b2-34361ca4c785.png)
### ルール
1. mainブランチは常にデプロイ可能である
1. 作業用ブランチをmainから作成する（例：feature/issue no-x)
1. 作業用ブランチを定期的にプッシュする
1. 作業用ブランチの作業が完了したらプルリクエストを作成する
1. プルリクエストが承認されたらmainブランチへマージする