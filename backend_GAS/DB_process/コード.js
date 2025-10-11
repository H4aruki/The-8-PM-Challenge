/*ユーザーの解答の答え合わせ（データが送られてきたときに逐次実行を想定）*/
function answer_jugde(){
  let lastRow;
  let range;
  
  /*正解を取得*/
  lastRow = daily_process.connect_DB('TodaysQuiz').getLastRow();
  range = daily_process.connect_DB('TodaysQuiz').getRange(lastRow, 3, 1, 1);   // (開始行, 開始列, 行数, 列数)
  const right_answer = range.getValues();

  /*ユーザー名と回答を取得*/
  lastRow = daily_process.connect_DB('TodayAnswer').getLastRow();
  range = daily_process.connect_DB('TodayAnswer').getRange(lastRow, 2, 1, 2);   // (開始行, 開始列, 行数, 列数)
  const user_data = range.getValues();   //[['username', 'answer']]

  /*既存正解者のユーザー名と回答を取得*/
  lastRow = daily_process.connect_DB('FiveDaysLog').getLastRow();
  range = daily_process.connect_DB('FiveDaysLog').getRange(lastRow, 4, 1, 1);   // (開始行, 開始列, 行数, 列数)
  const right_user = range.getValues();   // [['Tanaka,Naruse']]

  Logger.log('既存の正解者：' + right_user);

  const cellValue = right_user[0][0];   //二次元配列から文字列を取り出す
  let right_user_array = cellValue ? cellValue.split(',') : [];  // 文字列を配列に変換（セルが空 '' の場合も考慮）＊もしcellValueに値があるなら（Trueなら）、cellvalueの値をカンマで区切る

  
 
  /*答え合わせ*/
  let newCellValue;
  if(right_answer == user_data[0][1]){
    if(right_user_array.length <= 10){   //反映する正解者をタイム順で上位10名に固定
      right_user_array.push(user_data[0][0])
      newCellValue = right_user_array.join(',');   //配列の各要素をカンマ（,）で連結し、一つの文字列に変換する：['Tanaka', 'Naruse', 'Akasaki'] -> "Tanaka,Naruse,Akasaki"
    }
  }

  //Logger.log('新規正解者：' + right_user_array[-1]);
  Logger.log('正解者：' + newCellValue);

  /*FiveDaysLogに１次配列として追加*/
  lastRow = daily_process.connect_DB('FiveDaysLog').getLastRow();
  range = daily_process.connect_DB('FiveDaysLog').getRange(lastRow, 4, 1, 1);   // (開始行, 開始列, 行数, 列数) 20時の処理の後に実行されるため、lastRowで問題ない
  range.setValues([[newCellValue]]);

}


function delete_TodayAnswer(){
  const sheet = daily_process.connect_DB('TodayAnswer');
  const lastRow = sheet.getLastRow();
  const startRow = 2;  // 削除を開始する行
  const numRowsToDelete = lastRow - 1; // 2行目から最終行までの行数
  sheet.deleteRows(startRow, numRowsToDelete);

}


function delete_TodaysQuiz(){
  const delete_sheet = daily_process.connect_DB('TodaysQuiz');
  delete_sheet.deleteRow(2);  
}






