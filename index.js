// メンテナンス中は true にすること
const MAINTENANCE = false;

// 開発環境のFirestoreへ公開スタンプラリーをアップロードする
function uploadToDev() {
  const logger = new Logger(SPREAD_SHEET_ID, '管理者用', 'D5');
  checkMaintenance(logger);
  const uploader = new StampRallyUploader('dev', logger);
  uploader.run();
}

// 開発環境のFirestoreへ公開スタンプラリーをアップロードする（開発者向け）
function uploadToDevDebug() {
  const logger = new Logger(SPREAD_SHEET_ID, '管理者用', 'D5');
  const uploader = new StampRallyUploader('dev', logger);
  uploader.run();
}

// 本番環境のFirestoreへ公開スタンプラリーをアップロードする
function uploadToProd() {
  const logger = new Logger(SPREAD_SHEET_ID, '管理者用', 'D8');
  checkMaintenance(logger);
  const uploader = new StampRallyUploader('prod', logger);
  uploader.run();
}

// メンテナンス中ならダイアログを表示して例外を投げる
function checkMaintenance(logger) {
  if (!MAINTENANCE) {
    return;
  }

  const dialog = new Dialog(logger);
  dialog.showAlertDialog('連絡', 'メンテナンス中です。しばらくお待ちください。');
  throw Error('メンテナンス中です');
}

// 作業対象のスプレッドシート
const SPREAD_SHEET_ID = '1qDobYq0K2iJQzpKhFXX6yir1TT_rvhvuGXwBtXgG3Bs';
const SPREAD_SHEET_R_SHEET_NAME = '公開スタンプラリー';
const SPREAD_SHEET_R_START_ROW = 1;
const SPREAD_SHEET_S_SHEET_NAME = '公開スポット';
const SPREAD_SHEET_S_START_ROW = 1;

// Firebase Firestore
const COLLECTION_NAME_STAMP_RALLY = 'publicStampRally';
const COLLECTION_NAME_SPOT = 'publicSpot';

// スプレッドシートの公開スタンプラリーをアップロードする
class StampRallyUploader {
  constructor(flavor, logger) {
    this.flavor = flavor;
    this.logger = logger;
  }

  // 実行する
  run() {
    const dialog = new Dialog(this.logger);

    if (this.flavor == 'prod') {
      if (!dialog.showConfirmDialog('確認', '本当に本番環境へアップロードを実行しますか？')) {
        this.logger.log('キャンセルしました。');
        return;
      }
    }

    try {
      const stampRallySpreadSheetAgent = new StampRallySpreadSheetAgent(SPREAD_SHEET_ID, SPREAD_SHEET_R_SHEET_NAME, SPREAD_SHEET_R_START_ROW, this.logger);

      this.logger.log('*** 公開スタンプラリーを検証をします。');
      stampRallySpreadSheetAgent.validate();
      this.logger.log('*** 公開スタンプラリーは正常です。');

      this.logger.log('*** 公開スタンプラリーを作成中です。');
      const stampRallies = stampRallySpreadSheetAgent.getStampRallies();
      this.logger.log('*** 公開スタンプラリーを' + Object.keys(stampRallies).length + '件作成しました。');

      const spotSpreadSheetAgent = new SpotSpreadSheetAgent(SPREAD_SHEET_ID, SPREAD_SHEET_S_SHEET_NAME, SPREAD_SHEET_S_START_ROW, this.logger);

      this.logger.log('*** 公開スポットを検証をします。');
      spotSpreadSheetAgent.validate();
      this.logger.log('*** 公開スポットは正常です。');

      this.logger.log('*** 公開スポットを作成中です。');
      const spotsList = spotSpreadSheetAgent.getSpots();
      let spotsLength = 0;
      for (const stampRallyId in spotsList) {
        const spots = spotsList[stampRallyId];
        for (const _ in spots) {
          spotsLength += 1;
        }
      }
      this.logger.log('*** 公開スポットを' + spotsLength + '件作成しました。');

      // 0件なら処理終了
      const stampRalliesCount = stampRallySpreadSheetAgent.getRowsForUpdateCount();
      const spotsCount = spotSpreadSheetAgent.getRowsForUpdateCount();
      if (stampRalliesCount == 0 && spotsCount == 0) {
        dialog.showAlertDialog('エラー', 'アップロードする公開スタンプラリーおよびスポットがありません。');
        return;
      }

      // アップロード前に確認する
      if (!dialog.showConfirmDialog('確認', stampRalliesCount + ' 件の公開スタンプラリーと' + spotsCount + '件の公開スポットをアップロードしますか？「はい」を押すとアップロードを開始します。')) {
        this.logger.log('キャンセルしました。');
        return;
      }

      const firebaseAuth = new FirebaseAuth(this.flavor);

      // Firestoreへ上書き保存する
      const stampRallyFirestoreAgent = new StampRallyFirestoreAgent(firebaseAuth, COLLECTION_NAME_STAMP_RALLY);
      this.logger.log('*** Firestore上の公開スタンプラリー ' + Object.keys(stampRallies).length + ' 件を上書き保存中です。');
      stampRallyFirestoreAgent.updateStampRallyDocuments(stampRallies);
      this.logger.log('*** Firestore上の公開スタンプラリー ' + Object.keys(stampRallies).length + ' 件を上書き保存しました。');

      const spotRallyFirestoreAgent = new SpotFirestoreAgent(firebaseAuth, COLLECTION_NAME_STAMP_RALLY, COLLECTION_NAME_SPOT);
      for (const stampRallyId in spotsList) {
        const spots = spotsList[stampRallyId];
        this.logger.log('*** Firestore上の' + stampRallyId + 'の公開スポット ' + Object.keys(spots).length + ' 件を上書き保存中です。');
        spotRallyFirestoreAgent.updateSpotDocuments(stampRallyId, spots);
        this.logger.log('*** Firestore上の' + stampRallyId + 'の公開スポット ' + Object.keys(spots).length + ' 件を上書き保存中しました。');
      }

      this.logger.log('*** アップロード処理が正常に完了しました。');

    } catch (e) {
      this.logger.error(e);
      this.logger.error('エラーが発生したためアップロード処理を中断しました。');
      dialog.showAlertDialog('エラー', e);
    }
  }

}

// ダイアログクラス
class Dialog {
  constructor(logger) {
    this.logger = logger;
  }

  // アラートダイアログを表示する
  showAlertDialog(title, message) {
    try {
      const ui = SpreadsheetApp.getUi();
      console.log('[Dialog] アラートダイアログを表示中です。');
      ui.alert(title, message, ui.ButtonSet.OK);
    } catch (e) {
      // do nothing
    }
  }

  // 確認ダイアログを表示する
  // 「はい」が押下されたらtrueを、それ以外はfalseを返す
  showConfirmDialog(title, message) {
    try {
      const ui = SpreadsheetApp.getUi();
      console.log('[Dialog] 確認ダイアログを表示中です。');
      const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
      return response == ui.Button.YES;
    } catch (e) {
      // do nothing
    }
    return true;
  }
}

// ロガークラス
class Logger {
  constructor(spreadSheetId, sheetName, logCell) {
    try {
      this.spreadSheet = SpreadsheetApp.openById(spreadSheetId);
    } catch {
      throw Error('不明なスプレッドシートIDです： ' + spreadSheetId);
    }

    this.sheet = this.spreadSheet.getSheetByName(sheetName);
    if (!this.sheet) {
      throw Error('不明なシート名です： ' + sheetName);
    }

    this.cell = this.sheet.getRange(logCell);
    this.cell.setValue('');
    this.maxMessageLines = 10;
  }

  log(obj) {
    console.log(obj);
    this.appendMessage(`${this.getDateString()}${obj.toString()}`);
  }

  error(obj) {
    console.error(obj);
    this.appendMessage(`${this.getDateString()}【エラー】${obj.toString()}`);
  }

  getDateString() {
    const date = new Date();
    return `【${date.toLocaleString()}】`;
  }

  appendMessage(message) {
    let messages = this.cell.getValue().toString().split('\n');
    messages.push(message);
    if (messages.length > this.maxMessageLines) {
      messages = messages.slice(1, this.maxMessageLines + 1);
    }
    this.cell.setValue(messages.join('\n'));
  }
}
