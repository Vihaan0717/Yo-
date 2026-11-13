import { createFileRoute } from "@tanstack/react-router";
import { YoApp } from "@/components/yo/YoApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yo!!! — Chat & Calls, anywhere" },
      { name: "description", content: "Yo!!! is a sleek glass messenger for chats, voice and video calls." },
      { property: "og:title", content: "Yo!!! — Chat & Calls, anywhere" },
      { property: "og:description", content: "A sleek glass messenger for chats, voice and video calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: YoApp,
});
