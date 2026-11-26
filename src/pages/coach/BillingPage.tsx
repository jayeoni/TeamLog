import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import {
  Check,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

// 토스페이먼츠 공식 테스트 클라이언트 키
const TOSS_CLIENT_KEY =
  import.meta.env.VITE_TOSS_CLIENT_KEY ||
  "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

interface TeamData {
  name?: string;
  plan?: "free" | "pro";
  currentPeriodEnd?: string;
}

export default function BillingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      return;
    }

    const fetchTeam = async () => {
      try {
        const teamDoc = await getDoc(doc(db, "teams", user.teamId!));
        if (teamDoc.exists()) {
          setTeam(teamDoc.data() as TeamData);
        }
      } catch (err) {
        console.error("팀 정보 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [user]);

  const handleSubscribe = async () => {
    if (!user || !user.teamId) {
      alert("팀 정보를 찾을 수 없습니다.");
      return;
    }

    setProcessing(true);
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const customerKey = `team_${user.teamId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/coach/billing/success?teamId=${user.teamId}`,
        failUrl: `${window.location.origin}/coach/billing/fail`,
        customerEmail: user.email || undefined,
        customerName: user.name || "TeamLog Coach",
      });
    } catch (error: any) {
      if (error?.code !== "USER_CANCEL") {
        alert(error?.message || "결제창을 띄우는 중 오류가 발생했습니다.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const isPro = team?.plan === "pro";
  const isExpiringSoon = team?.currentPeriodEnd
    ? new Date(team.currentPeriodEnd).getTime() - Date.now() < 7 * 86400000
    : false;

  if (loading) {
    return <div className="card h-96 animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost !p-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <span className="kicker">
            $ billing.manage --team={team?.name || "MyTeam"}
          </span>
          <h2 className="font-mono text-xl font-bold text-[var(--color-pulse-ink)]">
            팀 구독 & 플랜 관리
          </h2>
        </div>
      </div>

      {/* Current Subscription Status */}
      <div className="card p-5 border hairline">
        <div className="flex items-center justify-between mb-3">
          <span className="label !mb-0">subscription.status</span>
          <span
            className={`font-mono text-xs px-2.5 py-1 rounded-[3px] font-semibold ${
              isPro
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
            }`}
          >
            {isPro ? "PRO PLAN ACTIVE" : "FREE / TRIAL"}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-xs text-[var(--color-pulse-sub)]">
              소속 팀
            </span>
            <span className="font-mono text-sm text-[var(--color-pulse-ink)] font-medium">
              {team?.name || "등록된 팀 없음"}
            </span>
          </div>
          {team?.currentPeriodEnd && (
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-xs text-[var(--color-pulse-sub)]">
                플랜 만료일
              </span>
              <span
                className={`font-mono text-sm ${
                  isExpiringSoon
                    ? "text-[var(--color-pulse-warn)] font-semibold"
                    : "text-[var(--color-pulse-ink)]"
                }`}
              >
                {new Date(team.currentPeriodEnd).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {isExpiringSoon && " (만료 예정)"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Plan Card */}
      <div className="card p-6 border-2 border-[var(--color-pulse-accent)] bg-[var(--color-pulse-hover)]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[var(--color-pulse-accent)] text-zinc-950 font-mono text-[10px] font-bold px-3 py-1 rounded-bl">
          PARTNER SPECIAL
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-[var(--color-pulse-accent)]" />
          <h3 className="font-mono text-lg font-bold text-[var(--color-pulse-ink)]">
            TeamLog Pro 팀 플랜
          </h3>
        </div>

        <p className="font-mono text-xs text-[var(--color-pulse-sub)] mb-5">
          // 종이 일지와 카톡 취합에서 벗어나, 데이터로 팀을 성장시키는 코치의
          필수 도구
        </p>

        <div className="mb-6 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-[var(--color-pulse-ink)]">
            ₩19,000
          </span>
          <span className="font-mono text-xs text-[var(--color-pulse-sub)]">
            / 팀당 월 (선수 인원 무제한)
          </span>
        </div>

        <div className="space-y-3 mb-6 font-mono text-xs text-[var(--color-pulse-ink)]">
          <div className="flex items-center gap-2.5">
            <Check
              size={14}
              className="text-[var(--color-pulse-accent)] flex-shrink-0"
            />
            <span>
              선수 등록 인원 <strong>무제한</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check
              size={14}
              className="text-[var(--color-pulse-accent)] flex-shrink-0"
            />
            <span>전체 선수 일지 & 부상/통증 이력 보관</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check
              size={14}
              className="text-[var(--color-pulse-accent)] flex-shrink-0"
            />
            <span>날짜별 · 선수별 코치 원클릭 피드백</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check
              size={14}
              className="text-[var(--color-pulse-accent)] flex-shrink-0"
            />
            <span>월간/주간 팀 기록률 및 컨디션 추세 통계</span>
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={processing}
          className="w-full btn-primary !py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
        >
          <CreditCard size={16} />
          {processing
            ? "결제창 여는 중..."
            : isPro
              ? "결제 카드 변경하기"
              : "월 19,000원으로 시작하기"}
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] font-mono text-[var(--color-pulse-sub)]">
          <ShieldCheck size={13} />
          <span>토스페이먼츠의 100% 안전한 보안 암호화 결제가 적용됩니다.</span>
        </div>
      </div>
    </div>
  );
}
