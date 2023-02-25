// Firestoreを操作するクラス
class StampRallyFirestoreAgent {
  constructor(firebaseAuth, stampRallyCollectionName) {
    // FirestoreAppを生成する
    this.firestore = FirestoreApp.getFirestore(firebaseAuth.email, firebaseAuth.key, firebaseAuth.projectId);

    // コレクション名
    this.stampRallyCollectionName = stampRallyCollectionName;
  }

  // 公開スタンプラリードキュメントを上書き保存する
  updateStampRallyDocuments(stampRallies) {
    for (const id in stampRallies) {
      const data = stampRallies[id];
      const path = this.stampRallyCollectionName + '/' + id;
      try {
        this.firestore.getDocument(path);
        // 登録済みなら作成日時を削除する
        delete data.createdAt;
      } catch (e) {
        // not found
      }
      // 上書き保存する
      this.firestore.updateDocument(path, data, true);
    }
  }
}