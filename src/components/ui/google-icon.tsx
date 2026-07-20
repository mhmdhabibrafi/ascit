import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GoogleIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: string;
  filled?: boolean;
};

export function GoogleIcon({ name, filled, className, ...props }: GoogleIconProps) {
  return (
    <span
      className={cn(
        "material-symbols-rounded select-none shrink-0 inline-flex items-center justify-center text-[20px] h-5 w-5",
        name === "progress_activity" && "animate-spin",
        className
      )}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 450, 'GRAD' 0, 'opsz' 24`,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
