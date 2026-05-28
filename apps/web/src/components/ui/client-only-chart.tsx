"use client";

import { type ReactNode, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientOnlyChart({
  children,
  className = "h-full w-full",
}: {
  children: ReactNode;
  className?: string;
}) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return <div className={className}>{mounted ? children : null}</div>;
}
