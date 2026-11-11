"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const SAVE_ERROR = "保存失败：服务暂时不可用，请重试。填写内容已保留。";
export function reportActionError() {
  window.dispatchEvent(new Event("ruleloop:action-error"));
}

export function ActionFeedback() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener("ruleloop:action-error", show);
    return () => window.removeEventListener("ruleloop:action-error", show);
  }, []);
  if (!visible) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-destructive bg-background p-4 text-sm shadow-xl"
    >
      <p>{SAVE_ERROR}</p>
      <Button variant="outline" size="sm" onClick={() => setVisible(false)}>
        关闭
      </Button>
    </div>
  );
}
