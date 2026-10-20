import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { todayYMD } from "../../utils/dateUtils";
import StampCalendar from "../../components/shared/StampCalendar";
import type { CalendarStamp } from "../../types";

export default function AthleteCalendarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stamps, setStamps] = useState<CalendarStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() =>
    todayYMD().slice(0, 7),
  );

  useEffect(() => {
    if (!user) return;
    const fetchStamps = async () => {
      try {
        const q = query(
          collection(db, "dailyLogs"),
          where("athleteId", "==", user.id),
        );
        const snap = await getDocs(q);
        const s: CalendarStamp[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            date: data.date,
            hasLog: true,
            hasFeedback: !!data.coachFeedback,
            hasPain: !!data.painArea?.trim(),
            condition: data.condition ?? null,
          };
        });
        setStamps(s);
      } finally {
        setLoading(false);
      }
    };
    fetchStamps();
  }, [user]);

  const handleDateClick = (ymd: string) => {
    navigate(`/athlete/log/${ymd}`);
  };

  if (loading) {
    return <div className="card h-96 animate-pulse" />;
  }

  const monthStamps = stamps.filter((s) => s.date.startsWith(currentMonth));
  const written = monthStamps.filter((s) => s.hasLog).length;
  const feedback = monthStamps.filter((s) => s.hasFeedback).length;
  const pain = monthStamps.filter((s) => s.hasPain).length;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-baseline gap-3 flex-wrap kicker">
        $ calendar.view --athlete={user?.name}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "logged", v: written, tone: "text-[var(--color-pulse-ink)]" },
          {
            k: "feedback",
            v: feedback,
            tone: "text-[var(--color-pulse-cool)]",
          },
          { k: "pain", v: pain, tone: "text-[var(--color-pulse-warn)]" },
        ].map(({ k, v, tone }) => (
          <div key={k} className="card p-2 flex items-baseline justify-between">
            <span className="label !mb-0 text-[10px]">{k}</span>
            <div
              className={`font-mono text-base font-semibold tabular-nums ${tone}`}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <StampCalendar
        stamps={stamps}
        onDateClick={handleDateClick}
        selectedDate={todayYMD()}
      />
    </div>
  );
}
