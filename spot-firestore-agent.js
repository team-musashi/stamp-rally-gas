// Firestoreを操作するクラス
class SpotFirestoreAgent {
  constructor(firebaseAuth, stampRallyCollectionName, spotCollectionName) {
    // FirestoreAppを生成する
    this.firestore = FirestoreApp.getFirestore(firebaseAuth.email, firebaseAuth.key, firebaseAuth.projectId);

    // コレクション名
    this.stampRallyCollectionName = stampRallyCollectionName;
    this.spotCollectionName = spotCollectionName;
  }

  // 公開スポットドキュメントを上書き保存する
  updateSpotDocuments(stampRallyId, spots) {
    for (const id in spots) {
      const data = spots[id];
      const path = this.stampRallyCollectionName + '/' + stampRallyId + '/' + this.spotCollectionName + '/' + id;
      try {
        const doc = this.firestore.getDocument(path);
        console.log(doc.fields);
        console.log(doc.fields.geopoint);
        console.log(doc.fields.geopoint.geoPointValue);
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