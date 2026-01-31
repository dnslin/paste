import { notFound } from "next/navigation";
import { resolveShareAccess } from "../../../lib/share-access";

type SharePageProps = {
  params: {
    token: string;
  };
};

export default function SharePage({ params }: SharePageProps) {
  const access = resolveShareAccess(params.token);
  if (!access) {
    notFound();
  }

  return (
    <main>
      <h1>Shared Paste</h1>
      <p>Share view is not available yet.</p>
    </main>
  );
}
