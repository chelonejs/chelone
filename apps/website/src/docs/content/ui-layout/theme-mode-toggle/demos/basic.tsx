import {
  type Theme,
  ThemeModeToggle,
  ThemeProviderContext,
} from "@chelone/react";
import { useState } from "react";

/** `<ThemeModeToggle>` is a sun/moon button whose menu moves a check mark between light, dark and system. */
export default function ThemeModeToggleDemo() {
  const [theme, setTheme] = useState<Theme>("system");
  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      <ThemeModeToggle />
    </ThemeProviderContext.Provider>
  );
}
