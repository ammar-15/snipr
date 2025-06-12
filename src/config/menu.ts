import {
    CircleAlert,
    Gauge,
    LucideIcon
} from 'lucide-react'

type MenuItemType = {
    title: string
    url: string
    external?: string
    icon?: LucideIcon
    items?: MenuItemType[]
}
type MenuType = MenuItemType[]

export const mainMenu: MenuType = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: Gauge
    },
    {
        title: 'Your Snipes',
        url: '/yoursnipes',
        icon: CircleAlert,
    },
]
