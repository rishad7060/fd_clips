import { NewClipsView } from "@/components/home/NewClipsView";

/**
 * Direct "new clips" route. Wraps the same builder as the home hero - the config
 * reveals once a source is added - in a hero + supported-platforms + how-it-works
 * frame so the pre-input state reads intentional instead of empty. Accepts a
 * `?url=` param so the landing page's "Drop a video link" bar can prefill it.
 */
export default function NewClipsPage({
  searchParams,
}: {
  searchParams?: { url?: string };
}) {
  return <NewClipsView initialUrl={searchParams?.url ?? ""} />;
}
