// スタンプラリーコマンド定数群
const COMMAND_ENTRY_STAMP_RALLY = 'enterStampRally'         // 参加
const COMMAND_COMPLETE_STAMP_RALLY = 'completeStampRally'   // 完了
const COMMAND_WITHDROW_STAMP_RALLY = 'withdrawStampRally'   // 中断
const COMMAND_CALCULATE_ROUTE = 'calculateRoute';           // 経路算出

// Firestoreを操作するクラス
class CommandFirestoreAgent {
    constructor(firebaseAuth, commandCollectionName) {
      // FirestoreAppを生成する
      this.firestore = FirestoreApp.getFirestore(firebaseAuth.email, firebaseAuth.key, firebaseAuth.projectId);
  
      // コレクション名
      this.commandCollectionName = commandCollectionName;
    }
  
    // 経路算出コマンドドキュメントを保存する
    createCalculateRouteCommandDocuments(stampRallies) {
      for (const id in stampRallies) {
        const data = {
            commandType: COMMAND_CALCULATE_ROUTE,
            data: {stampRallyId : id},
            uid: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        // commandコレクションに経路算出コマンドドキュメントを新規追加
        const path = this.commandCollectionName + '/' + id;
        this.firestore.updateDocument(path, data, true);
      }
    }
  }