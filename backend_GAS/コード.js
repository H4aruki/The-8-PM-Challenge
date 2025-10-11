/*20時に定期実行*/
function date(){
  //DB_process.delete_TodayAnswer();
  daily_process.ss_add_quiz();
  DB_process.delete_TodaysQuiz();
}

