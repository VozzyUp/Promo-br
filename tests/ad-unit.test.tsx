import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdLayoutStyles } from "../components/consent/ad-layout";

vi.mock("../components/consent/ads-context", () => ({
  useAdsConfig: () => ({ client: "ca-pub-test", slot: "1234567890" }),
}));
vi.mock("../components/consent/use-consent", () => ({ useConsent: () => "all" }));

import { AdUnit } from "../components/consent/ad-unit";

describe("AdUnit", () => {
  it("uses fixed horizontal banner sizes on mobile, tablet, and desktop", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(AdLayoutStyles),
      createElement(AdUnit, { minHeight: 120, format: "horizontal" }),
    ));

    expect(html).toContain("ad-unit-horizontal");
    expect(html).toMatch(/width:\s*320px;[\s\S]*?height:\s*100px/);
    expect(html).toMatch(/@media\s*\(min-width:\s*500px\)[\s\S]*?width:\s*468px;[\s\S]*?height:\s*60px/);
    expect(html).toMatch(/@media\s*\(min-width:\s*800px\)[\s\S]*?width:\s*728px;[\s\S]*?height:\s*90px/);
    expect(html).not.toContain('data-full-width-responsive="true"');
  });

  it("keeps vertical ad units separate from horizontal banner sizing", () => {
    const html = renderToStaticMarkup(createElement(AdUnit, { minHeight: 600, format: "vertical" }));

    expect(html).toContain('data-ad-format="vertical"');
    expect(html).toContain('data-full-width-responsive="false"');
    expect(html).toContain("min-height:600px");
  });
});
