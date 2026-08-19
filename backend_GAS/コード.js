/* 20時の定期実行は daily_process プロジェクトの daily_process() に統一した。

   ここには以前 date() という複製が置かれていたが、
   delete_TodayAnswer() がコメントアウトされており TodayAnswer シートが
   クリアされないうえ、daily_process() と両方にトリガーを付けると
   二重実行になるため削除した。

   トリガーは daily_process プロジェクト側にのみ設定すること。 */
