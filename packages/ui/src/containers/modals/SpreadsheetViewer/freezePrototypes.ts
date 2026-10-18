/**
 * The shared prototypes of this realm, frozen: what a parser writes under a property name it read
 * from a file (`__proto__`, `constructor.prototype`) can no longer reach every object of the
 * thread. Called by the sheet worker (`sheetWorker.ts`) before it reads anything; never in the
 * page, whose libraries may still extend a prototype.
 */
export function freezePrototypes(): void {
  for (const proto of [Object.prototype, Array.prototype, Function.prototype, String.prototype, Number.prototype, Boolean.prototype, RegExp.prototype, Date.prototype, Map.prototype, Set.prototype, Promise.prototype]) {
    Object.freeze(proto);
  }
}
