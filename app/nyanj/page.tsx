import dynamic from "next/dynamic";

const NyanJClient = dynamic(() => import("@/components/NyanJClient"), {
  ssr: false,
});

export default function NyanJPage() {
  return <NyanJClient />;
}
