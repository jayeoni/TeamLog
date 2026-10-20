import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const teamId = searchParams.get("teamId");

    if (!authKey || !customerKey || !teamId) {
      setStatus("error");
      setErrorMessage("결제 인증 정보가 누락되었습니다.");
      return;
    }

    const processBilling = async () => {
      try {
        // Vercel Serverless Function 또는 자체 API 엔드포인트 호출
        const res = await fetch("/api/issueBillingKey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey, teamId }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // 결제 성공 시 클라이언트 측에서 Firestore teams 컬렉션에 Pro 상태 반영
          await updateDoc(doc(db, "teams", teamId), {
            plan: "pro",
            billingKey: data.billingKey,
            currentPeriodEnd: data.currentPeriodEnd,
            planStatus: "active",
          });

          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(
            data.message || "빌링키 발급 및 결제 승인에 실패했습니다.",
          );
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "서버 통신 중 오류가 발생했습니다.");
      }
    };

    processBilling();
  }, [searchParams]);

  return (
    <div className="max-w-md mx-auto card p-8 text-center my-12 border hairline">
      {status === "loading" && (
        <div className="space-y-4">
          <Loader2
            size={36}
            className="animate-spin mx-auto text-[var(--color-pulse-accent)]"
          />
          <h3 className="font-mono text-base text-[var(--color-pulse-ink)] font-semibold">
            정기 결제 승인 처리 중...
          </h3>
          <p className="font-mono text-xs text-[var(--color-pulse-sub)]">
            // 카드 인증 정보를 검증하고 첫 달 구독을 활성화하고 있습니다.
            잠시만 기다려주세요.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <h3 className="font-mono text-lg text-[var(--color-pulse-ink)] font-bold">
            TeamLog Pro 구독 완료!
          </h3>
          <p className="font-mono text-xs text-[var(--color-pulse-sub)] leading-relaxed">
            이제 우리 팀의 모든 선수를 무제한으로 관리하고 피드백을 전달할 수
            있습니다.
          </p>
          <button
            onClick={() => navigate("/coach")}
            className="btn-primary w-full mt-4"
          >
            $ coach_dashboard()
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <AlertCircle
            size={44}
            className="mx-auto text-[var(--color-pulse-warn)]"
          />
          <h3 className="font-mono text-lg text-[var(--color-pulse-ink)] font-bold">
            결제 승인 실패
          </h3>
          <p className="font-mono text-xs text-[var(--color-pulse-warn)] leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={() => navigate("/coach/billing")}
            className="btn-outline w-full mt-4"
          >
            다시 시도하기
          </button>
        </div>
      )}
    </div>
  );
}
