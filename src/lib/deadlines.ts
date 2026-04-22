export interface DeadlineWarning {
  level: "passed" | "soon" | "ok";
  message: string;
  daysRemaining: number | null;
}

export function checkDeadline(dateEnd: string | null | undefined): DeadlineWarning {
  if (!dateEnd) return { level: "ok", message: "no end date set", daysRemaining: null };
  const end = new Date(dateEnd);
  if (isNaN(end.getTime())) return { level: "ok", message: "invalid end date", daysRemaining: null };
  const now = new Date();
  const days = Math.floor((end.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { level: "passed", message: `deadline passed ${-days}d ago (${dateEnd})`, daysRemaining: days };
  if (days <= 3) return { level: "soon", message: `deadline in ${days}d (${dateEnd})`, daysRemaining: days };
  return { level: "ok", message: `${days}d remaining (${dateEnd})`, daysRemaining: days };
}
