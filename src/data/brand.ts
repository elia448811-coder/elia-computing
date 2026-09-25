const cloudinaryRoot = "https://res.cloudinary.com/ipb43mz0/image/upload";
const markPath = "v1790311129/elia-computing/xjw8ioawqxhmuvwug3te";

export function brandMarkUrl(width: number, format: "auto" | "png" = "auto") {
  const transform = format === "png"
    ? `f_png,c_limit,w_${width}`
    : `f_auto,q_auto:good,c_limit,w_${width}`;
  const extension = format === "png" ? "png" : "webp";
  return `${cloudinaryRoot}/${transform}/${markPath}.${extension}`;
}
