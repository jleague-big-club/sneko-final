import dynamic from "next/dynamic";

const BbsClient = dynamic(() => import("@/components/BbsClient"), {
  ssr: false,
});

export default function BbsPage() {
  return <BbsClient />;
}
