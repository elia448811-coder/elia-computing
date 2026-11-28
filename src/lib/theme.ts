export const themeStorageKey = "elia-color-theme";

// Run before the first paint so a saved preference never flashes the other theme.
export const themeInitializationScript = `(()=>{let preference;try{preference=localStorage.getItem(${JSON.stringify(themeStorageKey)})}catch{}const dark=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=preference==='dark'||preference==='light'?preference:dark?'dark':'light'})()`;
