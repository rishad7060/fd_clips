import { ClipBuilder } from "@/components/home/ClipBuilder";

/**
 * Direct "new clips" route. Same builder as the home hero - the config reveals
 * once a source is added. (Kept so existing links to /new still work.) Accepts a
 * `?url=` param so the landing page's "Drop a video link" bar can prefill it.
 */
export default function NewClipsPage({
  searchParams,
}: {
  searchParams?: { url?: string };
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-center text-2xl font-bold text-white">Create clips</h1>
      <ClipBuilder initialUrl={searchParams?.url ?? ""} />
    </div>
  );
}
