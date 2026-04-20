import { Moon, Sun, Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "./ThemeProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Escolher tema"
          className="rounded-full w-9 h-9"
        >
          {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
          {theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem]" />}
          {(theme === "aviva" || theme === "aviva-dark") && <Palette className="h-[1.2rem] w-[1.2rem] text-primary" />}
          {theme === "system" && <Sun className="h-[1.2rem] w-[1.2rem] opacity-50" />}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Claro</span>
          </div>
          {theme === "light" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Escuro</span>
          </div>
          {theme === "dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("aviva")} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-600" />
            <span>Aviva</span>
          </div>
          {theme === "aviva" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("aviva-dark")} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-400" />
            <span>Aviva Dark</span>
          </div>
          {theme === "aviva-dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="flex justify-between items-center border-t mt-1 pt-1">
          <span>Sistema</span>
          {theme === "system" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
