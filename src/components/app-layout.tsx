import { Outlet } from 'react-router'
import { AppHeader } from './app-header'
import { AppFooter } from './app-footer'
import { Toaster } from 'sonner'

export function AppLayout() {
    return (
        <div className="min-h-screen flex flex-col w-full ~bg-muted/50">
            <Toaster />
            <AppHeader />
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-grow flex-col">
                <div className='flex flex-grow flex-col'>
                    <Outlet />
                </div>
                <AppFooter />
            </div>
        </div>
    )
}