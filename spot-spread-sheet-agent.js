const HEADER_NAME_S_IS_UPDATE = 'アップデートする';
const HEADER_NAME_S_STAMP_RALLY_ID = '公開スタンプラリーID';
const HEADER_NAME_S_ORDER = '順番';
const HEADER_NAME_S_ID = '公開スポットID';
const HEADER_NAME_S_TITLE = '名称';
const HEADER_NAME_S_SUMMARY = '概要';
const HEADER_NAME_S_ADDRESS = '住所';
const HEADER_NAME_S_TEL = '電話番号';
const HEADER_NAME_S_IMAGE_URL = '画像URL';
const HEADER_NAME_S_LAT = '緯度';
const HEADER_NAME_S_LONG = '経度';

// 公開スポットのSpreadSheetを操作するクラス
class SpotSpreadSheetAgent {
  constructor(spreadSheetId, sheetName, startRow, logger) {
    this.startRow = startRow;
    this.logger = logger;

    try {
      this.spreadSheet = SpreadsheetApp.openById(spreadSheetId);
    } catch {
      throw Error('不明なスプレッドシートIDです： ' + spreadSheetId);
    }

    this.sheet = this.spreadSheet.getSheetByName(sheetName);
    if (!this.sheet) {
      throw Error('不明なシート名です： ' + sheetName);
    }

    // ヘッダ行の定義
    this.headerNames = [
      HEADER_NAME_S_IS_UPDATE,
      HEADER_NAME_S_STAMP_RALLY_ID,
      HEADER_NAME_S_ORDER,
      HEADER_NAME_S_ID,
      HEADER_NAME_S_TITLE,
      HEADER_NAME_S_SUMMARY,
      HEADER_NAME_S_ADDRESS,
      HEADER_NAME_S_TEL,
      HEADER_NAME_S_IMAGE_URL,
      HEADER_NAME_S_LAT,
      HEADER_NAME_S_LONG,
    ];

    const logPrefix = '[準備] ';

    // ヘッダ行（1行目）
    this.logger.log(logPrefix + 'ヘッダ行を検証中です。');
    const names = this.sheet.getRange(startRow, 1, 1, this.headerNames.length).getValues()[0];
    for (const i in this.headerNames) {
      if (names[i] != this.headerNames[i]) {
        throw Error('1行目のヘッダ行の名前に誤りがあります: ' + names[i]);
      }
    }

    // 順番は連番になっているはず
    this.logger.log(logPrefix + HEADER_NAME_S_ORDER + 'を検証中です。');
    const orders = [];
    const orderColIndex = this.getColIndex(HEADER_NAME_S_ORDER);
    this.sheet.getRange(startRow + 1, orderColIndex, 500, 1).getValues().forEach(function(v) {
      orders.push(v[0].toString().trim());
    });

    this.effectiveOrders = [];
    let currentOrder = orders[0];
    for (const order of orders) {
      if (!order) {
        // 空白を見つけたら処理を終了する
        break;
      }
      // if (currentOrder != order) {
      //   throw Error('通番が連番になっていません: ' + order);
      // }
      this.effectiveOrders.push(order);
      currentOrder++;
    }
    this.logger.log(logPrefix + '全公開スポット数は ' + this.effectiveOrders[0] + ' 〜 ' + this.effectiveOrders[this.effectiveOrders.length - 1] + ' までの ' + this.effectiveOrders.length + ' 件です。');

    // 上書き対象の行を抽出する
    this.rowsForUpdate = {};
    const allRows = this.sheet.getRange(startRow + 1, 1, this.effectiveOrders.length, this.headerNames.length).getValues();
    for (const i in allRows) {
      const _data = allRows[i];
      if (_data[0]) {
        const rowIndex = parseInt(i) + startRow + 1; // 行番号
        const data = {};
        for (const i in _data) {
          data[this.headerNames[i]] = _data[i];
        }
        this.rowsForUpdate[rowIndex] = data;
      }
    }
    this.logger.log(logPrefix + 'Firestoreへの上書き対象の公開スポット数は ' + Object.keys(this.rowsForUpdate).length + ' 件です。');
    // this.logger.log(this.rowsForUpdate);
  }

  // アップデート対象の問題行数を返す
  getRowsForUpdateCount() {
    return Object.keys(this.rowsForUpdate).length;
  }

  // ヘッダ名の列インデックスを返す
  getColIndex(headerName) {
    return this.headerNames.findIndex((name) => name == headerName) + 1;
  }

  // 公開スポットが問題ないかを検証する
  // 問題がある場合はErrorをthrowする
  validate() {
    const logPrefix = '[検証] ';
    let num = 1;
    for (const rowIndex in this.rowsForUpdate) {
      const rowValues = this.rowsForUpdate[rowIndex];
      if (num % 10 == 1) {
        this.logger.log(logPrefix + ' ( ' + num + ' 〜 ' + (num + 9) + ' / ' + Object.keys(this.rowsForUpdate).length + ' ) の公開スポットを検証中です。');
      }
      num++;

      // 公開スタンプラリーID
      let headerName = HEADER_NAME_S_STAMP_RALLY_ID;
      let value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 順番
      headerName = HEADER_NAME_S_ORDER;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);
      this.validateNumber(value, headerName, rowIndex);

      // 公開スポットID
      headerName = HEADER_NAME_S_ID;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 名称
      headerName = HEADER_NAME_S_TITLE;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 概要
      headerName = HEADER_NAME_S_SUMMARY;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 住所はなくてもよい
      
      // 電話番号はなくてもよい

      // 画像URL
      headerName = HEADER_NAME_S_IMAGE_URL;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 緯度
      headerName = HEADER_NAME_S_LAT;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);
      this.validateNumber(value, headerName, rowIndex);

      // 経度
      headerName = HEADER_NAME_S_LONG;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);
      this.validateNumber(value, headerName, rowIndex);
    }
  }

  // 値が存在しているはず
  validateRequired(value, headerName, rowIndex) {
    if (!value.toString().trim()) {
      throw Error(headerName + 'の値が空です(' + rowIndex + '行目)');
    }
  }

  // 数字であるはず
  validateNumber(value, headerName, rowIndex) {
    const n = parseInt(value.toString().trim());
    if (isNaN(n)) {
      throw Error(headerName + 'が数字ではありません(' + rowIndex + '行目): ' + value);
    }
  }

  // 日付けであるはず
  validateDate(value, headerName, rowIndex) {
    const dateString = value.toString();

    /** 妥当性チェックに使用する正規表現 */
    const regex = /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/;

    if (!dateString || !regex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);

    /** 文字列から抽出した各日付情報 */
    const [year, month, day] = dateString.split(/[\/\-\.]/);

    const result = (
      date.getFullYear() === Number(year) &&
      date.getMonth() + 1 === Number(month) &&
      date.getDate() === Number(day)
    );
    if (!result) {
      throw Error(headerName + 'が日付ではありません(' + rowIndex + '行目): ' + value);
    }
  }

  // 公開スポットのリストを返す
  getSpots() {
    /// 公開スタンプラリーIDのリストを取得する
    const stampRallyIds = new Set();
    for (const rowIndex in this.rowsForUpdate) {
      const rowValues = this.rowsForUpdate[rowIndex];
      const stampRallyId = rowValues[HEADER_NAME_S_STAMP_RALLY_ID].toString().trim();
      stampRallyIds.add(stampRallyId);
    }

    const stampRallies = {};
    for (const targetStampRallyId of stampRallyIds) {
      stampRallies[targetStampRallyId] = {};

      // 公開スポットを生成する
      for (const rowIndex in this.rowsForUpdate) {
        const rowValues = this.rowsForUpdate[rowIndex];
        const stampRallyId = rowValues[HEADER_NAME_S_STAMP_RALLY_ID].toString().trim();
        if (targetStampRallyId != stampRallyId) {
          continue;
        }

        const id = rowValues[HEADER_NAME_S_ID].toString().trim();
        const address = rowValues[HEADER_NAME_S_ADDRESS].toString().trim();
        const tel = rowValues[HEADER_NAME_S_TEL].toString().trim();
        stampRallies[stampRallyId][id] = {
          order: parseInt(rowValues[HEADER_NAME_S_ORDER]),
          title: rowValues[HEADER_NAME_S_TITLE].toString().trim(),
          summary: rowValues[HEADER_NAME_S_SUMMARY].toString().trim(),
          address: address.length == 0 ? null : address,
          tel: tel.length == 0 ? null : tel,
          imageUrl: rowValues[HEADER_NAME_S_IMAGE_URL].toString().trim(),
          location: {
            latitude: parseFloat(rowValues[HEADER_NAME_S_LAT]),
            longitude: parseFloat(rowValues[HEADER_NAME_S_LONG]),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    return stampRallies;
  }

}