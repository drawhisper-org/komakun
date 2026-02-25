"use client";

import { ReactNode, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useLocaleStore } from "@/stores/locale-store";

export function IntlProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    import(`../../../messages/${locale}.json`).then((mod) => {
      setMessages(mod.default);
    });
  }, [locale]);

  if (!messages) return null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
