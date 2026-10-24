export const AD_LAYOUT_CSS = `
.ad-unit-horizontal-frame,
.ad-unit-horizontal {
  display: block;
  width: 320px;
  max-width: 100%;
  height: 100px;
  margin-inline: auto;
}
@media (min-width: 500px) {
  .ad-unit-horizontal-frame,
  .ad-unit-horizontal {
    width: 468px;
    max-width: 100%;
    height: 60px;
  }
}
@media (min-width: 800px) {
  .ad-unit-horizontal-frame,
  .ad-unit-horizontal {
    width: 728px;
    max-width: 100%;
    height: 90px;
  }
}
`;

export function AdLayoutStyles() {
  return <style>{AD_LAYOUT_CSS}</style>;
}
