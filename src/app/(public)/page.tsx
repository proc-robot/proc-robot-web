import { Hero } from "@/components/public/home/Hero";
import { JsonLd } from "@/components/shared/JsonLd";
import { webPageGraph } from "@/lib/schema";
import { staticPageMetadata, staticPageSeo } from "@/lib/seo/static-page";

export const metadata = staticPageMetadata("home");

export default function HomePage() {
  const { name, description } = staticPageSeo("home");

  return (
    <>
      <JsonLd data={webPageGraph({ path: "/", name, description })} />
      <Hero />
    </>
  );
}
