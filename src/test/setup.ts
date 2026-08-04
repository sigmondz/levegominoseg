import { afterEach } from "bun:test";
import { Window } from "happy-dom";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

const window = new Window({ url: "http://localhost/" });
const document = window.document;

const globals = {
  window,
  document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Text: window.Text,
  DocumentFragment: window.DocumentFragment,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent,
  getComputedStyle: window.getComputedStyle.bind(window),
  URL: window.URL,
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
};

Object.assign(globalThis, globals);
globalThis.window = window as unknown as Window & typeof globalThis.window;

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

// Recharts ResponsiveContainer méretet vár — happy-dom-ban nincs layout.
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get() {
    return 400;
  },
});
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get() {
    return 800;
  },
});
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value() {
    return {
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    };
  },
});
