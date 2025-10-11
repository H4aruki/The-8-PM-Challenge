
/**
 * フロントエンドからのJSONPリクエストを処理するメイン関数
 * @param {Object} e - doGetイベントオブジェクト
 * @return {GoogleAppsScript.Content.TextOutput} - JSONP形式のレスポンス
 */
function doGet(e) {
  // フロントエンドが指定したコールバック関数名を取得
  const callback = e.parameter.callback;
  let responseData;

  try {
    // フロントエンドからのパラメータは 'params' というキーでJSON文字列として受け取る
    const params = JSON.parse(e.parameter.params || '{}');

    switch(params.action) {
      case "gettodaysQuiz":
        responseData = { ok: true, quiz: getTodaysQuiz() };
        break;

      case "getRecentData":
        responseData = { ok: true, history: getRecentData() };
        break;

      case "getCorrectUser":
        responseData = { ok: true, list: getCorrectUser() };
        break;

      case "addAnswer":
        // フロントエンドから送られた解答データは params.payload に入っている
        const resultMessage = addAnswer(params.payload);
        responseData = { ok: true, message: resultMessage };
        break;

      default:
        throw new Error("不明なアクションです。");
    }
  } catch (error) {
    // エラーが発生した場合も、フロントエンドが処理しやすいように ok: false を含めて返す
    responseData = { ok: false, message: error.message };
  }

  // レスポンスを "callback(JSONデータ);" という形のJavaScriptコードとして返す
  const jsonpOutput = `${callback}(${JSON.stringify(responseData)})`;
  
  return ContentService.createTextOutput(jsonpOutput)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}


/* --- 各アクションに対応する関数群 --- */

/**
 * 1. ユーザーの解答をスプレッドシートに記録する
 * @param {Object} payload - フロントエンドから送られた解答データ { userName, answer, date }
 * @return {string} - 完了メッセージ
 */
function addAnswer(payload) {
  const { userName, answer, date } = payload;

  if (!date || !userName || !answer) {
    throw new Error("日付、ユーザー名、解答すべての情報が必要です。");
  }

  const params_array = [[date, userName, answer]];
  const sheet = daily_process.connect_DB('TodayAnswer');
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow + 1, 1, 1, 3);
  
  range.setValues(params_array);
  return "解答を記録しました。";
}

/**
 * 2. 今日のクイズを取得する
 * (変更なし)
 */
function getTodaysQuiz() {
  const sheet = daily_process.connect_DB('TodaysQuiz');
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow, 1, 1, 2);
  const data = range.getValues()[0];
  const quizData = {
    date: data[0],
    text: data[1]
  };
  return quizData;
}

/**
 * 3. 過去5日間の記録を取得する
 * (変更なし)
 */
function getRecentData() {
  const sheet = daily_process.connect_DB('FiveDaysLog');
  const range = sheet.getRange(2, 1, 5, 4);
  const data = range.getValues();

  const historyData = data.map(row => {
    const correctUsers = row[3] ? String(row[3]).split(',').map(name => name.trim()) : [];
    return {
      date: row[0],
      quizText: row[1],
      answers: row[2],
      correctUsers: correctUsers
    };
  });
  return historyData;
}

/**
 * 4. 過去5日間のすべての正解者リストを取得する
 * (変更なし)
 */
function getCorrectUser() {
  const sheet = daily_process.connect_DB('FiveDaysLog');
  const range = sheet.getRange(2, 4, 5, 1);
  const data = range.getValues();
  const allUsers = [];
  data.forEach(row => {
    if (row[0]) {
      const users = String(row[0]).split(',').map(name => name.trim());
      allUsers.push(...users);
    }
  });
  const uniqueUsers = [...new Set(allUsers)];
  return uniqueUsers;
}


// daily_process.connect_DB('sheetName') は別途定義されている前提です



function test_getRecentData() {
  try {
    const data = getRecentData();
    // 取得したデータを、見やすいように整形してログに出力します
    Logger.log(JSON.stringify(data, null, 2));
  } catch (e) {
    Logger.log("エラーが発生しました: " + e.message);
  }
}

















