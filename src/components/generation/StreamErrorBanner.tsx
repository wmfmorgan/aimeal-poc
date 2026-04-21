import { GENERATION_COPY } from "@/lib/generation/types";

type StreamErrorBannerProps = {
  message: string | null;
  onRetry: () => void;
};

export function StreamErrorBanner({ message, onRetry }: StreamErrorBannerProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 md:flex-row md:items-center md:justify-between"
      role="alert"
    >
      <p className="text-sm leading-6 text-[#803b26]">
        {message ?? GENERATION_COPY.streamErrorBanner}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] shrink-0 rounded-lg bg-[#803b26] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {GENERATION_COPY.streamErrorRetry}
      </button>
    </div>
  );
}
