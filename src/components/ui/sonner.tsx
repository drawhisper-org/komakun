"use client"

import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
  CircleNotch,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle weight="fill" className="size-4" />,
        info: <Info weight="fill" className="size-4" />,
        warning: <Warning weight="fill" className="size-4" />,
        error: <XCircle weight="fill" className="size-4" />,
        loading: <CircleNotch className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "koma-toast flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-[13px] font-medium shadow-lg backdrop-blur-sm",
          title: "leading-snug",
          description: "text-[11px] opacity-75 leading-snug mt-0.5",
          icon: "shrink-0",
          actionButton:
            "ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
          cancelButton:
            "ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold opacity-70 transition-colors",
          default: "koma-toast-default",
          success: "koma-toast-success",
          error: "koma-toast-error",
          warning: "koma-toast-warning",
          info: "koma-toast-info",
          loading: "koma-toast-default",
        },
      }}
      style={
        {
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
