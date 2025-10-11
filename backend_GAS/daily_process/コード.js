/*日付と時間の取得*/
function getCurrentDateTime(){
  const now = new Date();   //現在の日付と時間でDateオブジェクトを作成
  const timezone = "Asia/Tokyo";   //タイムゾーンを指定
  
  /*Utilities.formatDate()で指定の形式に変換*/
  const date = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');   // 出力例: '2025-09-03'
  const time = Utilities.formatDate(now, timezone, 'HH-mm');        // 出力例: '03-15'

  /*曜日の取得*/
  const formatted_date_string = Utilities.formatDate(now, timezone, 'yyyy/MM/dd HH:mm:ss');   //現在の日時の情報を変換："2025/09/06 17:27:00"
  const date_in_timezone = new Date(formatted_date_string);   //Dateオブジェクトに変換
  const dayIndex = date_in_timezone.getDay();   //曜日の情報を取得：日曜日0.0～土曜日6.0まで数値で返ってくる

  const date_time = [date, time, dayIndex];
  
  Logger.log(date_time);
  return date_time;   //['date', 'time', 0.0〜6.0]

}


/*スクリプトプロパティの値を取得*/
const properties = PropertiesService.getScriptProperties();
const API_KEY = properties.getProperty('OpenAI_API_Key');
const DB_URL = properties.getProperty('DB_URL');


/*スプレッドシートの特定のシートを取得*/
function connect_DB(sheet_name){

  const spredsheetID = DB_URL;
  const sheetName = sheet_name;
  
  //IDでスプレッドシートを開く
  const ss = SpreadsheetApp.openById(spredsheetID);

  // シート名で特定のシートを取得
  const sheet = ss.getSheetByName(sheetName);

  // シートが見つからない場合はエラーを出す
  if (!sheet) {
    Logger.log('エラー: get_DB_quizにて、指定されたシートが見つかりません。');
    return;
  }

  return sheet;
}


/*なぞなぞの過去問を取得*/
function get_DB_quiz(){
  /*各曜日ごとの問題を入れる配列*/
  let Sunday_value = [];
  let Monday_value = [];
  let Tuesday_value = [];
  let Wednesday_value = [];
  let Thursday_value = [];
  let Friday_value = [];
  let Saturday_value = [];

  // 取得したいデータの範囲を定義
  const lastRow = connect_DB('TodaysQuiz').getLastRow();   //シートの最後にデータが入力されている行番号を取得。データが入力されている一番下の行のインデックス（番号）を返す。
  const range = connect_DB('TodaysQuiz').getRange(2, 2, lastRow - 1, 3);   //データの範囲を指定。（スタート行 , スタート列 , 開始行から下に何行分のデータを含めるか（２行目スタートのため１引く） , 開始列から右に何列分のデータを含めるか）

  // 値を取得（戻り値は二次元配列）
  const values = range.getValues();   
  Logger.log(values);
  for(let i = 0; i < values.length; i++){
    const row = values[i];
    //Logger.log(row);

    /*D列の値 (row[3]) によって問題を代入する配列を変える*/
    if(row[2] === 0.0){
      Sunday_value.push(row[0]);   //文字列のみを代入しているため、１次元配列。
    }
    else if(row[2] === 1.0){
      Monday_value.push(row[0])
    }
    else if(row[2] === 2.0){
      Tuesday_value.push(row[0])
    }
    else if(row[2] === 3.0){
      Wednesday_value.push(row[0])
    }
    else if(row[2] === 4.0){
      Thursday_value.push(row[0])
    }
    else if(row[2] === 5.0){
      Friday_value.push(row[0])
    }
    else if(row[2] === 6.0){
      Saturday_value.push(row[0])
    }
    else{
      Logger.log('曜日の数値が間違っているかnullになっています。')
    }
  }

  const past_questions = [Sunday_value, Monday_value, Tuesday_value, Wednesday_value, Thursday_value, Friday_value, Saturday_value];
  //Logger.log('past_question' + past_questions);
  const date = getCurrentDateTime();
  Logger.log('get_DB_quizのreturn:' + [past_questions[date[2]]]);
  return [past_questions[date[2]]];   //二次元配列を返す　例：[['過去問１', '過去問２', '過去問３',...]]

}


/*なぞなぞの作成*/
function make_quiz(){
  const prompt = connect_DB('AI_Prompt').getRange(1, 1, 7, 1).getValues();
  const date = getCurrentDateTime();
  const use_prompt = prompt[date[2]];
  const GPT_ans = GPT_connect.connect_GPT(use_prompt, get_DB_quiz());
  const quiz = GPT_ans.split(',');
  Logger.log(use_prompt);
  Logger.log(quiz);

  return quiz;   //['question', 'answer']

}


/*スプレッドシートに入力*/
function ss_add_quiz(){
  
  /*日付の取得*/
  const today = getCurrentDateTime();
  const setting_time = today[0];
  const day_of_the_week = today[2];

  /*なぞなぞの内容を取得*/
  const quizData = make_quiz();
  const content = [setting_time, ...  quizData, day_of_the_week]
  const f_content = [setting_time, ...quizData];   //FiveDaysLog用

  /*日付の情報をインデックス0に代入
  content.splice(0, 0, setting_time);   //(開始位置, 削除する数, 追加する要素１, 追加する要素２, ...)
  f_content.splice(0, 0, setting_time);
  
  content.push(day_of_the_week);   //曜日の情報を配列の最後に追加
  */

  /*二次元配列に変換*/
  const content_array = [content];  
  const f_content_array = [f_content];  //曜日の情報なし
  
  /*範囲の指定*/
  const lastRow = connect_DB('TodaysQuiz').getLastRow();
  const range = connect_DB('TodaysQuiz').getRange(lastRow + 1, 1, 1, 4);   // (開始行, 開始列, 行数, 列数)

  Logger.log(content_array);

  // 範囲にまとめてデータを入力
  range.setValues(content_array);

  /*FiveDaysLogにも追加*/
  const f_lastRow = connect_DB('FiveDaysLog').getLastRow();
  const f_range = connect_DB('FiveDaysLog').getRange(f_lastRow + 1, 1, 1, 3);
  f_range.setValues(f_content_array);

  /*FiveDaysLogの最初の行を削除*/
  const delete_sheet = connect_DB('FiveDaysLog');
  delete_sheet.deleteRow(2);  

}


/*20時に定期実行
function daily_process(){
  DB_process.delete_TodayAnswer();
  ss_add_quiz();
  DB_process.delete_TodaysQuiz();
}
*/






