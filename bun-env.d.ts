// CSS modules / asset modules used by Bun's HTML bundler.
declare module "*.css" {
  const css: string;
  export default css;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.html" {
  const html: unknown;
  export default html;
}
