// components/InfoTooltip.tsx
import React, { useMemo } from "react";
import { Tooltip, Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

type InfoTooltipProps = {
  title: React.ReactNode;            
  content?: React.ReactNode;          
  placement?: "top" | "left" | "right" | "bottom" | any;
  maxWidth?: number;
  className?: string;
  ariaLabel?: string;
    children?: React.ReactNode; 
};

export default function InfoTooltip({
  title,
  content,
  placement = "top",
  maxWidth = 360,
  className,
  ariaLabel,
}: InfoTooltipProps) {
  // Touch-device heuristic
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || (navigator && (navigator.maxTouchPoints ?? 0) > 0);
  }, []);

  const icon = (
    <InfoCircleOutlined
      style={{ fontSize: 16, color: "var(--wr-muted, #6B7280)", cursor: "pointer" }}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : "More info")}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        // Let Enter / Space emulate click for Popover trigger
        if ((e.key === "Enter" || e.key === " ") && e.currentTarget instanceof HTMLElement) {
          e.currentTarget.click();
        }
      }}
    />
  );

  // If long content and touch device -> popover (click)
  if (content && isTouchDevice) {
    return (
      <Popover
        content={<div style={{ maxWidth }}>{content}</div>}
        title={title}
        trigger="click"
        placement={placement}
        overlayStyle={{ maxWidth }}
      >
        <span className={className}>{icon}</span>
      </Popover>
    );
  }

  // Desktop behavior: tooltip on hover/focus + popover on click if content provided
  return (
    <Tooltip title={title} placement={placement}>
      <span className={className} style={{ display: "inline-flex", alignItems: "center" }}>
        {content ? (
          <Popover
            content={<div style={{ maxWidth }}>{content}</div>}
            title={title}
            trigger={["click"]}
            placement={placement}
            overlayStyle={{ maxWidth }}
          >
            {icon}
          </Popover>
        ) : (
          icon
        )}
      </span>
    </Tooltip>
  );
}
