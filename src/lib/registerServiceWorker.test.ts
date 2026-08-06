import { describe, expect, mock, test } from "bun:test";
import {
  registerServiceWorker,
  shouldRegisterServiceWorker,
} from "./registerServiceWorker";

describe("shouldRegisterServiceWorker", () => {
  test("HMR nélkül és SW támogatással igen", () => {
    expect(
      shouldRegisterServiceWorker({ hasHot: false, hasServiceWorker: true }),
    ).toBe(true);
  });

  test("HMR mellett nem", () => {
    expect(
      shouldRegisterServiceWorker({ hasHot: true, hasServiceWorker: true }),
    ).toBe(false);
  });

  test("SW támogatás nélkül nem", () => {
    expect(
      shouldRegisterServiceWorker({ hasHot: false, hasServiceWorker: false }),
    ).toBe(false);
  });
});

describe("registerServiceWorker", () => {
  test("regisztrál load után ha a feltételek teljesülnek", () => {
    const register = mock(() => Promise.resolve({} as ServiceWorkerRegistration));
    const listeners = new Map<string, EventListener>();

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        serviceWorker: { register },
      },
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: (type: string, listener: EventListener) => {
          listeners.set(type, listener);
        },
      },
    });

    // Teszt runnerben nincs import.meta.hot → shouldRegister true
    registerServiceWorker();
    expect(listeners.has("load")).toBe(true);
    listeners.get("load")?.(new Event("load"));
    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});
