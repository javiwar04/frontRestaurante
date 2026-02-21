"use client"

import * as React from "react"

// Lightweight shim for the old vaul-based drawer. This avoids a hard dependency on 'vaul'.
// Components are no-ops that simply render their children. Kept for compatibility if imported.

function passthrough<T extends React.ElementType = "div">(Tag: T, slot?: string) {
  return ({ children, ...props }: any) => (
    <Tag data-slot={slot} {...(props as any)}>
      {children}
    </Tag>
  )
}

const Drawer = passthrough("div", "drawer")
const DrawerTrigger = passthrough("button", "drawer-trigger")
const DrawerPortal = passthrough(React.Fragment as any, "drawer-portal") as any
const DrawerClose = passthrough("button", "drawer-close")
const DrawerOverlay = passthrough("div", "drawer-overlay")
const DrawerContent = passthrough("div", "drawer-content")
const DrawerHeader = passthrough("div", "drawer-header")
const DrawerFooter = passthrough("div", "drawer-footer")
const DrawerTitle = passthrough("div", "drawer-title")
const DrawerDescription = passthrough("div", "drawer-description")

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
