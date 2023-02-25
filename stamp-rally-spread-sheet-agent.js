const HEADER_NAME_R_IS_UPDATE = 'アップデートする';
const HEADER_NAME_R_ORDER = '通番';
const HEADER_NAME_R_ID = '公開スタンプラリーID';
const HEADER_NAME_R_TITLE = '名称';
const HEADER_NAME_R_SUMMARY = '概要';
const HEADER_NAME_R_AREA = 'エリア';
const HEADER_NAME_R_REQUIRED_TIME = '所要時間';
const HEADER_NAME_R_IMAGE_URL = '画像URL';
const HEADER_NAME_R_START_DATE = '開催開始日';
const HEADER_NAME_R_END_DATE = '開催終了日（任意）';

// 公開スタンプラリーのSpreadSheetを操作するクラス
class StampRallySpreadSheetAgent {
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
      HEADER_NAME_R_IS_UPDATE,
      HEADER_NAME_R_ORDER,
      HEADER_NAME_R_ID,
      HEADER_NAME_R_TITLE,
      HEADER_NAME_R_SUMMARY,
      HEADER_NAME_R_AREA,
      HEADER_NAME_R_REQUIRED_TIME,
      HEADER_NAME_R_IMAGE_URL,
      HEADER_NAME_R_START_DATE,
      HEADER_NAME_R_END_DATE,
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

    // 通番は連番になっているはず
    this.logger.log(logPrefix + HEADER_NAME_R_ORDER + 'を検証中です。');
    const orders = [];
    const orderColIndex = this.getColIndex(HEADER_NAME_R_ORDER);
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
      if (currentOrder != order) {
        throw Error('通番が連番になっていません: ' + order);
      }
      this.effectiveOrders.push(order);
      currentOrder++;
    }
    this.logger.log(logPrefix + '全公開スタンプラリー数は ' + this.effectiveOrders[0] + ' 〜 ' + this.effectiveOrders[this.effectiveOrders.length - 1] + ' までの ' + this.effectiveOrders.length + ' 件です。');

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
    this.logger.log(logPrefix + 'Firestoreへの上書き対象の公開スタンプラリー数は ' + Object.keys(this.rowsForUpdate).length + ' 件です。');
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

  // 公開スタンプラリーが問題ないかを検証する
  // 問題がある場合はErrorをthrowする
  validate() {
    const logPrefix = '[検証] ';
    let num = 1;
    for (const rowIndex in this.rowsForUpdate) {
      const rowValues = this.rowsForUpdate[rowIndex];
      if (num % 10 == 1) {
        this.logger.log(logPrefix + ' ( ' + num + ' 〜 ' + (num + 9) + ' / ' + Object.keys(this.rowsForUpdate).length + ' ) の公開スタンプラリーを検証中です。');
      }
      num++;

      // 公開スタンプラリーID
      let headerName = HEADER_NAME_R_ID;
      let value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 名称
      headerName = HEADER_NAME_R_TITLE;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 概要
      headerName = HEADER_NAME_R_SUMMARY;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // エリア
      headerName = HEADER_NAME_R_AREA;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 所要時間
      headerName = HEADER_NAME_R_REQUIRED_TIME;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);
      this.validateNumber(value, headerName, rowIndex);

      // 画像URL
      headerName = HEADER_NAME_R_IMAGE_URL;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);

      // 開催開始日
      headerName = HEADER_NAME_R_START_DATE;
      value = rowValues[headerName];
      this.validateRequired(value, headerName, rowIndex);
      this.validateDate(value, headerName, rowIndex);

      // 開催終了日
      headerName = HEADER_NAME_R_END_DATE;
      value = rowValues[headerName];
      // this.validateRequired(value, headerName, rowIndex);
      this.validateDate(value, headerName, rowIndex);
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

  // 公開スタンプラリーのリストを返す
  getStampRallies() {
    const stampRallies = {};

    // 公開スタンプラリーを生成する
    for (const rowIndex in this.rowsForUpdate) {
      const rowValues = this.rowsForUpdate[rowIndex];
      const id = rowValues[HEADER_NAME_R_ID].toString().trim();
      stampRallies[id] = {
        order: parseInt(rowValues[HEADER_NAME_R_ORDER]),
        title: rowValues[HEADER_NAME_R_TITLE].toString().trim(),
        summary: rowValues[HEADER_NAME_R_SUMMARY].toString().trim(),
        area: rowValues[HEADER_NAME_R_AREA].toString().trim(),
        requiredTime: parseInt(rowValues[HEADER_NAME_R_REQUIRED_TIME]),
        imageUrl: rowValues[HEADER_NAME_R_IMAGE_URL].toString().trim(),
        startDate: new Date(rowValues[HEADER_NAME_R_START_DATE]),
        endDate: rowValues[HEADER_NAME_R_END_DATE] ? new Date(rowValues[HEADER_NAME_R_END_DATE]) : null,
        route: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return stampRallies;
  }

}