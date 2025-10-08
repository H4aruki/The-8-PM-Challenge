import React, { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** HTML版の見た目（Orbitron/Noto Sans JP・左右広告・中央配置・緑のリボン・ボタン）に合わせた実装。 */
const GAS_URL = import.meta.env.VITE_GAS_URL as string;
const ACTIONS = {
  getTodayQuiz: "gettodaysQuiz",
  getPast5Days: "getRecentData",
  submitAnswer: "addAnswer",
  getCorrectUser: "getCorrectUser",
} as const;

type TodayQuizResponse = { ok: boolean; quiz?: { date: string; text: string; title?: string } };
type Past5DaysItem = { date: string; quizText: string; answers: string; correctUsers: string[]; };
type Past5DaysResponse = { ok: boolean; history: Past5DaysItem[] };
type SubmitAnswerPayload = { userName: string; answer: string; date: string };
type SubmitAnswerResponse = { ok: boolean; message: string };

async function getGAS_JSONP<T>(params: Record<string, unknown>): Promise<T> {
  if (!GAS_URL) throw new Error("VITE_GAS_URL が未設定です");

  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Math.round(100000 * Math.random())}`;
    const script = document.createElement("script");
    const urlParams = new URLSearchParams({
      callback: callbackName,
      params: JSON.stringify(params),
    });
    script.src = `${GAS_URL}?${urlParams.toString()}`;

    (window as any)[callbackName] = (data: T) => {
      resolve(data);
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };
    
    script.onerror = () => {
      reject(new Error("JSONP request failed."));
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };

    document.body.appendChild(script);
  });
}

function useTodayQuiz() {
  return useQuery<TodayQuizResponse>({
    queryKey: ["todayQuiz"],
    queryFn: () => getGAS_JSONP({ action: ACTIONS.getTodayQuiz })
  });
}

function usePast5Days() {
  return useQuery<Past5DaysResponse>({
    queryKey: ["past5Days"],
    queryFn: () => getGAS_JSONP({ action: ACTIONS.getPast5Days })
  });
}

function useCorrectUsers() {
  return useQuery<{ ok: boolean; list?: string[] }>({
    queryKey: ["correctUsers"],
    queryFn: () => getGAS_JSONP({ action: ACTIONS.getCorrectUser })
  });
}

function useSubmitAnswer() {
  const qc = useQueryClient();
  return useMutation<SubmitAnswerResponse, Error, SubmitAnswerPayload>({
    mutationFn: (p) =>
      getGAS_JSONP({
        action: ACTIONS.submitAnswer,
        payload: { userName: p.userName, answer: p.answer, date: p.date },
      }),
    onSuccess: () => {
      alert("解答を受け付けました");
      qc.invalidateQueries({ queryKey: ["todayQuiz"] });
      qc.invalidateQueries({ queryKey: ["past5Days"] });
      qc.invalidateQueries({ queryKey: ["correctUsers"] });
    },
    onError: (e) => alert(`送信に失敗しました: ${e.message}`),
  });
}

/* ====== HTML版準拠のシェル（左右広告 15% / 中央カラム） ====== */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={page}>
      <div style={adSide}>広告スペース</div>
      <main style={main}>{children}</main>
      <div style={adSide}>広告スペース</div>
    </div>
  );
}

/* ====== /quiz ====== */
function QuizPage() {
  const { data, isLoading, isError } = useTodayQuiz();
  const [userName, setUserName] = useState("");
  const [answer, setAnswer] = useState("");
  const submit = useSubmitAnswer();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const nav = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return alert("ユーザー名を入力してください");
    if (!answer.trim()) return alert("解答を入力してください");
    if (userName.length > 10) return alert("ユーザー名は10文字以内");
    if (answer.length > 20) return alert("解答は20文字以内");
    submit.mutate({ userName, answer, date: today });
  };

  const quizText =
    isLoading ? "読み込み中…" : isError ? "クイズを取得できませんでした。" : data?.quiz?.text ?? "ここに問題文が入ります";

  return (
    <Shell>
      <div style={quizTitle}>今日のAIの質問</div>
      <div style={ribbon}><span style={ribbonText}>{quizText}</span></div>

      <form onSubmit={onSubmit} style={formStyle}>
        {/* ユーザー名入力欄 */}
        <div>
          <input
            style={input}
            placeholder="ユーザー名（10文字以内）"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <div style={hint}>※11文字以上はエラーになります</div>
        </div>

        {/* 解答入力欄 */}
        <div>
          <input
            style={input}
            placeholder="解答（ひらがな・20文字以内）"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div style={hint}>※ひらがなのみ、20文字を超えるとエラー</div>
        </div>

        {/* ボタンをまとめるコンテナ */}
        <div style={buttonGroup}>
          <button type="submit" style={sendBtn} disabled={submit.isPending}>送信</button>
          <button onClick={() => nav("/history")} style={pastBtn} type="button">過去の記録</button>
        </div>
      </form>
    </Shell>
  );
}

/* ====== /history ====== */
function HistoryPage() {
  const { data, isLoading, isError, error } = usePast5Days();
  const correct = useCorrectUsers();
  const nav = useNavigate();

  return (
    <Shell>
      <div style={quizTitle}>過去の記録</div>

      {/* テーブル */}
      {isLoading ? (
        <div style={pillInfo}>過去データを読み込み中…</div>
      ) : isError ? (
        <div style={pillError}>取得に失敗しました: {(error as Error)?.message}</div>
      ) : (data?.history?.length ?? 0) === 0 ? (
        <div style={pillInfo}>過去5日分の記録はありません。</div>
      ) : (
        <div style={{ overflowX: "auto", width: "90%" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>日付</th>
                <th style={th}>コンテンツクイズ</th>
                <th style={th}>正解</th>
                <th style={th}>正解者</th>
              </tr>
            </thead>
            <tbody>
              {data!.history.map((d) => (
                <tr key={d.date}>
                  <td style={tdTop}>{d.date.split('T')[0]}</td>
                  <td style={{ ...tdTop, whiteSpace: "pre-wrap" }}>{d.quizText}</td>
                  <td style={tdTop}>
                    {d.answers ? d.answers : <span style={{ color: "#333" }}>なし</span>}
                  </td>
                  <td style={tdTop}>{d.correctUsers.length ? d.correctUsers.join(", ") : <span style={{ color: "#333" }}>なし</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 正解者パネル */}
      <div style={{ marginTop: 18 }}>
        {correct.isLoading ? (
          <div style={pillInfo}>正解者を読み込み中…</div>
        ) : correct.isError ? (
          <div style={pillError}>正解者の取得に失敗しました</div>
        ) : (correct.data?.list?.length ?? 0) === 0 ? (
          <div style={pillInfo}>直近5日間の正解者はいません。</div>
        ) : (
          <div style={chipWrap}>
            {(correct.data!.list as string[]).map((name, i) => (<span key={i} style={chip}>{name}</span>))}
          </div>
        )}
      </div>

      <button onClick={() => nav("/quiz")} style={{ ...pastBtn, marginTop: "auto" }}>クイズへ戻る</button>
    </Shell>
  );
}

/* ====== ルーティング ====== */
const queryClient = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<QuizPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/* ====== Styles（HTML版の値を反映） ====== */
const page: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  background: "#fff",
  fontFamily: "sans-serif",
};
const adSide: React.CSSProperties = {
  width: "15%",
  background: "#f0f0f0",
  textAlign: "center",
  padding: 20,
  boxSizing: "border-box",
};
const main: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: 40,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  boxSizing: "border-box",
};

const quizTitle: React.CSSProperties = {
  fontSize: "1.8em",
  fontWeight: "bold",
  color: "#000",
  marginBottom: 15,
  fontFamily: "'Orbitron', sans-serif",
};

const ribbon: React.CSSProperties = {
  display: "inline-block",
  width: "90%",
  background: "#90EE90",
  color: "#fff",
  padding: "30px 50px",
  border: "3px solid #228B22",
  borderRadius: 20,
  marginBottom: 16,
  minHeight: "3em",
  boxSizing: "border-box",
  fontFamily: "'Noto Sans JP', sans-serif",
};
const ribbonText: React.CSSProperties = {
  fontSize: "2em",
  fontWeight: "bold",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "100%",
  maxWidth: 340,
  marginTop: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  fontSize: "1em",
  border: "2px solid #90EE90",
  borderRadius: 8,
};
const hint: React.CSSProperties = { fontSize: "0.85em", color: "#333", marginTop: 6, textAlign: "left" };

const buttonGroup: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
  transform: "translateX(-40px)",
  alignItems: "center",
};

const sendBtn: React.CSSProperties = {
  padding: "10px 15px",
  fontSize: "1em",
  background: "#228B22",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const pastBtn: React.CSSProperties = {
  padding: "10px 15px",
  fontSize: "1em",
  background: "#90EE90",
  border: "2px solid #228B22",
  borderRadius: 8,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const pillBase: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 8,
  marginTop: 8,
};
const pillInfo: React.CSSProperties = { ...pillBase, color: "#075985", background: "#e8f5fe", border: "1px solid #a5d6f9" };
const pillError: React.CSSProperties = { ...pillBase, color: "#b71c1c", background: "#ffebee", border: "1px solid #ef9a9a" };

const table: React.CSSProperties = { minWidth: 800, width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#fff", borderRadius: 12, overflow: "hidden" };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "2px solid #e5e7eb", background: "#f9fafb" };
const tdTop: React.CSSProperties = { verticalAlign: "top", padding: 10, borderBottom: "1px solid #e5e7eb" };

const chipWrap: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" };
const chip: React.CSSProperties = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, padding: "6px 12px" };