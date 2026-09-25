const cloudinaryRoot = "https://res.cloudinary.com/ipb43mz0/image/upload";
const markPath = "v1790311688/elia-computing/pegbflgiaggtcdj4f8lk";
const iconPath = "v1790311690/elia-computing/xrazttkygwdothvttube";
const lightMarkPath = "v1790311961/elia-computing/in8m5qszeobxrvndzwve";

function brandAssetUrl(path: string, width: number, format: "auto" | "png") {
  const transform = format === "png"
    ? `f_png,c_limit,w_${width}`
    : `f_auto,q_auto:good,c_limit,w_${width}`;
  const extension = format === "png" ? "png" : "webp";
  return `${cloudinaryRoot}/${transform}/${path}.${extension}`;
}

export function brandMarkUrl(width: number, variant: "for-dark" | "for-light" | "compact" = "for-dark") {
  return brandAssetUrl(variant === "for-light" ? lightMarkPath : markPath, width, "auto");
}

export function brandIconUrl(width: number, format: "auto" | "png" = "auto") {
  return brandAssetUrl(iconPath, width, format);
}
