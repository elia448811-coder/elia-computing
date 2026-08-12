import type { Service } from "@/data/services";

const iconPaths: Record<Service["icon"], string> = {
  support:
    "M12 3a7 7 0 0 0-7 7v2.5a2.5 2.5 0 0 0 1.2 2.1l1.1.7V18a3 3 0 0 0 3 3h1v-2h-1a1 1 0 0 1-1-1v-2.2l-1.5-.9A.5.5 0 0 1 7 14.5V10a5 5 0 0 1 10 0v4.5a.5.5 0 0 1-.2.4l-1.5.9V18a1 1 0 0 1-1 1h-1v2h1a3 3 0 0 0 3-3v-2.7l1.1-.7A2.5 2.5 0 0 0 19 12.5V10a7 7 0 0 0-7-7Z",
  network:
    "M12 3a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v2h1a2 2 0 1 1 0 4h-1v2a2 2 0 0 1-2 2h-3v1a2 2 0 1 1-4 0v-1H7a2 2 0 0 1-2-2v-2H4a2 2 0 1 1 0-4h1V8a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2Zm0 4H7v8h10V7h-5Zm-1 3h2v2h-2v-2Z",
  security:
    "M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Zm0 2.2 6 2.2v4.6c0 3.8-2.5 6.7-6 7.9-3.5-1.2-6-4.1-6-7.9V6.4l6-2.2Zm-1 4.3v4.5l3.5 2.1.9-1.5-2.4-1.4V8.5H11Z",
  cloud:
    "M12.5 5a5.5 5.5 0 0 1 5.2 3.8A4.5 4.5 0 0 1 18 17.5H7.5A4.5 4.5 0 0 1 7 8.6 5.5 5.5 0 0 1 12.5 5Zm0 2a3.5 3.5 0 0 0-3.4 2.8l-.1.6-.6.1A2.5 2.5 0 0 0 7.5 15.5H18a2.5 2.5 0 0 0 .3-5l-.7-.1-.2-.6A3.5 3.5 0 0 0 12.5 7Z",
  web: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm2 0v2h12V6H6Zm0 4v8h12v-8H6Zm2 2h2v2H8v-2Zm4 0h4v2h-4v-2Z",
  code: "M9.4 7.4 5.8 12l3.6 4.6-1.6 1.2L3.4 12l4.4-5.8 1.6 1.2Zm5.2 0 1.6-1.2L20.6 12l-4.4 5.8-1.6-1.2L18.2 12l-3.6-4.6ZM13.1 5l-2.2 14h-2l2.2-14h2Z",
  consult:
    "M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4.2L8 20.5V16H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v9h2.5v2.2L12.2 14H17V5H7Zm2 2h6v2H9V7Zm0 3h5v2H9v-2Z",
};

export function ServiceIcon({
  name,
  className = "h-6 w-6",
}: {
  name: Service["icon"];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
