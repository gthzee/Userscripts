// ==UserScript==
// @name         Universal Modern JS Polyfills 🧩
// @namespace    https://github.com/gthzee/
// @version      1.6
// @description  Per-domain toggleable polyfills for modern JavaScript features
// @author       gthzee
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==
(function() {
    'use strict';

    // ==== Constants ====
    const CURRENT_HOSTNAME = window.location.hostname;
    const STORAGE_KEY = `polyfillsEnabled_${CURRENT_HOSTNAME}`;
    const POLYFILLS_ENABLED = GM_getValue(STORAGE_KEY, false);

    // ==== Polyfill Application ====
    const applyPolyfills = () => {
        // Promise.withResolvers (ES2023)
        if (!Promise.withResolvers) {
            Promise.withResolvers = function() {
                let resolve, reject;
                const promise = new Promise((res, rej) => {
                    resolve = res;
                    reject = rej;
                });
                return { promise, resolve, reject };
            };
        }

        // Promise.allSettled (ES2020)
        if (!Promise.allSettled) {
            Promise.allSettled = function(promises) {
                return Promise.all(promises.map(p => Promise.resolve(p)
                    .then(value => ({ status: 'fulfilled', value }))
                    .catch(reason => ({ status: 'rejected', reason }))
                ));
            };
        }

        // Promise.any (ES2021)
        if (!Promise.any) {
            Promise.any = function(promises) {
                return new Promise((resolve, reject) => {
                    const errors = [];
                    let rejectedCount = 0;

                    if (promises.length === 0) {
                        reject(new AggregateError([], 'All promises were rejected'));
                        return;
                    }

                    promises.forEach((promise, index) => {
                        Promise.resolve(promise)
                            .then(resolve)
                            .catch(error => {
                                errors[index] = error;
                                rejectedCount++;
                                if (rejectedCount === promises.length) {
                                    reject(new AggregateError(errors, 'All promises were rejected'));
                                }
                            });
                    });
                });
            };
        }

        // Array.prototype.at (ES2022)
        if (!Array.prototype.at) {
            Array.prototype.at = function(index) {
                index = Math.trunc(index) || 0;
                if (index < 0) index += this.length;
                return index < 0 || index >= this.length ? undefined : this[index];
            };
        }

        // Array.prototype.flatMap (ES2019)
        if (!Array.prototype.flatMap) {
            Array.prototype.flatMap = function(callback, thisArg) {
                return this.map(callback, thisArg).flat();
            };
        }

        // Array.prototype.flat (ES2019)
        if (!Array.prototype.flat) {
            Array.prototype.flat = function(depth) {
                depth = depth === undefined ? 1 : Math.floor(depth);
                if (depth <= 0) return this.slice();
                return this.reduce((acc, val) =>
                    Array.isArray(val) ? acc.concat(val.flat(depth - 1)) : acc.concat(val), []);
            };
        }

        // Array.prototype.findLast (ES2023)
        if (!Array.prototype.findLast) {
            Array.prototype.findLast = function(predicate, thisArg) {
                for (let i = this.length - 1; i >= 0; i--) {
                    if (predicate.call(thisArg, this[i], i, this)) {
                        return this[i];
                    }
                }
                return undefined;
            };
        }

        // Array.prototype.toReversed (ES2023)
        if (!Array.prototype.toReversed) {
            Array.prototype.toReversed = function() {
                return this.slice().reverse();
            };
        }

        // Array.prototype.toSorted (ES2023)
        if (!Array.prototype.toSorted) {
            Array.prototype.toSorted = function(compareFn) {
                return this.slice().sort(compareFn);
            };
        }

        // Array.prototype.toSpliced (ES2023)
        if (!Array.prototype.toSpliced) {
            Array.prototype.toSpliced = function(start, deleteCount, ...items) {
                const copy = this.slice();
                copy.splice(start, deleteCount, ...items);
                return copy;
            };
        }

        // String.prototype.replaceAll (ES2021)
        if (!String.prototype.replaceAll) {
            String.prototype.replaceAll = function(search, replacement) {
                const target = this;
                return target.replace(new RegExp(search, 'g'), replacement);
            };
        }

        // String.prototype.at (ES2022)
        if (!String.prototype.at) {
            String.prototype.at = function(index) {
                index = Math.trunc(index) || 0;
                if (index < 0) index += this.length;
                return index < 0 || index >= this.length ? '' : this.charAt(index);
            };
        }

        // Object.hasOwn (ES2022)
        if (!Object.hasOwn) {
            Object.hasOwn = Object.call.bind(Object.prototype.hasOwnProperty);
        }

        // Object.fromEntries (ES2019)
        if (!Object.fromEntries) {
            Object.fromEntries = function(iterable) {
                const obj = {};
                for (const pair of iterable) {
                    if (Object(pair) !== pair) {
                        throw new TypeError('iterable for fromEntries should yield objects');
                    }
                    const { 0: key, 1: val } = pair;
                    Object.defineProperty(obj, key, {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: val
                    });
                }
                return obj;
            };
        }

        // structuredClone (ES2021)
        if (typeof structuredClone !== 'function') {
            globalThis.structuredClone = (value, options) => {
                if (value === null || typeof value !== 'object') {
                    return value;
                }
                if (value instanceof Date) {
                    return new Date(value);
                }
                if (value instanceof RegExp) {
                    return new RegExp(value);
                }
                if (value instanceof Array) {
                    return value.map(item => structuredClone(item));
                }
                return Object.fromEntries(
                    Object.entries(value).map(([key, val]) => [key, structuredClone(val)])
                );
            };
        }

        // globalThis (ES2020)
        if (typeof globalThis === 'undefined') {
            if (typeof window !== 'undefined') {
                globalThis = window;
            } else if (typeof global !== 'undefined') {
                globalThis = global;
            } else if (typeof self !== 'undefined') {
                globalThis = self;
            }
        }

        // queueMicrotask (ES2020)
        if (typeof queueMicrotask !== 'function') {
            globalThis.queueMicrotask = function(callback) {
                if (typeof Promise !== 'undefined' && typeof Promise.resolve === 'function') {
                    Promise.resolve().then(callback);
                } else if (typeof MutationObserver !== 'undefined') {
                    const observer = new MutationObserver(callback);
                    const node = document.createTextNode('');
                    observer.observe(node, { characterData: true });
                    node.data = '1';
                } else {
                    setTimeout(callback, 0);
                }
            };
        }
    };

    // ==== Toggle Function ====
    const togglePolyfillStatus = () => {
        const newState = !POLYFILLS_ENABLED;
        GM_setValue(STORAGE_KEY, newState);
        location.reload();
    };

    // ==== Menu Command ====
    const registerMenuCommand = () => {
        GM_registerMenuCommand(
            `Polyfill Enable: ${POLYFILLS_ENABLED ? 'ON' : 'OFF'}`,
            togglePolyfillStatus
        );
    };

    // ==== Initialization ====
    const initializePolyfills = () => {
        if (POLYFILLS_ENABLED) {
            applyPolyfills();
        }
        registerMenuCommand();
    };

    // ==== Start ====
    initializePolyfills();
})();
