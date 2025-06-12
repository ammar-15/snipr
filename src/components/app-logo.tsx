import { appConfig } from "@/config/app"
import { useTheme } from "@/contexts/ThemeContext"

export function AppLogo() {
  const { theme } = useTheme()

  const logoSrc = theme === "dark" ? "/darkmodelogo.png" : "/lightmodelogo.png"

  return (
    <div className="flex items-center gap-2">
      <img
        src={logoSrc}
        alt="App Logo"
        className="w-6 h-6 rounded-[20%]"
      />
      <span className="font-semibold text-nowrap mr-2">{appConfig.name}</span>
    </div>
  )
}
