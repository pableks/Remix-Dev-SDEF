import * as React from "react"
import {
  MapIcon,
  LayersIcon,
  NavigationIcon,
  SatelliteIcon,
  MountainIcon,
  CompassIcon,
  BookmarkIcon,
  MapPinIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  HelpCircleIcon,
} from "lucide-react"

import { NavDocuments } from "~/components/nav-documents"
import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
import { ModeToggle } from "~/components/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

const data = {
  user: {
    name: "Explorer",
    email: "explorer@geoapp.com",
    avatar: "/avatars/explorer.jpg",
  },
  navMain: [
    {
      title: "Map View",
      url: "#",
      icon: MapIcon,
    },
    {
      title: "Layers",
      url: "#",
      icon: LayersIcon,
    },
    {
      title: "Navigation",
      url: "#",
      icon: NavigationIcon,
    },
    {
      title: "Satellite",
      url: "#",
      icon: SatelliteIcon,
    },
    {
      title: "Terrain",
      url: "#",
      icon: MountainIcon,
    },
  ],
  navClouds: [
    {
      title: "Bookmarks",
      icon: BookmarkIcon,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Saved Locations",
          url: "#",
        },
        {
          title: "Recent Places",
          url: "#",
        },
      ],
    },
    {
      title: "Routes",
      icon: RouteIcon,
      url: "#",
      items: [
        {
          title: "Planned Routes",
          url: "#",
        },
        {
          title: "Route History",
          url: "#",
        },
      ],
    },
    {
      title: "Markers",
      icon: MapPinIcon,
      url: "#",
      items: [
        {
          title: "Custom Markers",
          url: "#",
        },
        {
          title: "Points of Interest",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Map Data",
      url: "#",
      icon: LayersIcon,
    },
    {
      name: "Coordinates",
      url: "#",
      icon: CompassIcon,
    },
    {
      name: "Export Map",
      url: "#",
      icon: MapIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <CompassIcon className="h-5 w-5" />
                <span className="text-base font-semibold">GeoApp</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex justify-center pt-2">
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
