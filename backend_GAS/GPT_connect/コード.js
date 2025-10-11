/*GPT接続*/
function connect_GPT(question_str, question_array){
  Logger.log(question_str + question_array);

  /*APIキーの取得*/
  const properties = PropertiesService.getScriptProperties();
  const API_Key = properties.getProperty('OpenAI_API_Key');

  if (!API_Key) return "APIキー未設定";

    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: 'gpt-4o-mini',//GPT-4o, 4o-mini, 3.5すべて知識水準が2023年10月までのもの
      messages: [{ role: 'user', content: question_str + question_array }],
      temperature: 0.7 /*0~1の変数:0に近づくと論理的（昔のチャットボットに近い）、1に近づくと想像的な応答となる。*/
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + API_Key },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() !== 200) {
        Logger.log("エラーコード: " + response.getResponseCode());
        return "GPT応答エラー: " + response.getContentText();
      }
      const json = JSON.parse(response.getContentText());
      return json.choices[0].message.content;
    } catch (error) {
      Logger.log("通信エラー: " + error);
      return "通信エラー";
    }
}