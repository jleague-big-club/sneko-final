import dynamic from "next/dynamic";

const ThreadClient = dynamic(() => import("@/components/ThreadClient"), {
  ssr: false,
});

export default function NyanJThreadPage({ params }: { params: { id: string } }) {
  return <ThreadClient threadId={params.id} activeTab="nyanj" />;
}
