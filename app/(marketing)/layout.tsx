import { SiteHeader } from "@/components/layout/site-header";

// Marketing pages: statically generated, little JavaScript (docs/03, route groups).
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
