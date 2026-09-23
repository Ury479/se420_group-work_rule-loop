"use client"

// 全站中英切换:纯前端 DOM 文本替换,不调用外部翻译接口。
// MutationObserver 会持续处理路由切换、弹窗和异步渲染产生的新界面文案。
// 按钮位置由页面决定:页面内放 <TranslateToggle /> 时用页面里的那个,
// 否则由 <TranslatorFallbackToggle /> 在内容区右上角兜底渲染一个。

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Languages } from "lucide-react"
import { lookupTranslation } from "@/lib/page-translation-dict"
import { cn } from "@/lib/utils"

const HAS_CHINESE = /[\u3400-\u9fff]/
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "aria-description", "title", "alt"] as const

type Language = "zh" | "en"
type TouchedAttr = { el: Element; attr: string; original: string }

type TranslatorContextValue = {
  lang: Language
  toggle: () => void
  setLanguage: (next: Language) => void
  /** 页面自带的内联切换按钮挂载时登记,兜底按钮据此决定是否隐藏 */
  registerInline: () => () => void
  hasInline: boolean
}

const TranslatorContext = createContext<TranslatorContextValue | null>(null)

export function useTranslator() {
  const ctx = useContext(TranslatorContext)
  if (!ctx) throw new Error("useTranslator 必须在 TranslatorProvider 内使用")
  return ctx
}

export function TranslatorProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("zh")
  const [inlineCount, setInlineCount] = useState(0)
  const touchedTexts = useRef(new Map<Text, string>())
  const touchedAttrs = useRef(new Map<string, TouchedAttr>())
  const elementIds = useRef(new WeakMap<Element, number>())
  const nextElementId = useRef(0)
  const observerRef = useRef<MutationObserver | null>(null)
  const headObserverRef = useRef<MutationObserver | null>(null)
  const originalTitleRef = useRef<string | null>(null)

  const enableRef = useRef<() => void>(() => {})

  const api = useMemo(() => {
    function getAttrKey(el: Element, attr: string) {
      let id = elementIds.current.get(el)
      if (id === undefined) {
        id = nextElementId.current++
        elementIds.current.set(el, id)
      }
      return `${id}:${attr}`
    }

    function translateTextNode(node: Text) {
      if (node.parentElement?.closest("[data-no-translate]")) return
      const raw = node.nodeValue
      if (!raw || !HAS_CHINESE.test(raw)) return

      const trimmed = raw.trim()
      if (!trimmed) return
      const translated = lookupTranslation(trimmed)
      if (!translated || translated === trimmed) return

      // React 更新已翻译的动态节点时,同步保存最新中文原文,确保切回中文不回退旧数据。
      touchedTexts.current.set(node, raw)
      node.nodeValue = raw.replace(trimmed, translated)
    }

    function translateAttribute(el: Element, attr: string) {
      if (el.closest("[data-no-translate]")) return
      const value = el.getAttribute(attr)
      if (!value || !HAS_CHINESE.test(value)) return

      const translated = lookupTranslation(value.trim())
      if (!translated || translated === value) return

      const key = getAttrKey(el, attr)
      touchedAttrs.current.set(key, { el, attr, original: value })
      el.setAttribute(attr, translated)
    }

    function translateAttrs(root: Element | Document) {
      for (const attr of TRANSLATABLE_ATTRS) {
        if (root instanceof Element && root.hasAttribute(attr)) translateAttribute(root, attr)
        root.querySelectorAll(`[${CSS.escape(attr)}]`).forEach((el) => translateAttribute(el, attr))
      }
    }

    function walkAndTranslate(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text)
        return
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        translateTextNode(current as Text)
        current = walker.nextNode()
      }

      if (root instanceof Element || root instanceof Document) translateAttrs(root)
    }

    function translateDocumentTitle() {
      if (!HAS_CHINESE.test(document.title)) return
      originalTitleRef.current = document.title
      document.title = document.title
        .split(/(\s*[·|]\s*)/)
        .map((part) => lookupTranslation(part.trim()) ?? part)
        .join("")
    }

    function enable() {
      observerRef.current?.disconnect()
      headObserverRef.current?.disconnect()
      walkAndTranslate(document.body)
      translateDocumentTitle()
      document.documentElement.lang = "en"

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
            translateTextNode(mutation.target as Text)
          } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
            if (mutation.attributeName) translateAttribute(mutation.target, mutation.attributeName)
          }
          for (const added of mutation.addedNodes) walkAndTranslate(added)
        }
      })

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: [...TRANSLATABLE_ATTRS],
        childList: true,
        subtree: true,
        characterData: true,
      })
      observerRef.current = observer

      const headObserver = new MutationObserver(() => translateDocumentTitle())
      headObserver.observe(document.head, { childList: true, subtree: true, characterData: true })
      headObserverRef.current = headObserver
    }

    function disable() {
      observerRef.current?.disconnect()
      headObserverRef.current?.disconnect()
      observerRef.current = null
      headObserverRef.current = null

      for (const [node, original] of touchedTexts.current) node.nodeValue = original
      for (const { el, attr, original } of touchedAttrs.current.values()) el.setAttribute(attr, original)

      touchedTexts.current.clear()
      touchedAttrs.current.clear()
      if (originalTitleRef.current) document.title = originalTitleRef.current
      originalTitleRef.current = null
      document.documentElement.lang = "zh-CN"
    }

    return { enable, disable }
  }, [])

  enableRef.current = api.enable

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === "en") api.enable()
      else api.disable()
      setLang(next)
      try {
        localStorage.setItem("ui-lang", next)
      } catch {}
    },
    [api],
  )

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem("ui-lang")
    } catch {}
    if (saved === "en") {
      enableRef.current()
      // localStorage 仅在客户端挂载后可读。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang("en")
    }
    return () => {
      observerRef.current?.disconnect()
      headObserverRef.current?.disconnect()
    }
  }, [])

  const registerInline = useCallback(() => {
    setInlineCount((n) => n + 1)
    return () => setInlineCount((n) => Math.max(n - 1, 0))
  }, [])

  const value = useMemo<TranslatorContextValue>(
    () => ({
      lang,
      setLanguage,
      toggle: () => setLanguage(lang === "zh" ? "en" : "zh"),
      registerInline,
      hasInline: inlineCount > 0,
    }),
    [lang, setLanguage, registerInline, inlineCount],
  )

  return <TranslatorContext.Provider value={value}>{children}</TranslatorContext.Provider>
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/**
 * 页面内联切换按钮。放在页面标题栏里,和其他状态标签排在一起。
 * compact 只显示图标,适合手机端窄标题栏。
 */
export function TranslateToggle({
  className,
  compact = false,
  register = true,
}: {
  className?: string
  compact?: boolean
  /** 兜底按钮自身必须传 false:否则登记会让兜底条件翻转,导致挂载/卸载循环 */
  register?: boolean
}) {
  const { lang, toggle, registerInline } = useTranslator()

  useEffect(() => {
    if (!register) return
    return registerInline()
  }, [register, registerInline])

  return (
    <span data-no-translate className="contents">
      <button
        type="button"
        onClick={toggle}
        aria-label={lang === "zh" ? "Switch interface to English" : "切换界面为中文"}
        aria-pressed={lang === "en"}
        title={lang === "zh" ? "English" : "中文"}
        className={cn(
          "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 font-mono text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
          FOCUS_RING,
          lang === "en"
            ? "border-primary/60 bg-primary text-primary-foreground"
            : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary",
          compact && "size-10 justify-center px-0",
          className,
        )}
      >
        <Languages className="size-4" aria-hidden="true" />
        {compact ? null : <span>{lang === "zh" ? "EN" : "中"}</span>}
      </button>
    </span>
  )
}

/**
 * 页面自身没有内联切换按钮时(既没有 HudHeader 也没有手动放置),
 * 在内容区右上角兜底渲染一个,保证每个页面都能切换语言。
 */
export function TranslatorFallbackToggle() {
  const { hasInline } = useTranslator()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // 等内联按钮完成登记再决定,避免首帧短暂出现两个按钮。
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [pathname])

  if (!mounted || hasInline) return null
  return (
    <div className="mb-4 flex justify-end">
      <TranslateToggle register={false} />
    </div>
  )
}
